-- ============================================================
-- KingdomCare OS -- Notification Read Receipts
-- ============================================================
-- Tracks per-user checked state for topbar resident notifications.
-- Operational alerts remain live data and are not hidden by this table.
-- ============================================================

create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz not null default now(),

  constraint notification_reads_user_key_unique unique (user_id, notification_key)
);

create index if not exists notification_reads_user_read_at_idx
  on public.notification_reads (user_id, read_at desc);

revoke all on table public.notification_reads from public;
revoke all on table public.notification_reads from anon;
revoke all on table public.notification_reads from authenticated;
grant select, insert, update on table public.notification_reads to authenticated;

alter table public.notification_reads enable row level security;

drop policy if exists "notification_reads: users can read own" on public.notification_reads;
drop policy if exists "notification_reads: users can insert own" on public.notification_reads;
drop policy if exists "notification_reads: users can update own" on public.notification_reads;

create policy "notification_reads: users can read own"
  on public.notification_reads
  for select
  using (auth.uid() = user_id);

create policy "notification_reads: users can insert own"
  on public.notification_reads
  for insert
  with check (auth.uid() = user_id);

create policy "notification_reads: users can update own"
  on public.notification_reads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
