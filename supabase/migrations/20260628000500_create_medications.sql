-- ============================================================
-- KingdomCare OS -- Medications Schema
-- ============================================================
-- Creates the shared Supabase-backed medications and medication
-- alerts tables and policies.
--
-- Existing helper functions reused:
--   * public.get_my_care_home_ids()
--
-- Medication access model:
--   * care home members can read non-deleted medications and alerts
--     in their own care homes (caregivers included)
--   * admins and nurses can read all rows in their own care homes,
--     including archived and soft-deleted rows
--   * admins and nurses can INSERT, UPDATE, archive, and
--     soft-delete medications and medication alerts
--   * caregivers can SELECT but cannot edit medications or alerts
--
-- NOTE: After applying this migration, regenerate types:
--   npx supabase gen types typescript --linked > app/lib/supabase/database.types.ts
-- ============================================================

create table if not exists public.medications (
  id                  uuid primary key default gen_random_uuid(),
  care_home_id        uuid not null references public.care_homes(id) on delete cascade,
  resident_id         uuid not null references public.residents(id) on delete cascade,
  medication_name     text not null,
  dosage              text null,
  route               text null,
  frequency           text null,
  schedule_notes      text null,
  start_date          date null,
  end_date            date null,
  prescribing_doctor  text null,
  pharmacy            text null,
  status              text not null default 'active',
  created_by          uuid null references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz null,

  constraint medications_medication_name_not_blank
    check (nullif(trim(medication_name), '') is not null),
  constraint medications_status_check
    check (status in ('active', 'paused', 'discontinued', 'archived'))
);

comment on table public.medications is
  'Shared Supabase-backed medication records for care home residents.';

create index if not exists medications_care_home_id_idx
  on public.medications (care_home_id);

create index if not exists medications_active_by_care_home_idx
  on public.medications (care_home_id, created_at desc)
  where deleted_at is null and status = 'active';

create index if not exists medications_resident_id_idx
  on public.medications (resident_id, created_at desc)
  where deleted_at is null;

create or replace function public.handle_medications_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
begin
  if new.care_home_id <> old.care_home_id then
    raise exception 'care_home_id_immutable'
      using hint = 'Medications cannot be moved between care homes by update.';
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
      using hint = 'You must belong to this care home to update medications.';
  end if;

  if v_role = 'caregiver' then
    raise exception 'caregiver_cannot_update_medications'
      using hint = 'Caregivers cannot edit medication records.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.handle_medications_before_update() is
  'Protects immutable medication fields and maintains updated_at.';

drop trigger if exists medications_before_update on public.medications;

create trigger medications_before_update
before update on public.medications
for each row
execute function public.handle_medications_before_update();

revoke all on table public.medications from public;
revoke all on table public.medications from anon;
revoke all on table public.medications from authenticated;
grant select, insert, update on table public.medications to authenticated;

alter table public.medications enable row level security;

drop policy if exists "medications: members can read active own home" on public.medications;
drop policy if exists "medications: admins and nurses can read all own home" on public.medications;
drop policy if exists "medications: admins and nurses can insert own home" on public.medications;
drop policy if exists "medications: admins and nurses can update own home" on public.medications;

create policy "medications: members can read active own home"
  on public.medications
  for select
  using (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
  );

create policy "medications: admins and nurses can read all own home"
  on public.medications
  for select
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medications.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

create policy "medications: admins and nurses can insert own home"
  on public.medications
  for insert
  with check (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
    and (created_by is null or created_by = auth.uid())
    and exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medications.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

create policy "medications: admins and nurses can update own home"
  on public.medications
  for update
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medications.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  )
  with check (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medications.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

-- ============================================================
-- medication_alerts
-- ============================================================

create table if not exists public.medication_alerts (
  id              uuid primary key default gen_random_uuid(),
  care_home_id    uuid not null references public.care_homes(id) on delete cascade,
  resident_id     uuid null references public.residents(id) on delete set null,
  medication_id   uuid null references public.medications(id) on delete cascade,
  alert_type      text not null,
  severity        text not null default 'medium',
  status          text not null default 'open',
  message         text not null,
  due_at          timestamptz null,
  resolved_at     timestamptz null,
  resolved_by     uuid null references auth.users(id) on delete set null,
  created_by      uuid null references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz null,

  constraint medication_alerts_message_not_blank
    check (nullif(trim(message), '') is not null),
  constraint medication_alerts_alert_type_check
    check (alert_type in ('missed_dose', 'refill_needed', 'review_required', 'allergy_warning', 'interaction_warning', 'other')),
  constraint medication_alerts_severity_check
    check (severity in ('low', 'medium', 'high', 'critical')),
  constraint medication_alerts_status_check
    check (status in ('open', 'reviewing', 'resolved', 'archived')),
  constraint medication_alerts_resolved_at_consistency
    check (
      (status = 'resolved' and resolved_at is not null)
      or (status <> 'resolved')
    )
);

comment on table public.medication_alerts is
  'Shared Supabase-backed medication alert records for care home residents.';

create index if not exists medication_alerts_care_home_id_idx
  on public.medication_alerts (care_home_id);

create index if not exists medication_alerts_open_by_care_home_idx
  on public.medication_alerts (care_home_id, created_at desc)
  where deleted_at is null and status in ('open', 'reviewing');

create index if not exists medication_alerts_medication_id_idx
  on public.medication_alerts (medication_id, created_at desc)
  where deleted_at is null;

create index if not exists medication_alerts_resident_id_idx
  on public.medication_alerts (resident_id, created_at desc)
  where deleted_at is null;

create or replace function public.handle_medication_alerts_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
begin
  if new.care_home_id <> old.care_home_id then
    raise exception 'care_home_id_immutable'
      using hint = 'Medication alerts cannot be moved between care homes by update.';
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
      using hint = 'You must belong to this care home to update medication alerts.';
  end if;

  if v_role = 'caregiver' then
    raise exception 'caregiver_cannot_update_medication_alerts'
      using hint = 'Caregivers cannot edit medication alert records.';
  end if;

  if new.status = 'resolved' and new.resolved_at is null then
    new.resolved_at := now();
  elsif new.status <> 'resolved' and new.resolved_at is not null then
    new.resolved_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.handle_medication_alerts_before_update() is
  'Protects immutable medication alert fields and maintains updated_at/resolved_at.';

drop trigger if exists medication_alerts_before_update on public.medication_alerts;

create trigger medication_alerts_before_update
before update on public.medication_alerts
for each row
execute function public.handle_medication_alerts_before_update();

revoke all on table public.medication_alerts from public;
revoke all on table public.medication_alerts from anon;
revoke all on table public.medication_alerts from authenticated;
grant select, insert, update on table public.medication_alerts to authenticated;

alter table public.medication_alerts enable row level security;

drop policy if exists "medication_alerts: members can read active own home" on public.medication_alerts;
drop policy if exists "medication_alerts: admins and nurses can read all own home" on public.medication_alerts;
drop policy if exists "medication_alerts: admins and nurses can insert own home" on public.medication_alerts;
drop policy if exists "medication_alerts: admins and nurses can update own home" on public.medication_alerts;

create policy "medication_alerts: members can read active own home"
  on public.medication_alerts
  for select
  using (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
  );

create policy "medication_alerts: admins and nurses can read all own home"
  on public.medication_alerts
  for select
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medication_alerts.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

create policy "medication_alerts: admins and nurses can insert own home"
  on public.medication_alerts
  for insert
  with check (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
    and (created_by is null or created_by = auth.uid())
    and exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medication_alerts.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

create policy "medication_alerts: admins and nurses can update own home"
  on public.medication_alerts
  for update
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medication_alerts.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  )
  with check (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = medication_alerts.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );
