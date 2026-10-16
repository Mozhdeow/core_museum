-- LOCAL CANDIDATE ONLY. Requires 202610150001; do not deploy before isolated verification.
-- Preserve existing profiles and registration's literal 'user' default/trigger.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','editor','admin'));

-- Client roles cannot enable their own unverified write path.
create table public.core_security_settings (
  singleton boolean primary key default true check (singleton),
  editor_writes_verified boolean not null default false
);
insert into public.core_security_settings(singleton,editor_writes_verified) values(true,false);
alter table public.core_security_settings enable row level security;
revoke all on public.core_security_settings from public,anon,authenticated;
grant select,update on public.core_security_settings to service_role;

create function public.core_current_role() returns text language sql stable security definer set search_path='' as $$
  select p.role from public.profiles p join auth.users u on p.id=u.id
  where p.id=(select auth.uid()) and u.deleted_at is null and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until<=now())
    and not exists(select 1 from public.admin_user_operations o where o.target_id=p.id and o.kind='delete' and o.state='pending');
$$;
create function public.core_editor_writes_enabled() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select editor_writes_verified from public.core_security_settings where singleton),false);
$$;
create function public.core_content_access() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('role',public.core_current_role(),'editorWritesVerified',public.core_editor_writes_enabled());
$$;
revoke all on function public.core_current_role(),public.core_editor_writes_enabled(),public.core_content_access() from public,anon;
grant execute on function public.core_current_role(),public.core_editor_writes_enabled(),public.core_content_access() to authenticated;

-- This lock order matches Phase 03B: authorization boundary, then content row.
-- Parent locks serialize child/Storage writes with publication. Do not certify with mocks.
create function public.core_can_edit_draft(target uuid) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare actor_role text; item_status text;
begin
  if current_setting('transaction_isolation')<>'read committed' then return false; end if;
  actor_role:=public.core_current_role();
  if actor_role is null or actor_role not in ('admin','editor') then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(74628031::bigint);
  actor_role:=public.core_current_role();
  if actor_role='admin' then return true; end if;
  if actor_role is distinct from 'editor' or not public.core_editor_writes_enabled() then return false; end if;
  select status into item_status from public.museum_items where id=target for update;
  return coalesce(item_status='draft',false);
end;
$$;
revoke all on function public.core_can_edit_draft(uuid) from public,anon;
grant execute on function public.core_can_edit_draft(uuid) to authenticated;

-- Validate associated references without rewriting existing asset URLs.
create function public.core_draft_asset_path(bucket text,path text,target uuid) returns boolean language sql immutable set search_path='' as $$
  select case when bucket='museum-images' then path ~ ('^items/'||target::text||'/(thumbnail|gallery)/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|avif|gif)$')
    when bucket='museum-models' then path ~ ('^items/'||target::text||'/[A-Za-z0-9_-]+\.glb$') else false end;
$$;
revoke all on function public.core_draft_asset_path(text,text,uuid) from public,anon;
grant execute on function public.core_draft_asset_path(text,text,uuid) to authenticated;

-- Direct UPDATE takes tuple locks before row triggers. Acquire the shared boundary
-- at statement start too, preventing opposite lock order against RPC/child writes.
create function public.core_content_write_boundary() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is not null and public.core_current_role() in ('editor','admin') then
    if current_setting('transaction_isolation')<>'read committed' then raise exception 'RBAC verification required' using errcode='42501'; end if;
    perform pg_catalog.pg_advisory_xact_lock(74628031::bigint);
  end if;
  return null;
end;
$$;
revoke all on function public.core_content_write_boundary() from public,anon,authenticated;
create trigger core_item_write_boundary before insert or update or delete on public.museum_items for each statement execute function public.core_content_write_boundary();
create trigger core_specs_write_boundary before insert or update or delete on public.museum_item_specs for each statement execute function public.core_content_write_boundary();
create trigger core_gallery_write_boundary before insert or update or delete on public.gallery_images for each statement execute function public.core_content_write_boundary();

create function public.core_guard_item_write() returns trigger language plpgsql security definer set search_path='' as $$
declare actor_role text;
begin
  -- Trusted platform/FK maintenance has no end-user JWT; client grants/RLS still apply.
  if (select auth.uid()) is null then if TG_OP='DELETE' then return old; else return new; end if; end if;
  if current_setting('transaction_isolation')<>'read committed' then raise exception 'RBAC verification required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(74628031::bigint);
  actor_role:=public.core_current_role();
  if actor_role='admin' then if TG_OP='DELETE' then return old; else return new; end if; end if;
  if actor_role is distinct from 'editor' or not public.core_editor_writes_enabled() or TG_OP='DELETE' then
    raise exception 'Permission denied' using errcode='42501';
  end if;
  if new.status is distinct from 'draft' then raise exception 'Editors cannot publish' using errcode='42501'; end if;
  if TG_OP='UPDATE' then
    if old.status<>'draft' or new.id<>old.id or new.created_by is distinct from old.created_by
      or new.created_at<>old.created_at or new.featured is distinct from old.featured then
      raise exception 'Editors can only edit draft content' using errcode='42501';
    end if;
  elsif new.created_by is distinct from (select auth.uid()) or new.featured then
    raise exception 'Invalid draft attribution' using errcode='42501';
  end if;
  if new.thumbnail_path is not null and not public.core_draft_asset_path('museum-images',new.thumbnail_path,new.id) then
    raise exception 'Invalid draft asset' using errcode='42501'; end if;
  if new.model_path is not null and not public.core_draft_asset_path('museum-models',new.model_path,new.id) then
    raise exception 'Invalid draft asset' using errcode='42501'; end if;
  return new;
end;
$$;
revoke all on function public.core_guard_item_write() from public,anon,authenticated;
create trigger core_item_permissions before insert or update or delete on public.museum_items for each row execute function public.core_guard_item_write();

create function public.core_guard_item_child() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if (select auth.uid()) is null then if TG_OP='DELETE' then return old; else return new; end if; end if;
  if TG_OP='DELETE' then target:=old.item_id; else target:=new.item_id; end if;
  if not public.core_can_edit_draft(target) then raise exception 'Draft write denied' using errcode='42501'; end if;
  if public.core_current_role()='editor' then
    if TG_OP='UPDATE' and (old.item_id<>new.item_id or old.id<>new.id) then raise exception 'Cannot move child records' using errcode='42501'; end if;
    if TG_OP<>'DELETE' and TG_TABLE_NAME='gallery_images' then
      if not public.core_draft_asset_path('museum-images',new.storage_path,new.item_id)
        or split_part(new.storage_path,'/',3)<>'gallery' then raise exception 'Invalid gallery asset' using errcode='42501'; end if;
    end if;
  end if;
  -- Direct child changes must invalidate an already loaded exhibit version too.
  update public.museum_items set updated_at=clock_timestamp() where id=target;
  if TG_OP='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.core_guard_item_child() from public,anon,authenticated;
create trigger core_specs_permissions before insert or update or delete on public.museum_item_specs for each row execute function public.core_guard_item_child();
create trigger core_gallery_permissions before insert or update or delete on public.gallery_images for each row execute function public.core_guard_item_child();

-- Replace named policies, keeping taxonomy mutations and item deletion admin-only.
drop policy categories_read on public.categories;
drop policy sections_read on public.museum_sections;
create policy categories_read on public.categories for select to authenticated using (public.core_current_role() is not null and (active or public.core_current_role() in ('editor','admin')));
create policy sections_read on public.museum_sections for select to authenticated using (public.core_current_role() is not null and (active or public.core_current_role() in ('editor','admin')));
drop policy items_read on public.museum_items;
create policy items_read on public.museum_items for select to authenticated using (public.core_current_role() is not null and (status='published' or public.core_current_role() in ('editor','admin')));
drop policy specs_read on public.museum_item_specs;
drop policy gallery_read on public.gallery_images;
create policy specs_read on public.museum_item_specs for select to authenticated using (exists(select 1 from public.museum_items i where i.id=item_id));
create policy gallery_read on public.gallery_images for select to authenticated using (exists(select 1 from public.museum_items i where i.id=item_id));
create policy editor_item_insert on public.museum_items for insert to authenticated with check
  (public.core_current_role()='editor' and public.core_editor_writes_enabled() and status='draft' and created_by=(select auth.uid()) and not featured);
create policy editor_item_update on public.museum_items for update to authenticated using
  (status='draft' and public.core_can_edit_draft(id)) with check (status='draft' and public.core_can_edit_draft(id));
do $$ declare tab text; begin
  foreach tab in array array['museum_item_specs','gallery_images'] loop
    execute format('create policy editor_child_insert on public.%I for insert to authenticated with check (public.core_can_edit_draft(item_id))',tab);
    execute format('create policy editor_child_update on public.%I for update to authenticated using (public.core_can_edit_draft(item_id)) with check (public.core_can_edit_draft(item_id))',tab);
    execute format('create policy editor_child_delete on public.%I for delete to authenticated using (public.core_can_edit_draft(item_id))',tab);
  end loop;
end $$;

-- Only fresh inserts for editors: no overwriting/moving/deleting a published or shared object.
create function public.core_editor_asset_insert(bucket text,path text) returns boolean language plpgsql volatile security definer set search_path='' as $$
declare target uuid;
begin
  if bucket not in ('museum-images','museum-models') or path !~ '^items/[0-9a-f-]{36}/' then return false; end if;
  begin target:=split_part(path,'/',2)::uuid; exception when invalid_text_representation then return false; end;
  if not public.core_draft_asset_path(bucket,path,target) then return false; end if;
  if bucket='museum-images' and path !~ '/(thumbnail|gallery)/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif)$' then return false; end if;
  if bucket='museum-models' and path !~ '/model-[0-9a-f-]{36}\.glb$' then return false; end if;
  return public.core_current_role()='editor' and public.core_can_edit_draft(target);
end;
$$;
revoke all on function public.core_editor_asset_insert(text,text) from public,anon;
grant execute on function public.core_editor_asset_insert(text,text) to authenticated;
create policy museum_editor_asset_insert on storage.objects for insert to authenticated with check (public.core_editor_asset_insert(bucket_id,name));
-- Existing admin-only Storage update/delete and public-read policies remain unchanged.

-- Preserve the Phase 03B operation protocol; only extend allowed roles and privileged role gates.
create or replace function public.core_admin_users(actor uuid, action text, operation uuid default null, input jsonb default '{}'::jsonb)
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
      or input->>'role' not in ('all','user','editor','admin') or input->>'status' not in ('all','active','invited','unconfirmed','banned','deleting') then raise exception 'invalidInput'; end if;
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
    if requested_role is null or requested_role not in ('user','editor','admin') or locale is null or locale not in ('en','fa') or name_value is null or length(name_value)>200 then raise exception 'invalidInput'; end if;
    if action='begin_invite' then
      if requested_role in ('editor','admin') and coalesce((input->>'rolesEnabled')::boolean,false) is not true then raise exception 'guardUnverified'; end if;
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
      or (op.payload->>'role' in ('editor','admin') and coalesce((input->>'rolesEnabled')::boolean,false) is not true) then
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

-- Retain invoker/RLS, row lock, stable ID, version check and atomic child replacement.
create or replace function public.save_museum_item(item jsonb, specs jsonb, gallery jsonb, expected_updated_at timestamptz)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare target uuid := (item->>'id')::uuid; current_updated_at timestamptz; current_status text;
begin
  perform pg_catalog.pg_advisory_xact_lock(74628031::bigint);
  if not public.is_admin() and not (coalesce(public.core_current_role(),'')='editor' and public.core_editor_writes_enabled()) then
    raise exception 'Content write denied' using errcode='42501'; end if;
  select updated_at,status into current_updated_at,current_status from public.museum_items where id = target for update;
  if not found then raise exception 'Item not found' using errcode = 'P0002'; end if;
  if public.core_current_role()='editor' and (current_status<>'draft' or item->>'status' is distinct from 'draft') then
    raise exception 'Editors cannot modify published exhibits' using errcode='42501'; end if;
  if expected_updated_at is null or current_updated_at <> expected_updated_at then
    raise exception 'Item changed; reload before saving' using errcode = '40001';
  end if;
  update public.museum_items set
    slug=item->>'slug',title_en=item->>'title_en',title_fa=item->>'title_fa',brand=item->>'brand',
    release_year=(item->>'release_year')::integer,
    short_description_en=item->>'short_description_en',short_description_fa=item->>'short_description_fa',
    description_en=item->>'description_en',description_fa=item->>'description_fa',
    category_id=(item->>'category_id')::uuid,section_id=(item->>'section_id')::uuid,
    sort_order=(item->>'sort_order')::integer,status=item->>'status',featured=(item->>'featured')::boolean,
    enable_gallery=(item->>'enable_gallery')::boolean,enable_ai_curator=(item->>'enable_ai_curator')::boolean,
    enable_exploded_view=(item->>'enable_exploded_view')::boolean,
    thumbnail_path=item->>'thumbnail_path',model_path=item->>'model_path',
    model_original_filename=item->>'model_original_filename',model_file_size=(item->>'model_file_size')::bigint,
    source_platform=item->>'source_platform',source_url=item->>'source_url',creator=item->>'creator',license=item->>'license',
    attribution_required=(item->>'attribution_required')::boolean,attribution_text=item->>'attribution_text'
  where id=target;
  delete from public.museum_item_specs where item_id=target;
  insert into public.museum_item_specs(item_id,label_en,label_fa,value,sort_order)
    select target,s->>'label_en',s->>'label_fa',s->>'value',ord::integer-1
    from jsonb_array_elements(specs) with ordinality as x(s,ord);
  delete from public.gallery_images where item_id=target;
  insert into public.gallery_images(id,item_id,storage_path,caption_en,caption_fa,sort_order)
    select (g->>'id')::uuid,target,g->>'storage_path',g->>'caption_en',g->>'caption_fa',ord::integer-1
    from jsonb_array_elements(gallery) with ordinality as x(g,ord);
  return target;
end;
$$;
revoke all on function public.save_museum_item(jsonb,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.save_museum_item(jsonb,jsonb,jsonb,timestamptz) to authenticated;
