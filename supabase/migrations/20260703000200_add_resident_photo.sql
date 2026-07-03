-- ============================================================
-- KingdomCare OS -- Resident Profile Photos
-- ============================================================
-- Adds a nullable photo_path column to residents and a private
-- Storage bucket + RLS policies for resident profile photos.
--
-- Photos are NOT public. Access mirrors the residents table's
-- own access model:
--   * any care home member can read photos for their own care home
--   * only admins can upload/replace/remove photos
--
-- Storage object path convention:
--   {care_home_id}/{resident_id}/profile.{ext}
--
-- Existing helper functions reused:
--   * public.get_my_care_home_ids()
--   * public.is_care_home_admin(uuid)
--
-- NOTE: After applying this migration, regenerate types:
--   npx supabase gen types typescript --linked > app/lib/supabase/database.types.ts
-- ============================================================

alter table public.residents
  add column if not exists photo_path text null;

comment on column public.residents.photo_path is
  'Storage object path in the private resident-photos bucket, or null if no photo has been uploaded.';

-- ------------------------------------------------------------
-- Private storage bucket
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('resident-photos', 'resident-photos', false)
on conflict (id) do update set public = false;

-- ------------------------------------------------------------
-- Storage RLS policies (storage.objects already has RLS enabled)
-- ------------------------------------------------------------

drop policy if exists "resident-photos: members can read own home" on storage.objects;
drop policy if exists "resident-photos: admins can insert own home" on storage.objects;
drop policy if exists "resident-photos: admins can update own home" on storage.objects;
drop policy if exists "resident-photos: admins can delete own home" on storage.objects;

create policy "resident-photos: members can read own home"
  on storage.objects
  for select
  using (
    bucket_id = 'resident-photos'
    and (storage.foldername(name))[1]::uuid in (select public.get_my_care_home_ids())
  );

create policy "resident-photos: admins can insert own home"
  on storage.objects
  for insert
  with check (
    bucket_id = 'resident-photos'
    and public.is_care_home_admin((storage.foldername(name))[1]::uuid)
  );

create policy "resident-photos: admins can update own home"
  on storage.objects
  for update
  using (
    bucket_id = 'resident-photos'
    and public.is_care_home_admin((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'resident-photos'
    and public.is_care_home_admin((storage.foldername(name))[1]::uuid)
  );

create policy "resident-photos: admins can delete own home"
  on storage.objects
  for delete
  using (
    bucket_id = 'resident-photos'
    and public.is_care_home_admin((storage.foldername(name))[1]::uuid)
  );
