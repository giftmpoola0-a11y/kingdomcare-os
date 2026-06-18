-- ============================================================
-- KingdomCare OS -- Auth Profile Trigger
-- ============================================================
-- Ensures every Supabase Auth user has a matching public.profiles
-- row so staff management and profile-based lookups work
-- immediately after sign-up.
--
-- This patch does two things:
--   1. Adds an AFTER INSERT trigger on auth.users
--   2. Backfills any missing public.profiles rows for existing users
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    updated_at
  )
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(
          nullif(trim(coalesce(excluded.full_name, '')), ''),
          public.profiles.full_name
        ),
        updated_at = now();

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Creates or updates the matching public.profiles row whenever a new auth.users record is inserted.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

insert into public.profiles (
  id,
  email,
  full_name,
  created_at,
  updated_at
)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  now(),
  now()
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(
        public.profiles.full_name,
        nullif(trim(coalesce(excluded.full_name, '')), '')
      ),
      updated_at = now();
