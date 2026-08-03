-- Notification feed for auto-detected surebet errors: powers the bell icon
-- in the top nav (unread count + list for admins) and the Telegram alert
-- sent from lib/notify-error.ts. One row per surebet that has ever had an
-- error detected (unique on surebet_id) so re-saving the same surebet does
-- not spam duplicate notifications/Telegram messages.

create table if not exists error_notifications (
  id uuid primary key default gen_random_uuid(),
  surebet_id uuid not null references surebets(id) on delete cascade,
  worker_id uuid not null references profiles(id) on delete cascade,
  worker_username text not null,
  match_name text not null,
  reasons text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (surebet_id)
);

create index if not exists error_notifications_is_read_idx on error_notifications (is_read);

alter table error_notifications enable row level security;

drop policy if exists "Authenticated users can insert notifications" on error_notifications;
create policy "Authenticated users can insert notifications"
  on error_notifications for insert
  to authenticated
  with check (true);

drop policy if exists "Admins can view notifications" on error_notifications;
create policy "Admins can view notifications"
  on error_notifications for select
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update notifications" on error_notifications;
create policy "Admins can update notifications"
  on error_notifications for update
  to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
