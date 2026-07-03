-- ============================================================
-- KingdomCare OS -- Add Resident Sex Field
-- ============================================================
-- Adds a resident sex field so staff can record whether a
-- resident is male, female, other, or unknown. Existing rows
-- default to 'unknown' and remain valid without a backfill step.
--
-- NOTE: After applying this migration, regenerate types:
--   npx supabase gen types typescript --linked > app/lib/supabase/database.types.ts
-- ============================================================

alter table public.residents
  add column if not exists sex text not null default 'unknown';

alter table public.residents
  drop constraint if exists residents_sex_check;

alter table public.residents
  add constraint residents_sex_check
    check (sex in ('male', 'female', 'other', 'unknown'));

comment on column public.residents.sex is
  'Resident sex: male, female, other, or unknown. Defaults to unknown until staff update it.';
