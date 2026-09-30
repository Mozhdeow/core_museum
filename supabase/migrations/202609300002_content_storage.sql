insert into public.categories(slug,name_en,name_fa,sort_order) values
('cpu','CPU','پردازنده مرکزی',10),('gpu','GPU','پردازنده گرافیکی',20),
('memory','Memory','حافظه',30),('storage','Storage','ذخیره‌سازی',40),
('motherboard','Motherboard','مادربرد',50),('future','Future','آینده',60);
insert into public.museum_sections(slug,title_en,title_fa,sort_order) values
('entrance','Entrance','ورودی',0),('cpu','CPU','پردازنده مرکزی',10),
('gpu','GPU','پردازنده گرافیکی',20),('memory','Memory','حافظه',30),
('storage','Storage','ذخیره‌سازی',40),('motherboard','Motherboard','مادربرد',50),
('future','Future','آینده',60),('ending','End of the journey','پایان مسیر',70);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('museum-images','museum-images',true,10485760,array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
('museum-models','museum-models',true,104857600,array['model/gltf-binary','application/octet-stream']);
create policy museum_asset_public_read on storage.objects for select to anon,authenticated
using (bucket_id in ('museum-images','museum-models'));
-- Public buckets intentionally allow asset reads. No public write permissions.
create policy museum_asset_insert on storage.objects for insert to authenticated
with check (bucket_id in ('museum-images','museum-models') and (select public.is_admin()) and (storage.foldername(name))[1] = 'items');
create policy museum_asset_update on storage.objects for update to authenticated
using (bucket_id in ('museum-images','museum-models') and (select public.is_admin()))
with check (bucket_id in ('museum-images','museum-models') and (select public.is_admin()) and (storage.foldername(name))[1] = 'items');
create policy museum_asset_delete on storage.objects for delete to authenticated
using (bucket_id in ('museum-images','museum-models') and (select public.is_admin()));
create policy museum_asset_admin_read on storage.objects for select to authenticated
using (bucket_id in ('museum-images','museum-models') and (select public.is_admin()));
