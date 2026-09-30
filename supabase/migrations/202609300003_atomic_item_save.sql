-- Invoker rights retain RLS and grants. One transaction updates the item and
-- replaces ordered children, including publishing only once all metadata is ready.
create function public.save_museum_item(item jsonb, specs jsonb, gallery jsonb, expected_updated_at timestamptz)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare target uuid := (item->>'id')::uuid; current_updated_at timestamptz;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  select updated_at into current_updated_at from public.museum_items where id = target for update;
  if not found then raise exception 'Item not found' using errcode = 'P0002'; end if;
  if expected_updated_at is not null and current_updated_at <> expected_updated_at then
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
