-- =============================================================================
-- 20260103_storage_buckets.sql
--  - Supabase Storage 버킷 + RLS 정책
--  - 버킷:
--      deal-images   : 딜 대표 이미지 (public read, admin write)
--      user-uploads  : 사용자 첨부(사업자등록증 등) (owner read/write)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) 버킷 생성 (없으면)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('deal-images',  'deal-images',  true,  5242880, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']),
  ('user-uploads', 'user-uploads', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) deal-images 정책
--    - 모든 사용자(anon 포함) 읽기 허용
--    - 쓰기는 service_role(서버)만
-- -----------------------------------------------------------------------------
drop policy if exists deal_images_read on storage.objects;
create policy deal_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'deal-images');

drop policy if exists deal_images_admin_write on storage.objects;
create policy deal_images_admin_write on storage.objects
  for insert to service_role
  with check (bucket_id = 'deal-images');

drop policy if exists deal_images_admin_update on storage.objects;
create policy deal_images_admin_update on storage.objects
  for update to service_role
  using (bucket_id = 'deal-images');

drop policy if exists deal_images_admin_delete on storage.objects;
create policy deal_images_admin_delete on storage.objects
  for delete to service_role
  using (bucket_id = 'deal-images');

-- -----------------------------------------------------------------------------
-- 3) user-uploads 정책
--    - 경로 규칙:  user-uploads/{auth.uid()}/...
--    - 본인 폴더만 read/insert/update/delete
-- -----------------------------------------------------------------------------
drop policy if exists user_uploads_owner_read on storage.objects;
create policy user_uploads_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists user_uploads_owner_insert on storage.objects;
create policy user_uploads_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists user_uploads_owner_update on storage.objects;
create policy user_uploads_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists user_uploads_owner_delete on storage.objects;
create policy user_uploads_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- 확인:
--   select id, name, public from storage.buckets;
--   select policyname from pg_policies where schemaname='storage' order by policyname;
-- =============================================================================
