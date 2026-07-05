-- Review-only cleanup script for stale Playwright-generated Supabase rows.
-- Scope is intentionally narrow:
--   * only the E2E Test Care Home
--   * only exact Playwright naming/content patterns
--   * uses soft-delete columns instead of hard deletes
-- Do not run blindly in production without reviewing the preview queries first.

-- Preview current matches.
select 'residents' as table_name, id, full_name as label, created_at, deleted_at
from public.residents
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and full_name like 'Playwright Test Resident %'
and deleted_at is null
order by created_at desc;

select 'shift_reports' as table_name, id, resident_name_snapshot as label, created_at, deleted_at
from public.shift_reports
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and (
  resident_name_snapshot like 'Playwright Test Resident %'
  or summary ilike '%Playwright%'
)
and deleted_at is null
order by created_at desc;

select 'incidents' as table_name, id, incident_type as label, created_at, deleted_at
from public.incidents
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and (
  incident_type ilike '%Playwright%'
  or description ilike '%Playwright%'
  or coalesce(location, '') ilike '%Playwright%'
  or coalesce(follow_up_notes, '') ilike '%Playwright%'
)
and deleted_at is null
order by created_at desc;

select 'tasks' as table_name, id, title as label, created_at, deleted_at
from public.tasks
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and (
  title ilike '%Playwright%'
  or coalesce(description, '') ilike '%Playwright%'
)
and deleted_at is null
order by created_at desc;

-- Soft-delete matched rows after review.
-- Recommended usage:
-- begin;
-- <run the updates below>
-- select counts again;
-- commit;
-- or rollback;

update public.shift_reports
set deleted_at = now(),
    updated_at = now()
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and (
  resident_name_snapshot like 'Playwright Test Resident %'
  or summary ilike '%Playwright%'
)
and deleted_at is null;

update public.residents
set deleted_at = now(),
    status = 'archived',
    updated_at = now()
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and full_name like 'Playwright Test Resident %'
and deleted_at is null;

update public.incidents
set deleted_at = now(),
    status = 'archived',
    updated_at = now()
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and (
  incident_type ilike '%Playwright%'
  or description ilike '%Playwright%'
  or coalesce(location, '') ilike '%Playwright%'
  or coalesce(follow_up_notes, '') ilike '%Playwright%'
)
and deleted_at is null;

update public.tasks
set deleted_at = now(),
    status = 'archived',
    updated_at = now()
where care_home_id in (
  select id from public.care_homes where name = 'E2E Test Care Home'
)
and (
  title ilike '%Playwright%'
  or coalesce(description, '') ilike '%Playwright%'
)
and deleted_at is null;
