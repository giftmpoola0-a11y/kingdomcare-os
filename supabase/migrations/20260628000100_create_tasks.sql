-- ============================================================
-- KingdomCare OS -- Tasks Schema
-- ============================================================
-- Creates the shared Supabase-backed tasks table and policies.
--
-- Existing helper functions reused:
--   * public.get_my_care_home_ids()
--   * public.is_care_home_admin(uuid)
--
-- Task access model:
--   * care home members can read tasks in their own care homes
--   * care home members can create tasks in their own care homes
--   * admins and nurses can fully update/archive/delete tasks
--   * caregivers can update task status/completion fields only
-- ============================================================

create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  care_home_id  uuid not null references public.care_homes(id) on delete cascade,
  resident_id   uuid null references public.residents(id) on delete set null,
  title         text not null,
  description   text null,
  status        text not null default 'open',
  priority      text not null default 'normal',
  due_at        timestamptz null,
  assigned_to   uuid null references public.profiles(id) on delete set null,
  created_by    uuid null references auth.users(id) on delete set null,
  completed_at  timestamptz null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz null,

  constraint tasks_title_not_blank
    check (nullif(trim(title), '') is not null),
  constraint tasks_status_check
    check (status in ('open', 'in_progress', 'completed', 'archived')),
  constraint tasks_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint tasks_completed_at_consistency
    check (
      (status = 'completed' and completed_at is not null)
      or (status <> 'completed')
    )
);

comment on table public.tasks is
  'Shared Supabase-backed tasks for care home operations.';

create index if not exists tasks_care_home_id_idx
  on public.tasks (care_home_id);

create index if not exists tasks_open_by_care_home_idx
  on public.tasks (care_home_id, due_at)
  where deleted_at is null and status in ('open', 'in_progress');

create index if not exists tasks_assigned_to_idx
  on public.tasks (assigned_to, due_at)
  where deleted_at is null;

create or replace function public.handle_tasks_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
begin
  if new.care_home_id <> old.care_home_id then
    raise exception 'care_home_id_immutable'
      using hint = 'Tasks cannot be moved between care homes by update.';
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
      using hint = 'You must belong to this care home to update tasks.';
  end if;

  if v_role = 'caregiver' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.priority is distinct from old.priority
      or new.due_at is distinct from old.due_at
      or new.assigned_to is distinct from old.assigned_to
      or new.resident_id is distinct from old.resident_id
      or new.created_by is distinct from old.created_by
      or new.care_home_id is distinct from old.care_home_id
    then
      raise exception 'caregiver_status_update_only'
        using hint = 'Caregivers may only update task status and completion fields.';
    end if;

    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'caregiver_cannot_delete_tasks'
        using hint = 'Caregivers cannot archive or delete tasks.';
    end if;
  end if;

  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'completed' and new.completed_at is not null then
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function public.handle_tasks_before_update() is
  'Protects immutable task fields, limits caregiver edits to status fields, and maintains updated_at/completed_at.';

drop trigger if exists tasks_before_update on public.tasks;

create trigger tasks_before_update
before update on public.tasks
for each row
execute function public.handle_tasks_before_update();

revoke all on table public.tasks from public;
revoke all on table public.tasks from anon;
revoke all on table public.tasks from authenticated;
grant select, insert, update on table public.tasks to authenticated;

alter table public.tasks enable row level security;

drop policy if exists "tasks: members can read own home" on public.tasks;
drop policy if exists "tasks: members can insert own home" on public.tasks;
drop policy if exists "tasks: admins and nurses can update own home" on public.tasks;
drop policy if exists "tasks: caregivers can update status in own home" on public.tasks;

create policy "tasks: members can read own home"
  on public.tasks
  for select
  using (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
  );

create policy "tasks: members can insert own home"
  on public.tasks
  for insert
  with check (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
    and (created_by is null or created_by = auth.uid())
  );

create policy "tasks: admins and nurses can update own home"
  on public.tasks
  for update
  using (
    deleted_at is null
    and exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = tasks.care_home_id
        and m.user_id = (select auth.uid())
        and m.role in ('admin', 'nurse')
    )
  )
  with check (
    care_home_id in (select public.get_my_care_home_ids())
  );

create policy "tasks: caregivers can update status in own home"
  on public.tasks
  for update
  using (
    deleted_at is null
    and care_home_id in (select public.get_my_care_home_ids())
    and exists (
      select 1
      from public.care_home_members as m
      where m.care_home_id = tasks.care_home_id
        and m.user_id = (select auth.uid())
        and m.role = 'caregiver'
    )
  )
  with check (
    care_home_id in (select public.get_my_care_home_ids())
  );
