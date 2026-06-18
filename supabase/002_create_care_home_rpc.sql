-- ============================================================
-- KingdomCare OS — Onboarding RPC (patch 002)
-- ============================================================
-- Replaces the previous multi-step direct-insert approach with a
-- single SECURITY DEFINER function that handles all three writes
-- atomically.
--
-- Why this works when direct INSERTs did not:
--   SECURITY DEFINER causes the function to execute with the
--   privileges of its owner (the postgres/supabase_admin role).
--   That role bypasses RLS on every table, so the INSERT
--   statements inside never hit an RLS policy check.
--   auth.uid() still works because JWT claims are stored as a
--   session-level GUC (request.jwt.claims), not tied to the
--   execution role — the caller's identity is preserved even
--   while running as the owner.
--
-- The function enforces its own auth gate on line 1 of the body,
-- so it is not a privilege escalation path for anonymous callers.
--
-- set search_path = '' prevents schema-injection attacks that can
-- occur in SECURITY DEFINER functions (all table references must
-- be fully qualified).
-- ============================================================

create or replace function public.create_care_home_onboarding(
  care_home_name     text,
  profile_full_name  text default null,
  profile_email      text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id      uuid;
  v_care_home_id uuid;
begin

  -- ── 1. Auth check ─────────────────────────────────────────────
  -- auth.uid() reads request.jwt.claims which is set per-session
  -- by PostgREST before executing the function.
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not_authenticated'
      using hint = 'Caller must have a valid Supabase Auth session.';
  end if;

  -- ── 2. Validate input ─────────────────────────────────────────
  care_home_name := trim(care_home_name);

  if care_home_name = '' then
    raise exception 'invalid_input'
      using hint = 'care_home_name must not be empty after trimming.';
  end if;

  -- ── 3. Upsert profile ─────────────────────────────────────────
  -- Creates the profile on first call; on subsequent calls keeps
  -- any existing non-empty full_name / email rather than blanking
  -- them out.
  insert into public.profiles (id, full_name, email, updated_at)
  values (
    v_user_id,
    coalesce(profile_full_name, ''),
    coalesce(profile_email, ''),
    now()
  )
  on conflict (id) do update
    set full_name  = coalesce(
                       nullif(trim(coalesce(profile_full_name, '')), ''),
                       public.profiles.full_name
                     ),
        email      = coalesce(
                       nullif(trim(coalesce(profile_email, '')), ''),
                       public.profiles.email
                     ),
        updated_at = now();

  -- ── 4. Insert care home ───────────────────────────────────────
  insert into public.care_homes (name, created_by)
  values (care_home_name, v_user_id)
  returning id into v_care_home_id;

  -- ── 5. Insert admin membership ────────────────────────────────
  insert into public.care_home_members (care_home_id, user_id, role)
  values (v_care_home_id, v_user_id, 'admin');

  return v_care_home_id;

end;
$$;

comment on function public.create_care_home_onboarding(text, text, text) is
  'Atomic onboarding bootstrap: upserts the caller profile, creates a care_home, '
  'and inserts an admin membership row — all in one transaction. '
  'SECURITY DEFINER bypasses RLS; auth.uid() enforces caller identity internally.';

-- ── Grants ────────────────────────────────────────────────────
-- Revoke from public first (covers both anon and authenticated by
-- default), then grant only to authenticated.
revoke execute
  on function public.create_care_home_onboarding(text, text, text)
  from public;

grant execute
  on function public.create_care_home_onboarding(text, text, text)
  to authenticated;
