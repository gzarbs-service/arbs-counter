-- Run this SQL in the Supabase SQL Editor

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  role text not null default 'worker',
  created_at timestamp with time zone default now()
);

-- Accounts in play (bookmaker accounts tracked by each user)
create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  bookmaker text not null,
  account_number text not null,
  login text,
  email text,
  password text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

-- Surebets table
create table if not exists public.surebets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  match_name text not null,
  sport text not null,
  bank numeric not null,
  status text not null default 'pending',
  comment text,
  created_at timestamp with time zone default now(),
  settled_at timestamp with time zone
);

-- Legs of a surebet
create table if not exists public.legs (
  id uuid default gen_random_uuid() primary key,
  surebet_id uuid references public.surebets on delete cascade not null,
  account text not null,
  bookmaker text not null,
  market text not null,
  odds numeric not null,
  stake numeric not null,
  status text not null default 'pending',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.surebets enable row level security;
alter table public.legs enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile; admins can update all"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Accounts policies
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

-- Surebets policies
create policy "Users can view own surebets; admins can view all"
  on public.surebets for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can insert own surebets"
  on public.surebets for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own surebets; admins can update all"
  on public.surebets for update
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can delete own surebets; admins can delete all"
  on public.surebets for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Legs policies (ownership derived from parent surebet)
create policy "Users can view legs of own or all surebets if admin"
  on public.legs for select
  to authenticated
  using (
    exists (
      select 1 from public.surebets s
      where s.id = surebet_id
      and (
        s.user_id = auth.uid()
        or exists (
          select 1 from public.profiles where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy "Users can insert legs for own surebets"
  on public.legs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.surebets s
      where s.id = surebet_id and s.user_id = auth.uid()
    )
  );

create policy "Users can update legs for own surebets; admins can update all"
  on public.legs for update
  to authenticated
  using (
    exists (
      select 1 from public.surebets s
      where s.id = surebet_id
      and (
        s.user_id = auth.uid()
        or exists (
          select 1 from public.profiles where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy "Users can delete legs for own surebets; admins can delete all"
  on public.legs for delete
  to authenticated
  using (
    exists (
      select 1 from public.surebets s
      where s.id = surebet_id
      and (
        s.user_id = auth.uid()
        or exists (
          select 1 from public.profiles where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

-- Trigger: create profile row after user signs up via auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'worker')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Performance indexes (see also sql/migration_add_performance_indexes.sql
-- for applying this to an already-existing database).
create index if not exists idx_surebets_user_id on public.surebets (user_id);
create index if not exists idx_surebets_created_at on public.surebets (created_at desc);
create index if not exists idx_legs_surebet_id on public.legs (surebet_id);
