-- ============================================================
-- KingdomCare OS — Leave Care Home RPC
-- ============================================================
-- Allows the current authenticated user to leave a care home
-- membership safely while preserving profile, auth user, and
-- organisation records.
--
-- Rules enforced inside the function:
--   * caller must be authenticated
--   * caller must currently belong to the specified care home
--   * nurses and caregivers may leave directly
--   * admins may leave only if another admin exists
--
-- SECURITY DEFINER is used so the function can perform the delete
-- without requiring broader client-side table permissions. The
-- function enforces caller identity and membership checks itself.
-- ============================================================

create or replace function public.leave_care_home_membership(
  p_care_home_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_membership_role text;
  v_other_admin_exists boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not_authenticated'
      using hint = 'Caller must have a valid Supabase Auth session.';
  end if;

  select role
    into v_membership_role
  from public.care_home_members
  where care_home_id = p_care_home_id
    and user_id = v_user_id
  limit 1;

  if v_membership_role is null then
    raise exception 'membership_not_found'
      using hint = 'Current user is not a member of the specified care home.';
  end if;

  if v_membership_role = 'admin' then
    select exists (
      select 1
      from public.care_home_members
      where care_home_id = p_care_home_id
        and role = 'admin'
        and user_id <> v_user_id
    )
    into v_other_admin_exists;

    if not v_other_admin_exists then
      raise exception 'last_admin'
        using hint = 'Add another admin before leaving this care home.';
    end if;
  end if;

  delete from public.care_home_members
  where care_home_id = p_care_home_id
    and user_id = v_user_id;

  return p_care_home_id;
end;
$$;

comment on function public.leave_care_home_membership(uuid) is
  'Allows the current user to leave a care home membership safely. '
  'Admins may leave only if another admin exists. Preserves auth user, profile, and care_home rows.';

revoke execute
  on function public.leave_care_home_membership(uuid)
  from public;

grant execute
  on function public.leave_care_home_membership(uuid)
  to authenticated;
