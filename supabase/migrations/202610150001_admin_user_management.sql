-- REVIEWED LOCAL SOURCE ONLY. Apply after the Phase 03B deployment/state checks.
-- Auth Admin HTTP calls cannot share a PostgreSQL transaction: retain durable reservations.
create table public.admin_user_operations (
  id uuid primary key, actor_id uuid not null, kind text not null check (kind in ('invite','update','delete','cancel')),
  target_id uuid, payload jsonb not null default '{}'::jsonb,
  state text not null check (state in ('pending','succeeded','failed','cancelled')),
  code text, created_at timestamptz not null default clock_timestamp(), completed_at timestamptz
);
alter table public.admin_user_operations enable row level security;
revoke all on public.admin_user_operations from public, anon, authenticated;
grant select,insert,update on public.admin_user_operations to service_role;
create unique index admin_one_pending_delete on public.admin_user_operations(kind) where kind = 'delete' and state = 'pending';
create unique index admin_one_pending_invite on public.admin_user_operations(lower(payload->>'email')) where kind = 'invite' and state = 'pending';
create index admin_operations_actor_time on public.admin_user_operations(actor_id,created_at);

create function public.core_active_admin(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=target and p.role='admin' and u.deleted_at is null and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
      and not exists(select 1 from public.admin_user_operations o where o.target_id=p.id and o.kind='delete' and o.state='pending')
  );
$$;
revoke all on function public.core_active_admin(uuid) from public,anon,authenticated;
grant execute on function public.core_active_admin(uuid) to service_role;

-- Existing policies remain in place; a pending deletion cannot keep exercising admin powers.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select public.core_active_admin((select auth.uid()));
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;

-- Protect role removal/profile cascades even through another privileged SQL entry point.
create function public.core_profile_admin_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role='admin' and (TG_OP='DELETE' or new.role is distinct from old.role) then
    if current_setting('transaction_isolation') <> 'read committed' then raise exception 'guardUnverified'; end if;
    perform pg_catalog.pg_advisory_xact_lock(74628031::bigint);
    if not exists(select 1 from public.profiles p where p.id<>old.id and public.core_active_admin(p.id)) then
      raise exception 'lastAdmin';
    end if;
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.core_profile_admin_guard() from public,anon,authenticated;
create trigger core_protect_admin before update of role or delete on public.profiles for each row execute function public.core_profile_admin_guard();

create function public.core_admin_users(actor uuid, action text, operation uuid default null, input jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  op public.admin_user_operations%rowtype; target public.profiles%rowtype; identity_id uuid;
  wanted uuid; requested_role text; locale text; name_value text; query_value text;
  current_action text := action; page_value integer; size_value integer; total_value bigint; users_value jsonb;
begin
  if current_setting('transaction_isolation') <> 'read committed' then raise exception 'guardUnverified'; end if;
  -- All commands recheck trusted current role after the serialization boundary.
  perform pg_catalog.pg_advisory_xact_lock(74628031::bigint);
  if not public.core_active_admin(actor) then raise exception 'forbidden' using errcode='42501'; end if;
  if action='authorize' then return jsonb_build_object('authorized',true); end if;
  if action='list' then
    page_value := (input->>'page')::integer; size_value := (input->>'perPage')::integer; query_value := input->>'search';
    if page_value is null or page_value<1 or page_value>100000 or size_value not in (10,25,50) or size_value is null
      or query_value is null or length(query_value)>200 or input->>'role' is null or input->>'status' is null
      or input->>'role' not in ('all','user','admin') or input->>'status' not in ('all','active','invited','unconfirmed','banned','deleting') then raise exception 'invalidInput'; end if;
    with available as (
      select p.*,u.created_at as registered_at,u.last_sign_in_at,
        case when exists(select 1 from public.admin_user_operations o where o.target_id=p.id and o.kind='delete' and o.state='pending') then 'deleting'
          when u.banned_until>now() then 'banned' when u.invited_at is not null and u.email_confirmed_at is null then 'invited'
          when u.email_confirmed_at is null then 'unconfirmed' else 'active' end as account_status
      from public.profiles p join auth.users u on p.id=u.id where u.deleted_at is null
    ), filtered as (
      select * from available p where (input->>'role'='all' or p.role=input->>'role')
        and (input->>'status'='all' or p.account_status=input->>'status')
        and strpos(lower(coalesce(p.email,'') || ' ' || coalesce(p.full_name,'') || ' ' || p.id::text),lower(query_value))>0
    ), selected as (select * from filtered order by registered_at desc,id limit size_value offset (page_value-1)*size_value)
    select (select count(*) from filtered),coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,'email',s.email,'fullName',s.full_name,'role',s.role,'preferredLocale',s.preferred_locale,
      'createdAt',s.registered_at,'updatedAt',s.updated_at,'lastSignInAt',s.last_sign_in_at,'status',s.account_status,
      'activeAdmin',public.core_active_admin(s.id)) order by s.registered_at desc,s.id),'[]'::jsonb)
      into total_value,users_value from selected s;
    return jsonb_build_object('users',users_value,'total',total_value,'page',page_value,'perPage',size_value,
      'pendingOperation',(select jsonb_build_object('operationId',o.id,'action',o.kind) from public.admin_user_operations o
        where o.actor_id=actor and o.state='pending' and o.kind in ('invite','delete') order by o.created_at,o.id limit 1));
  end if;
  if operation is null then raise exception 'invalidInput'; end if;
  select * into op from public.admin_user_operations where id=operation for update;
  if found and op.actor_id<>actor then raise exception 'forbidden' using errcode='42501'; end if;

  if action='status' then
    if op.id is null then
      -- Tombstone an unknown request before a late handler can begin it. Not-found alone is not proof of failure.
      insert into public.admin_user_operations(id,actor_id,kind,state,completed_at) values(operation,actor,'cancel','cancelled',clock_timestamp());
      return jsonb_build_object('operationId',operation,'state','cancelled');
    end if;
    if op.state<>'pending' then return jsonb_build_object('operationId',op.id,'state',op.state,'code',op.code,'userId',op.target_id); end if;
    if op.kind='delete' then current_action:='finish_delete';
    elsif op.kind='invite' then current_action:='finish_invite';
    else return jsonb_build_object('operationId',op.id,'state','pending'); end if;
  end if;

  if action in ('update','begin_invite','begin_delete') then
    if op.id is not null then
      if op.state='cancelled' then return jsonb_build_object('operationId',op.id,'state','cancelled','execute',false); end if;
      if op.kind <> (case action when 'update' then 'update' when 'begin_invite' then 'invite' else 'delete' end) or op.payload<>input then raise exception 'conflict' using errcode='40001'; end if;
      return jsonb_build_object('operationId',op.id,'state',op.state,'code',op.code,'userId',op.target_id,'execute',false);
    end if;
    if exists(select 1 from public.admin_user_operations where kind='delete' and state='pending') then raise exception 'operationBusy'; end if;
    if action='begin_invite' then
      if input->>'email' is null or length(input->>'email')>254 or input->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalidInput'; end if;
      if exists(select 1 from auth.users where lower(email)=lower(input->>'email')) then raise exception 'duplicateAccount'; end if;
      if exists(select 1 from public.admin_user_operations where kind='invite' and state='pending' and lower(payload->>'email')=lower(input->>'email')) then raise exception 'operationBusy'; end if;
      if (select count(*) from public.admin_user_operations where actor_id=actor and kind='invite' and created_at>now()-interval '1 hour')>=20 then raise exception 'operationBusy'; end if;
    else
      wanted := (input->>'id')::uuid;
      select * into target from public.profiles where id=wanted for update;
      if not found then raise exception 'conflict' using errcode='40001'; end if;
      if input->>'expectedUpdatedAt' is null or target.updated_at<>(input->>'expectedUpdatedAt')::timestamptz then raise exception 'conflict' using errcode='40001'; end if;
    end if;
    if action='begin_delete' then
      if wanted=actor then raise exception 'selfProtected'; end if;
      if lower(coalesce(target.email,''))<>lower(input->>'confirmation') or input->>'confirmation' is null then raise exception 'invalidInput'; end if;
      if target.role='admin' and not exists(select 1 from public.profiles p where p.id<>wanted and public.core_active_admin(p.id)) then raise exception 'lastAdmin'; end if;
      if exists(select 1 from storage.objects where owner_id=wanted::text) then raise exception 'assetsOwned'; end if;
      insert into public.admin_user_operations(id,actor_id,kind,target_id,payload,state) values(operation,actor,'delete',wanted,input,'pending');
      return jsonb_build_object('operationId',operation,'state','pending','userId',wanted,'execute',true);
    end if;
    requested_role:=input->>'role'; locale:=input->>'preferredLocale'; name_value:=input->>'fullName';
    if requested_role is null or requested_role not in ('user','admin') or locale is null or locale not in ('en','fa') or name_value is null or length(name_value)>200 then raise exception 'invalidInput'; end if;
    if action='begin_invite' then
      if requested_role='admin' and coalesce((input->>'rolesEnabled')::boolean,false) is not true then raise exception 'guardUnverified'; end if;
      insert into public.admin_user_operations(id,actor_id,kind,payload,state) values(operation,actor,'invite',input,'pending');
      return jsonb_build_object('operationId',operation,'state','pending','execute',true);
    end if;
    if target.role<>requested_role and coalesce((input->>'rolesEnabled')::boolean,false) is not true then raise exception 'guardUnverified'; end if;
    if wanted=actor and target.role<>requested_role then raise exception 'selfProtected'; end if;
    update public.profiles set full_name=name_value,preferred_locale=locale,role=requested_role where id=wanted;
    insert into public.admin_user_operations(id,actor_id,kind,target_id,payload,state,completed_at) values(operation,actor,'update',wanted,input,'succeeded',clock_timestamp());
    return jsonb_build_object('operationId',operation,'state','succeeded','userId',wanted);
  end if;

  if op.id is null then raise exception 'conflict' using errcode='40001'; end if;
  if op.state<>'pending' then return jsonb_build_object('operationId',op.id,'state',op.state,'code',op.code,'userId',op.target_id); end if;
  if current_action='finish_delete' and op.kind='delete' then
    if exists(select 1 from auth.users where id=op.target_id) or exists(select 1 from public.profiles where id=op.target_id) then
      return jsonb_build_object('operationId',op.id,'state','pending','userId',op.target_id);
    end if;
    update public.admin_user_operations set state='succeeded',completed_at=clock_timestamp() where id=op.id;
    return jsonb_build_object('operationId',op.id,'state','succeeded','userId',op.target_id);
  elsif current_action='finish_invite' and op.kind='invite' then
    if coalesce((input->>'writesEnabled')::boolean,false) is not true
      or (op.payload->>'role'='admin' and coalesce((input->>'rolesEnabled')::boolean,false) is not true) then
      return jsonb_build_object('operationId',op.id,'state','pending');
    end if;
    -- Metadata is a correlation marker only, never the source of authorization or role.
    select id into identity_id from auth.users where lower(email)=lower(op.payload->>'email')
      and raw_user_meta_data->>'core_invitation_id'=op.id::text and created_at>=op.created_at;
    if not found then return jsonb_build_object('operationId',op.id,'state','pending'); end if;
    if exists(select 1 from public.admin_user_operations where kind='delete' and state='pending') then return jsonb_build_object('operationId',op.id,'state','pending'); end if;
    select * into target from public.profiles where id=identity_id for update;
    if not found then return jsonb_build_object('operationId',op.id,'state','pending'); end if;
    -- Also gate an unexpected demotion if an external operator changed the new profile before reconciliation.
    if target.role is distinct from op.payload->>'role' and coalesce((input->>'rolesEnabled')::boolean,false) is not true then
      return jsonb_build_object('operationId',op.id,'state','pending');
    end if;
    update public.profiles set full_name=op.payload->>'fullName',preferred_locale=op.payload->>'preferredLocale',role=op.payload->>'role' where id=identity_id;
    if not found then return jsonb_build_object('operationId',op.id,'state','pending'); end if;
    update public.admin_user_operations set target_id=identity_id,state='succeeded',completed_at=clock_timestamp() where id=op.id;
    return jsonb_build_object('operationId',op.id,'state','succeeded','userId',identity_id);
  elsif current_action='reject' then
    if input->>'code' not in ('duplicateAccount','assetsOwned','requestFailed') or input->>'code' is null then raise exception 'invalidInput'; end if;
    if op.kind='delete' and not exists(select 1 from auth.users where id=op.target_id) then
      return public.core_admin_users(actor,'finish_delete',operation,'{}'::jsonb);
    end if;
    if op.kind='invite' and exists(select 1 from auth.users where raw_user_meta_data->>'core_invitation_id'=op.id::text) then return jsonb_build_object('operationId',op.id,'state','pending'); end if;
    update public.admin_user_operations set state='failed',code=input->>'code',completed_at=clock_timestamp() where id=op.id;
    return jsonb_build_object('operationId',op.id,'state','failed','code',input->>'code','userId',op.target_id);
  end if;
  raise exception 'invalidInput';
end;
$$;
revoke all on function public.core_admin_users(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.core_admin_users(uuid,text,uuid,jsonb) to service_role;
