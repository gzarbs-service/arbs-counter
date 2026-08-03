-- Run once in the Supabase SQL Editor.
-- Adds indexes on foreign keys / commonly-filtered columns to keep queries
-- fast as the number of surebets grows. Safe to run multiple times
-- (IF NOT EXISTS) and does not change any existing data or app behavior.

create index if not exists idx_surebets_user_id on public.surebets (user_id);
create index if not exists idx_surebets_created_at on public.surebets (created_at desc);
create index if not exists idx_legs_surebet_id on public.legs (surebet_id);
