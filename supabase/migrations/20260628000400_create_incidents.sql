-- ============================================================
-- KingdomCare OS -- Incidents Schema
-- ============================================================
-- Creates the shared Supabase-backed incidents table and policies.
--
-- Existing helper functions reused:
--   * public.get_my_care_home_ids()
--
-- Incident access model:
--   * care home members can read non-deleted incidents in their own care homes
--   * admins and nurses can read all incidents in their own care homes,
--     including archived and soft-deleted rows
--   * care home members can create incidents in their own care homes
--   * admins and nurses can fully update/archive/delete incidents
--   * caregivers may create incidents but cannot broadly edit/delete them
-- ============================================================

create table if not exists public.incidents (
  id                  uuid primary key default gen_random_uuid(),
  care_home_id        uuid not null references public.care_homes(id) on delete cascade,
  resident_id         uuid null references public.residents(id) on delete set null,
  incident_type       text not null,
  severity            text not null default 'medium',
  status              text not null default 'open',
  occurred_at         timestamptz not null default now(),
  location            text null,
  description         text not null,
  immediate_action    text null,
  follow_up_required  boolean not null default false,
  follow_up_notes     text null,
  reported_by         uuid null references auth.users(id) on delete set null,
  created_by          uuid null references auth.users(id) on delete set null,
  resolved_at         timestamptz null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz null,

  constraint incidents_incident_type_not_blank
    check (nullif(trim(incident_type), '') is not null),
  constraint incidents_description_not_blank
    check (nullif(trim(description), '') is not null),
  constraint incidents_severity_check
    check (severity in ('low', 'medium', 'high', 'critical')),
  constraint incidents_status_check
    check (status in ('open', 'reviewing', 'resolved', 'archived')),
  constraint incidents_resolved_at_consistency
    check (
      (status = 'resolved' and resolved_at is not null)
      or (status <> 'resolved')
    )
);

comment on table public.incidents is
  'Shared Supabase-backed incident records for care home operations.';

create index if not exists incidents_care_home_id_idx
  on public.incidents (care_home_id);

create index if not exists incidents_open_by_care_home_idx
  on public.incidents (care_home_id, occurred_at desc)
  where deleted_at is null and status in ('open', 'reviewing');

create index if not exists incidents_resident_id_idx
  on public.incidents (resident_id, occurred_at desc)
  where deleted_at is null;

create or replace function public.handle_incidents_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
begin
  if new.care_home_id <> old.care_home_id then
    raise exception 'care_home_id_immutable'
      using hint = 'Incidents cannot be moved between care homes by update.';
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
      using hint = 'You must belong to this care home to update incidents.';
  end if;

  if v_role = 'caregiver' then
    raise exception 'caregiver_cannot_update_incidents'
      using hint = 'Caregivers cannot edit archived or existing incident records.';
  end if;

  if new.status = 'resolved' and new.resolved_at is null then
    new.resolved_at := now();
  elsif new.status <> 'resolved' and new.resolved_at is not null then
    new.resolved_at := null;
  end if;

  if new.follow_up_required = false and new.follow_up_notes is not null and btrim(new.follow_up_notes) = '' then
    new.follow_up_notes := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.handle_incidents_before_update() is
  'Protects immutable incident fields and maintains updated_at/resolved_at.';

drop trigger if exists incidents_before_update on public.incidents;

create trigger incidents_before_update
before update on public.incidents
for each row
execute function public.handle_incidents_before_update();

revoke all on table public.incidents from public;
revoke all on table public.incidents from anon;
revoke all on table public.incidents from authenticated;
grant select, insert, update on table public.incidents to authenticated;

alter table public.incidents enable row level security;

drop policy if exists "incidents: members can read active own home" on public.incidents;
drop policy if exists "incidents: admins and nurses can read all own home" on public.incidents;
drop policy if exists "incidents: members can insert own home" on public.incidents;
drop policy if exists "incidents: admins and nurses can update own home" on public.incidents;

create policy "incidents: members can read active own home"
  on public.incidents
  for select
  using (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
  );

create policy "incidents: admins and nurses can read all own home"
  on public.incidents
  for select
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = incidents.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

create policy "incidents: members can insert own home"
  on public.incidents
  for insert
  with check (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
    and (reported_by is null or reported_by = auth.uid())
    and (created_by is null or created_by = auth.uid())
  );

create policy "incidents: admins and nurses can update own home"
  on public.incidents
  for update
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = incidents.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  )
  with check (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = incidents.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );
