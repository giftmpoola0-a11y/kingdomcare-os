revoke all on table public.residents from public;
revoke all on table public.residents from anon;
revoke all on table public.residents from authenticated;

grant select, insert, update on table public.residents to authenticated;
