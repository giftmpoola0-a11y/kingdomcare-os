-- ============================================================
-- KingdomCare OS -- Fix tasks soft-delete SELECT visibility
-- ============================================================
-- Soft delete updates `deleted_at` and `status = 'archived'`.
-- The baseline member SELECT policy only exposes rows where
-- `deleted_at is null`, which can make soft-deleted rows fail
-- RLS checks during UPDATE/RETURNING flows.
--
-- This migration keeps the existing member policy for active
-- tasks and adds a narrow admin/nurse-only SELECT policy for
-- soft-deleted task rows in the same care home.
-- ============================================================

drop policy if exists "tasks: admins and nurses can read deleted rows in own home" on public.tasks;

create policy "tasks: admins and nurses can read deleted rows in own home"
  on public.tasks
  for select
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = tasks.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );
