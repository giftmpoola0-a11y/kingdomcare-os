-- ============================================================
-- KingdomCare OS -- Staff Management RPCs
-- ============================================================
-- Provides a safe admin-only API surface for:
--   * listing staff with profile details
--   * adding an existing signed-up user to a care home
--   * updating a member role
--   * removing a member
--
-- These functions intentionally enforce admin checks internally
-- so the client does not need broad table permissions.
-- ============================================================

create or replace function public.get_care_home_staff(
  p_care_home_id uuid
)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated'
      using hint = 'Caller must have a valid Supabase Auth session.';
  end if;

  if not public.is_care_home_admin(p_care_home_id) then
    raise exception 'not_authorized'
      using hint = 'Only admins can view staff management details.';
  end if;

  return query
  select
    m.id,
    m.user_id,
    p.email,
    p.full_name,
    m.role,
    m.created_at
  from public.care_home_members m
  left join public.profiles p on p.id = m.user_id
  where m.care_home_id = p_care_home_id
  order by m.created_at asc, p.email asc nulls last;
end;
$$;

comment on function public.get_care_home_staff(uuid) is
  'Returns staff members for a care home, including profile email/full_name. Admins only.';

create or replace function public.add_care_home_member(
  p_care_home_id uuid,
  p_email text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_target_user_id uuid;
  v_membership_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not_authenticated'
      using hint = 'Caller must have a valid Supabase Auth session.';
  end if;

  if not public.is_care_home_admin(p_care_home_id) then
    raise exception 'not_authorized'
      using hint = 'Only admins can add staff members.';
  end if;

  p_email := lower(trim(coalesce(p_email, '')));
  p_role := lower(trim(coalesce(p_role, '')));

  if p_email = '' then
    raise exception 'invalid_email'
      using hint = 'Email is required.';
  end if;

  if p_role not in ('admin', 'nurse', 'caregiver') then
    raise exception 'invalid_role'
      using hint = 'Role must be admin, nurse, or caregiver.';
  end if;

  select p.id
    into v_target_user_id
  from public.profiles p
  where lower(coalesce(p.email, '')) = p_email
  limit 1;

  if v_target_user_id is null then
    raise exception 'profile_not_found'
      using hint = 'This user must sign up first before they can be added.';
  end if;

  insert into public.care_home_members (care_home_id, user_id, role)
  values (p_care_home_id, v_target_user_id, p_role)
  returning id into v_membership_id;

  return v_membership_id;
exception
  when unique_violation then
    raise exception 'member_already_exists'
      using hint = 'This user is already a member of the care home.';
end;
$$;

comment on function public.add_care_home_member(uuid, text, text) is
  'Adds an existing signed-up user to a care home by profile email. Admins only.';

create or replace function public.update_care_home_member_role(
  p_membership_id uuid,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_care_home_id uuid;
  v_target_user_id uuid;
  v_current_role text;
  v_other_admin_exists boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not_authenticated'
      using hint = 'Caller must have a valid Supabase Auth session.';
  end if;

  p_role := lower(trim(coalesce(p_role, '')));

  if p_role not in ('admin', 'nurse', 'caregiver') then
    raise exception 'invalid_role'
      using hint = 'Role must be admin, nurse, or caregiver.';
  end if;

  select m.care_home_id, m.user_id, m.role
    into v_care_home_id, v_target_user_id, v_current_role
  from public.care_home_members m
  where m.id = p_membership_id
  limit 1;

  if v_care_home_id is null then
    raise exception 'membership_not_found'
      using hint = 'The selected staff member was not found.';
  end if;

  if not public.is_care_home_admin(v_care_home_id) then
    raise exception 'not_authorized'
      using hint = 'Only admins can update staff roles.';
  end if;

  if v_target_user_id = v_user_id then
    raise exception 'cannot_change_own_role'
      using hint = 'Use another admin account to change your role.';
  end if;

  if v_current_role = 'admin' and p_role <> 'admin' then
    select exists (
      select 1
      from public.care_home_members m
      where m.care_home_id = v_care_home_id
        and m.role = 'admin'
        and m.user_id <> v_target_user_id
    )
    into v_other_admin_exists;

    if not v_other_admin_exists then
      raise exception 'last_admin'
        using hint = 'At least one admin must remain in the care home.';
    end if;
  end if;

  update public.care_home_members
  set role = p_role
  where id = p_membership_id;

  return p_membership_id;
end;
$$;

comment on function public.update_care_home_member_role(uuid, text) is
  'Updates a staff member role. Admins only. Prevents removing the last admin and self-demotion.';

create or replace function public.remove_care_home_member(
  p_membership_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_care_home_id uuid;
  v_target_user_id uuid;
  v_target_role text;
  v_other_admin_exists boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'not_authenticated'
      using hint = 'Caller must have a valid Supabase Auth session.';
  end if;

  select m.care_home_id, m.user_id, m.role
    into v_care_home_id, v_target_user_id, v_target_role
  from public.care_home_members m
  where m.id = p_membership_id
  limit 1;

  if v_care_home_id is null then
    raise exception 'membership_not_found'
      using hint = 'The selected staff member was not found.';
  end if;

  if not public.is_care_home_admin(v_care_home_id) then
    raise exception 'not_authorized'
      using hint = 'Only admins can remove staff members.';
  end if;

  if v_target_user_id = v_user_id then
    raise exception 'cannot_remove_self'
      using hint = 'Use Leave Care Home from Account Settings to remove your own access.';
  end if;

  if v_target_role = 'admin' then
    select exists (
      select 1
      from public.care_home_members m
      where m.care_home_id = v_care_home_id
        and m.role = 'admin'
        and m.user_id <> v_target_user_id
    )
    into v_other_admin_exists;

    if not v_other_admin_exists then
      raise exception 'last_admin'
        using hint = 'At least one admin must remain in the care home.';
    end if;
  end if;

  delete from public.care_home_members
  where id = p_membership_id;

  return p_membership_id;
end;
$$;

comment on function public.remove_care_home_member(uuid) is
  'Removes a staff member from a care home. Admins only. Prevents removing the last admin and self-removal.';

revoke execute on function public.get_care_home_staff(uuid) from public;
revoke execute on function public.add_care_home_member(uuid, text, text) from public;
revoke execute on function public.update_care_home_member_role(uuid, text) from public;
revoke execute on function public.remove_care_home_member(uuid) from public;

grant execute on function public.get_care_home_staff(uuid) to authenticated;
grant execute on function public.add_care_home_member(uuid, text, text) to authenticated;
grant execute on function public.update_care_home_member_role(uuid, text) to authenticated;
grant execute on function public.remove_care_home_member(uuid) to authenticated;
