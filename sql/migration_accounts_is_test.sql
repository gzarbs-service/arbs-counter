-- Marks an account as a "test account". Surebets whose legs use a test
-- account are flagged as test surebets (see lib/test-account.ts), excluded
-- from worker/account stats, and synced to a separate "Тест аккаунты" tab
-- in the Google Sheet instead of the main one.

alter table public.accounts
  add column if not exists is_test boolean not null default false;
