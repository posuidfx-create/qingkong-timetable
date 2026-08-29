-- 晴空课表：认证资料与角色权限。
-- 在 Supabase SQL Editor 一次执行。前端只能使用 anon key，绝不可暴露 service_role key。

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(trim(username)) between 1 and 40),
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER avoids recursive RLS when a policy needs to ask whether the
-- current user is a super administrator. Do not grant execute to anon.
create or replace function public.is_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin(uuid) from public;
grant execute on function public.is_super_admin(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      '同学'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- A user may update their own display fields, but role updates are additionally
-- guarded here. Only a super_admin may change a non-super-admin's role; nobody
-- may change their own role or alter a super_admin role through the client API.
create or replace function public.guard_profile_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null or not public.is_super_admin(auth.uid()) then
      raise exception 'Only super administrators can change roles';
    end if;
    if old.id = auth.uid() or old.role = 'super_admin' then
      raise exception 'A super administrator role cannot be changed here';
    end if;
    if new.role not in ('user', 'admin') then
      raise exception 'Only user and admin roles can be assigned here';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role_update on public.profiles;
create trigger guard_profile_role_update
  before update on public.profiles
  for each row execute procedure public.guard_profile_role_update();

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Users and super admins can update profiles" on public.profiles;
create policy "Users and super admins can update profiles"
  on public.profiles for update to authenticated
  using (auth.uid() = id or public.is_super_admin(auth.uid()))
  with check (auth.uid() = id or public.is_super_admin(auth.uid()));

-- Bootstrap exactly one account after it has registered. Replace the placeholder
-- with that account's email in SQL Editor; do not put an email in frontend code.
-- update public.profiles
-- set role = 'super_admin'
-- where id = (select id from auth.users where email = 'your-email@example.com');

-- Phase 14 (chat) is intentionally supplied as a repeatable database upgrade:
-- execute supabase/phase14.sql after this schema in SQL Editor.
