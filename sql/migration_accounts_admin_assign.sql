-- Allows an admin to create an account on behalf of any worker (assigning
-- ownership at creation time), and to reassign an existing account to a
-- different worker later. Previously the INSERT policy required
-- user_id = auth.uid(), so an admin could only ever create accounts owned
-- by themselves. The existing UPDATE policy already allows admins to
-- update any row, so reassignment via UPDATE needs no change.

drop policy if exists "Users can insert own accounts" on public.accounts;
create policy "Users can insert own accounts; admins can insert for anyone"
  on public.accounts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );
