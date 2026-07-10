create or replace function public.get_current_user_access()
returns table (
  user_id uuid,
  email text,
  full_name text,
  membership_id uuid,
  care_home_id uuid,
  care_home_name text,
  role text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    current_auth.user_id,
    coalesce(p.email, nullif(auth.jwt() ->> 'email', '')) as email,
    p.full_name,
    m.id as membership_id,
    m.care_home_id,
    c.name as care_home_name,
    m.role
  from (select auth.uid() as user_id) current_auth
  left join public.profiles p on p.id = current_auth.user_id
  left join public.care_home_members m on m.user_id = current_auth.user_id
  left join public.care_homes c on c.id = m.care_home_id
  where current_auth.user_id is not null
  order by m.created_at asc nulls last
  limit 1
$$;

comment on function public.get_current_user_access() is
  'Returns the current authenticated user access context in one round trip using invoker RLS.';

grant execute on function public.get_current_user_access() to authenticated;
