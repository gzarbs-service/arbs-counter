-- Run once in the Supabase SQL Editor to add the accounts table.

create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  bookmaker text not null,
  account_number text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table public.accounts enable row level security;

create policy "Users can view own accounts; admins can view all"
  on public.accounts for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can insert own accounts"
  on public.accounts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own accounts; admins can update all"
  on public.accounts for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can delete own accounts; admins can delete all"
  on public.accounts for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );
