-- ============================================================
-- KingdomCare OS -- Fix tasks RLS update policies
-- ============================================================
-- Soft delete/archive operations update `deleted_at`, `status`,
-- and sometimes `completed_at`. The original admin/nurse UPDATE
-- policy only checked care-home membership on the new row, which
-- made the soft-delete/archive path brittle under RLS evaluation.
--
-- This corrective migration makes UPDATE authorization explicit
-- for both the existing row (USING) and the new row (WITH CHECK),
-- while preserving care-home boundaries and caregiver limits.
-- ============================================================

drop policy if exists "tasks: admins and nurses can update own home" on public.tasks;
drop policy if exists "tasks: caregivers can update status in own home" on public.tasks;

create policy "tasks: admins and nurses can update own home"
  on public.tasks
  for update
  using (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = tasks.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  )
  with check (
    exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = tasks.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  );

create policy "tasks: caregivers can update status in own home"
  on public.tasks
  for update
  using (
    deleted_at is null
    and exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = tasks.care_home_id
        and m.user_id = (select auth.uid())
        and m.role = 'caregiver'
    )
  )
  with check (
    deleted_at is null
    and exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = tasks.care_home_id
        and m.user_id = (select auth.uid())
        and m.role = 'caregiver'
    )
  );
