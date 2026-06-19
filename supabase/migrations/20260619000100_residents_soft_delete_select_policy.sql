drop policy if exists "residents: admins can read deleted own home" on public.residents;

create policy "residents: admins can read deleted own home"
  on public.residents
  for select
  using (
    deleted_at is not null
    and public.is_care_home_admin(care_home_id)
  );
