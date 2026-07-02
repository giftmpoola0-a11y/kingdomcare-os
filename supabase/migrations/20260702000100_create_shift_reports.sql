-- ============================================================
-- KingdomCare OS -- Shift Reports Schema
-- ============================================================
-- Creates the shared Supabase-backed shift reports table and policies.
-- This is the real replacement for the legacy localStorage-backed
-- SavedReport flow (app/lib/reports.ts).
--
-- Existing helper functions reused:
--   * public.get_my_care_home_ids()
--
-- Shift report access model:
--   * care home members can read non-deleted shift reports in their
--     own care homes
--   * admins and nurses can read all shift reports in their own care
--     homes, including archived and soft-deleted rows
--   * care home members can create shift reports in their own care
--     homes
--   * only admins and nurses can update/archive shift reports
--     (no update/archive workflow is implemented in the app yet --
--     this policy exists so the table matches the shape of the
--     other domain tables from day one)
--
-- NOTE: After applying this migration, regenerate types:
--   npx supabase gen types typescript --linked > app/lib/supabase/database.types.ts
-- ============================================================

create table if not exists public.shift_reports (
  id                      uuid primary key default gen_random_uuid(),
  care_home_id            uuid not null references public.care_homes(id) on delete cascade,
  resident_id             uuid null references public.residents(id) on delete set null,
  resident_name_snapshot  text not null,
  created_by              uuid not null references auth.users(id),
  shift_date              date not null,
  shift_type              text not null,
  summary                 text not null,
  notes                   jsonb not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz null,

  constraint shift_reports_resident_name_snapshot_not_blank
    check (nullif(trim(resident_name_snapshot), '') is not null),
  constraint shift_reports_summary_not_blank
    check (nullif(trim(summary), '') is not null),
  constraint shift_reports_shift_type_check
    check (shift_type in ('Morning', 'Evening', 'Overnight')),
  constraint shift_reports_notes_is_array
    check (jsonb_typeof(notes) = 'array')
);

comment on table public.shift_reports is
  'Shared Supabase-backed shift documentation notes for care home residents.';

create index if not exists shift_reports_care_home_id_idx
  on public.shift_reports (care_home_id);

create index if not exists shift_reports_recent_by_care_home_idx
  on public.shift_reports (care_home_id, shift_date desc, created_at desc)
  where deleted_at is null;

create index if not exists shift_reports_resident_id_idx
  on public.shift_reports (resident_id, shift_date desc)
  where deleted_at is null;

create or replace function public.handle_shift_reports_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
begin
  if new.care_home_id <> old.care_home_id then
    raise exception 'care_home_id_immutable'
      using hint = 'Shift reports cannot be moved between care homes by update.';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'created_by_immutable'
      using hint = 'created_by cannot be changed after insert.';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'created_at_immutable'
      using hint = 'created_at cannot be changed after insert.';
  end if;

  select m.role
  into v_role
  from public.care_home_members as m
  where m.care_home_id = old.care_home_id
    and m.user_id = (select auth.uid())
  limit 1;

  if v_role is null then
    raise exception 'membership_required'
      using hint = 'You must belong to this care home to update shift reports.';
  end if;

  if v_role = 'caregiver' then
    raise exception 'caregiver_cannot_update_shift_reports'
      using hint = 'Caregivers cannot edit shift report records.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.handle_shift_reports_before_update() is
  'Protects immutable shift report fields and maintains updated_at.';

drop trigger if exists shift_reports_before_update on public.shift_reports;

create trigger shift_reports_before_update
before update on public.shift_reports
for each row
execute function public.handle_shift_reports_before_update();

revoke all on table public.shift_reports from public;
revoke all on table public.shift_reports from anon;
revoke all on table public.shift_reports from authenticated;
grant select, insert, update on table public.shift_reports to authenticated;

alter table public.shift_reports enable row level security;

drop policy if exists "shift_reports: members can read active own home" on public.shift_reports;
drop policy if exists "shift_reports: admins and nurses can read all own home" on public.shift_reports;
drop policy if exists "shift_reports: members can insert own home" on public.shift_reports;
drop policy if exists "shift_reports: admins and nurses can update own home" on public.shift_reports;

create policy "shift_reports: members can read active own home"
  on public.shift_reports
  for select
  using (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
  );

create policy "shift_reports: admins and nurses can read all own home"
  on public.shift_reports
  for select
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = shift_reports.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

create policy "shift_reports: members can insert own home"
  on public.shift_reports
  for insert
  with check (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
    and created_by = auth.uid()
  );

create policy "shift_reports: admins and nurses can update own home"
  on public.shift_reports
  for update
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = shift_reports.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  )
  with check (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = shift_reports.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );
