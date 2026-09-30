-- Schema changes must be applied through migrations, never from the browser.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  preferred_locale text not null default 'en' check (preferred_locale in ('en','fa')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  name_en text not null, name_fa text not null, sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.museum_sections (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  title_en text not null, title_fa text not null, description_en text, description_fa text,
  sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.museum_items (
  id uuid primary key default gen_random_uuid(), slug text unique not null check (length(trim(slug)) > 0),
  title_en text not null check (length(trim(title_en)) > 0), title_fa text not null check (length(trim(title_fa)) > 0),
  brand text, release_year integer, short_description_en text, short_description_fa text,
  description_en text, description_fa text,
  category_id uuid references public.categories(id), section_id uuid references public.museum_sections(id),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  featured boolean not null default false, enable_gallery boolean not null default true,
  enable_ai_curator boolean not null default true, enable_exploded_view boolean not null default false,
  thumbnail_path text, model_path text, model_original_filename text,
  model_file_size bigint check (model_file_size >= 0),
  source_platform text, source_url text, creator text, license text,
  attribution_required boolean not null default false, attribution_text text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (thumbnail_path is null or thumbnail_path like 'items/' || id::text || '/thumbnail/%'),
  check (model_path is null or model_path like 'items/' || id::text || '/%')
);
create table public.museum_item_specs (
  id uuid primary key default gen_random_uuid(), item_id uuid not null references public.museum_items(id) on delete cascade,
  label_en text not null, label_fa text not null, value text not null, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(), item_id uuid not null references public.museum_items(id) on delete cascade,
  storage_path text not null, caption_en text, caption_fa text, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (storage_path like 'items/' || item_id::text || '/gallery/%')
);
create index museum_items_section_order on public.museum_items(section_id, sort_order);
create index museum_items_category on public.museum_items(category_id);
create index museum_items_published on public.museum_items(status);
create index museum_item_specs_item on public.museum_item_specs(item_id, sort_order);
create index gallery_images_item on public.gallery_images(item_id, sort_order);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
do $$ declare tab text; begin
  foreach tab in array array['profiles','categories','museum_sections','museum_items','museum_item_specs','gallery_images'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', tab);
    execute format('alter table public.%I enable row level security', tab);
    execute format('revoke all on public.%I from anon, authenticated', tab);
  end loop;
end $$;

create function public.handle_auth_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.profiles(id,email,full_name,role,preferred_locale)
    values(new.id,new.email,left(new.raw_user_meta_data->>'full_name',200),'user',
      case when new.raw_user_meta_data->>'preferred_locale' = 'fa' then 'fa' else 'en' end);
  else
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.handle_auth_user() from public, anon, authenticated;
create trigger create_profile after insert on auth.users for each row execute function public.handle_auth_user();
create trigger sync_profile_email after update of email on auth.users for each row execute function public.handle_auth_user();
-- Safely backfill existing accounts without trusting metadata roles.
insert into public.profiles(id,email,full_name)
select id,email,left(raw_user_meta_data->>'full_name',200) from auth.users on conflict(id) do nothing;

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant select on public.profiles to authenticated;
grant update(full_name,preferred_locale) on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy profile_edit on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select,insert,update,delete on public.categories,public.museum_sections,public.museum_items,public.museum_item_specs,public.gallery_images to authenticated;
create policy categories_read on public.categories for select to authenticated using (active or (select public.is_admin()));
create policy sections_read on public.museum_sections for select to authenticated using (active or (select public.is_admin()));
create policy items_read on public.museum_items for select to authenticated using (status = 'published' or (select public.is_admin()));
create policy specs_read on public.museum_item_specs for select to authenticated using ((select public.is_admin()) or exists(select 1 from public.museum_items i where i.id = item_id and i.status = 'published'));
create policy gallery_read on public.gallery_images for select to authenticated using ((select public.is_admin()) or exists(select 1 from public.museum_items i where i.id = item_id and i.status = 'published'));
do $$ declare tab text; begin
  foreach tab in array array['categories','museum_sections','museum_items','museum_item_specs','gallery_images'] loop
    execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select public.is_admin()))', tab);
    execute format('create policy admin_update on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', tab);
    execute format('create policy admin_delete on public.%I for delete to authenticated using ((select public.is_admin()))', tab);
  end loop;
end $$;
