-- ============================================================
-- KingdomCare OS — Auth & Membership Schema
-- ============================================================
-- Roles (MVP):
--   admin     = owner / manager. Full control over the care home,
--               staff, residents, settings, and all records.
--               (Owner and manager are the same role for MVP.
--                More granular roles can be added later if needed.)
--   nurse     = medication and clinical-focused user.
--   caregiver = daily care worker: shift reports, tasks,
--               incidents, and care notes.
-- ============================================================

-- ── 1. Profiles ───────────────────────────────────────────────
-- One profile per Supabase auth user, mirroring auth.users.

create table if not exists public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing user profile. Created on sign-up via client code or a DB trigger.';

-- ── 2. Care Homes ─────────────────────────────────────────────
-- A care home is the top-level tenant. All members belong to one.

create table if not exists public.care_homes (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  created_by  uuid        references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.care_homes is
  'A care home organisation. The user who creates one becomes its first admin.';

-- ── 3. Care Home Members ──────────────────────────────────────
-- Links users to care homes with an assigned role.

create table if not exists public.care_home_members (
  id           uuid        primary key default gen_random_uuid(),
  care_home_id uuid        not null references public.care_homes (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  role         text        not null,
  created_at   timestamptz not null default now(),

  -- One membership per user per care home
  unique (care_home_id, user_id),

  -- admin = owner/manager (MVP). nurse and caregiver cover clinical
  -- and daily-care workflows respectively. Extend this list as needed.
  constraint care_home_members_role_check
    check (role in ('admin', 'nurse', 'caregiver'))
);

comment on table public.care_home_members is
  'Membership table linking auth users to care homes with a role.';

comment on column public.care_home_members.role is
  'admin = owner/manager (MVP). nurse = medication/clinical. caregiver = daily care worker.';

-- ============================================================
-- Row Level Security — enable on all tables
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.care_homes         enable row level security;
alter table public.care_home_members  enable row level security;

-- ============================================================
-- Security-definer helper functions
-- ============================================================
-- These functions run as the schema owner and therefore bypass
-- RLS on their inner queries. This breaks the self-referential
-- recursion that would occur if care_home_members policies
-- queried care_home_members directly.
--
-- set search_path = '' prevents schema-hijacking attacks in
-- security definer contexts.
-- ============================================================

-- Returns every care_home_id the calling user is a member of.
create or replace function public.get_my_care_home_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select care_home_id
  from public.care_home_members
  where user_id = (select auth.uid())
$$;

comment on function public.get_my_care_home_ids() is
  'Returns the care_home_ids the current user belongs to. '
  'Runs security definer to avoid RLS recursion on care_home_members.';

-- Returns true if the calling user is an admin of a specific care home.
create or replace function public.is_care_home_admin(p_care_home_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_home_members
    where care_home_id = p_care_home_id
      and user_id      = (select auth.uid())
      and role         = 'admin'
  )
$$;

comment on function public.is_care_home_admin(uuid) is
  'Returns true if the current user is an admin of the given care home. '
  'Runs security definer to avoid RLS recursion on care_home_members.';

-- ============================================================
-- RLS Policies — profiles
-- ============================================================

-- Users can insert their own profile row (needed for sign-up flow).
create policy "profiles: own insert"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can read their own profile.
create policy "profiles: own read"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update their own profile.
create policy "profiles: own update"
  on public.profiles
  for update
  using    (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- RLS Policies — care_homes
-- ============================================================

-- Any authenticated user can create a care home they own.
-- The application must set created_by = auth.uid() when inserting.
create policy "care_homes: authenticated can create own"
  on public.care_homes
  for insert
  with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
  );

-- Members can read any care home they belong to.
-- Uses get_my_care_home_ids() to avoid triggering the recursive
-- care_home_members SELECT policy.
create policy "care_homes: members can read"
  on public.care_homes
  for select
  using (
    id in (select public.get_my_care_home_ids())
  );

-- ============================================================
-- RLS Policies — care_home_members
-- ============================================================

-- Policy 1 (SELECT): Members can read all rows for their own care homes.
-- Uses get_my_care_home_ids() — security definer — to avoid recursion.
create policy "care_home_members: members can read own home"
  on public.care_home_members
  for select
  using (
    care_home_id in (select public.get_my_care_home_ids())
  );

-- Policy 2 (INSERT — onboarding): The user who created a care home can
-- insert themselves as its first admin. No existing membership is required.
-- This is the only path to bootstrap the first admin row.
-- Constraints: inserting user = row user, role must be admin, care home
-- must have been created by the same user.
create policy "care_home_members: creator can self-register as admin"
  on public.care_home_members
  for insert
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and exists (
      select 1
      from public.care_homes
      where id         = care_home_id
        and created_by = auth.uid()
    )
  );

-- Policy 3 (INSERT — management): Existing admins can add any new member.
-- Uses is_care_home_admin() — security definer — to avoid recursion.
create policy "care_home_members: admins can insert"
  on public.care_home_members
  for insert
  with check (
    public.is_care_home_admin(care_home_id)
  );

-- Policy 4 (UPDATE): Only admins can change member roles.
-- Uses is_care_home_admin() — security definer — to avoid recursion.
create policy "care_home_members: admins can update"
  on public.care_home_members
  for update
  using (
    public.is_care_home_admin(care_home_id)
  );

-- Policy 5 (DELETE): Only admins can remove members.
-- Uses is_care_home_admin() — security definer — to avoid recursion.
create policy "care_home_members: admins can delete"
  on public.care_home_members
  for delete
  using (
    public.is_care_home_admin(care_home_id)
  );

-- ============================================================
-- Convenience view (optional — uncomment when needed)
-- ============================================================
-- Joined view of member rows + profile display names.
-- Inherits RLS from the base tables; no separate policies needed.
--
-- create or replace view public.care_home_member_profiles as
--   select
--     m.id,
--     m.care_home_id,
--     m.user_id,
--     m.role,
--     m.created_at,
--     p.full_name,
--     p.email
--   from public.care_home_members m
--   join public.profiles p on p.id = m.user_id;
