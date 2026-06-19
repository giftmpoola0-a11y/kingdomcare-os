-- ============================================================
-- KingdomCare OS -- Residents Schema
-- ============================================================
-- Creates the first shared care-domain table in Supabase.
--
-- Existing helper functions reused:
--   * public.get_my_care_home_ids()
--   * public.is_care_home_admin(uuid)
--
-- Residents are readable by any care home member, but only admins
-- may create or update them. Physical deletes are intentionally not
-- allowed; deleted_at supports future soft-delete workflows.
-- ============================================================

create table if not exists public.residents (
  id                    uuid primary key default gen_random_uuid(),
  care_home_id          uuid not null references public.care_homes(id),
  legacy_local_id       text null,
  full_name             text not null,
  age                   integer null,
  care_level            text not null,
  primary_support_needs text null,
  notes                 text null,
  status                text not null default 'active',
  created_by            uuid not null references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz null,

  constraint residents_full_name_not_blank
    check (nullif(trim(full_name), '') is not null),
  constraint residents_care_level_not_blank
    check (nullif(trim(care_level), '') is not null),
  constraint residents_age_range
    check (age is null or (age >= 0 and age <= 130)),
  constraint residents_status_check
    check (status in ('active', 'archived'))
);

comment on table public.residents is
  'Residents belonging to a care home workspace. Supabase-backed foundation for resident migration.';

create index if not exists residents_care_home_id_idx
  on public.residents (care_home_id);

create index if not exists residents_active_by_care_home_idx
  on public.residents (care_home_id, full_name)
  where status = 'active' and deleted_at is null;

create unique index if not exists residents_care_home_legacy_local_id_uidx
  on public.residents (care_home_id, legacy_local_id)
  where legacy_local_id is not null;

create or replace function public.handle_residents_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.care_home_id <> old.care_home_id then
    raise exception 'care_home_id_immutable'
      using hint = 'Residents cannot be moved between care homes by update.';
  end if;

  if new.created_by <> old.created_by then
    raise exception 'created_by_immutable'
      using hint = 'created_by cannot be changed after insert.';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'created_at_immutable'
      using hint = 'created_at cannot be changed after insert.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.handle_residents_before_update() is
  'Prevents resident care-home boundary changes and updates updated_at before each resident update.';

drop trigger if exists residents_before_update on public.residents;

create trigger residents_before_update
before update on public.residents
for each row
execute function public.handle_residents_before_update();

revoke all on table public.residents from public;
revoke all on table public.residents from anon;
revoke all on table public.residents from authenticated;
grant select, insert, update on table public.residents to authenticated;

alter table public.residents enable row level security;

drop policy if exists "residents: members can read own home" on public.residents;
drop policy if exists "residents: admins can read deleted own home" on public.residents;
drop policy if exists "residents: admins can insert" on public.residents;
drop policy if exists "residents: admins can update" on public.residents;

create policy "residents: members can read own home"
  on public.residents
  for select
  using (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
  );

create policy "residents: admins can read deleted own home"
  on public.residents
  for select
  using (
    deleted_at is not null
    and public.is_care_home_admin(care_home_id)
  );

create policy "residents: admins can insert"
  on public.residents
  for insert
  with check (
    deleted_at is null
    and created_by = auth.uid()
    and public.is_care_home_admin(care_home_id)
  );

create policy "residents: admins can update"
  on public.residents
  for update
  using (
    public.is_care_home_admin(care_home_id)
  )
  with check (
    public.is_care_home_admin(care_home_id)
  );
