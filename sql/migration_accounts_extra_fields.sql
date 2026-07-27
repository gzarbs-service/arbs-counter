-- Add login, email, and password columns to the accounts table.

alter table public.accounts
  add column if not exists login text,
  add column if not exists email text,
  add column if not exists password text;
