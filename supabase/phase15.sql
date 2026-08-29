-- 晴空课表 Phase 15：角色 RPC 修复与管理员待办。
-- 先执行 schema.sql 与 phase14.sql；本文件可在现有数据上重复执行，不删除用户或聊天记录。

create or replace function public.is_admin_or_super(check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = check_user_id and role in ('admin', 'super_admin'));
$$;
revoke all on function public.is_admin_or_super(uuid) from public;
grant execute on function public.is_admin_or_super(uuid) to authenticated;

-- Direct client UPDATE of profiles.role stays blocked by guard_profile_role_update.
-- This narrow RPC is the only supported role-management path.
create or replace function public.set_user_role(target_user_id uuid, new_role text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare updated_profile public.profiles;
begin
  if auth.uid() is null or not public.is_super_admin(auth.uid()) then
    raise exception 'Only super administrators can change roles';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  if new_role not in ('user', 'admin') then
    raise exception 'Only user and admin roles may be assigned';
  end if;
  if exists (select 1 from public.profiles where id = target_user_id and role = 'super_admin') then
    raise exception 'An existing super administrator cannot be changed';
  end if;
  update public.profiles set role = new_role where id = target_user_id returning * into updated_profile;
  if not found then raise exception 'Target user not found'; end if;
  return updated_profile;
end;
$$;
revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

create table if not exists public.admin_todos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  target_type text not null check (target_type in ('all', 'cohort', 'users')),
  target_cohort integer check (target_cohort is null or target_cohort in (2024, 2025)),
  created_by uuid not null references public.profiles(id) on delete cascade,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_todos_target_shape check (
    (target_type = 'cohort' and target_cohort in (2024, 2025)) or
    (target_type in ('all', 'users') and target_cohort is null)
  )
);
create index if not exists admin_todos_target_idx on public.admin_todos (target_type, target_cohort, due_at);

create table if not exists public.admin_todo_assignments (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.admin_todos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (todo_id, user_id)
);
create index if not exists admin_todo_assignments_user_idx on public.admin_todo_assignments (user_id, todo_id);

create table if not exists public.admin_todo_completions (
  todo_id uuid not null references public.admin_todos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  primary key (todo_id, user_id)
);
create index if not exists admin_todo_completions_user_idx on public.admin_todo_completions (user_id, completed);

create or replace function public.can_access_admin_todo(target_id uuid, check_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_todos todo
    join public.profiles viewer on viewer.id = check_user_id
    where todo.id = target_id and (
      viewer.role in ('admin', 'super_admin') or todo.target_type = 'all' or
      (todo.target_type = 'cohort' and todo.target_cohort = viewer.cohort_year) or
      (todo.target_type = 'users' and exists (
        select 1 from public.admin_todo_assignments assignment
        where assignment.todo_id = todo.id and assignment.user_id = check_user_id
      ))
    )
  );
$$;
revoke all on function public.can_access_admin_todo(uuid, uuid) from public;
grant execute on function public.can_access_admin_todo(uuid, uuid) to authenticated;

create or replace function public.touch_admin_todo()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists touch_admin_todo on public.admin_todos;
create trigger touch_admin_todo before update on public.admin_todos for each row execute procedure public.touch_admin_todo();

create or replace function public.guard_admin_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admin_todos where id = new.todo_id and target_type = 'users') then
    raise exception 'Assignments are only valid for user-targeted todos';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_admin_assignment on public.admin_todo_assignments;
create trigger guard_admin_assignment before insert or update on public.admin_todo_assignments for each row execute procedure public.guard_admin_assignment();

create or replace function public.guard_admin_completion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() or not public.can_access_admin_todo(new.todo_id, auth.uid()) then
    raise exception 'Only the recipient can update their completion';
  end if;
  if tg_op = 'UPDATE' and (new.todo_id <> old.todo_id or new.user_id <> old.user_id) then
    raise exception 'Completion identity cannot be changed';
  end if;
  new.completed_at = case when new.completed then coalesce(new.completed_at, now()) else null end;
  return new;
end;
$$;
drop trigger if exists guard_admin_completion on public.admin_todo_completions;
create trigger guard_admin_completion before insert or update on public.admin_todo_completions for each row execute procedure public.guard_admin_completion();

alter table public.admin_todos enable row level security;
alter table public.admin_todo_assignments enable row level security;
alter table public.admin_todo_completions enable row level security;
grant select, insert, update, delete on public.admin_todos to authenticated;
grant select, insert, update, delete on public.admin_todo_assignments to authenticated;
grant select, insert, update on public.admin_todo_completions to authenticated;

drop policy if exists "Recipients read admin todos" on public.admin_todos;
create policy "Recipients read admin todos" on public.admin_todos for select to authenticated using (public.can_access_admin_todo(id, auth.uid()));
drop policy if exists "Admins create admin todos" on public.admin_todos;
create policy "Admins create admin todos" on public.admin_todos for insert to authenticated with check (created_by = auth.uid() and public.is_admin_or_super(auth.uid()));
drop policy if exists "Admins update admin todos" on public.admin_todos;
create policy "Admins update admin todos" on public.admin_todos for update to authenticated using (public.is_admin_or_super(auth.uid())) with check (public.is_admin_or_super(auth.uid()));
drop policy if exists "Admins delete admin todos" on public.admin_todos;
create policy "Admins delete admin todos" on public.admin_todos for delete to authenticated using (public.is_admin_or_super(auth.uid()));

drop policy if exists "Recipients read assignments" on public.admin_todo_assignments;
create policy "Recipients read assignments" on public.admin_todo_assignments for select to authenticated using (user_id = auth.uid() or public.is_admin_or_super(auth.uid()));
drop policy if exists "Admins manage assignments" on public.admin_todo_assignments;
create policy "Admins manage assignments" on public.admin_todo_assignments for all to authenticated using (public.is_admin_or_super(auth.uid())) with check (public.is_admin_or_super(auth.uid()));

drop policy if exists "Recipients read completions" on public.admin_todo_completions;
create policy "Recipients read completions" on public.admin_todo_completions for select to authenticated using (user_id = auth.uid() or public.is_admin_or_super(auth.uid()));
drop policy if exists "Recipients insert completions" on public.admin_todo_completions;
create policy "Recipients insert completions" on public.admin_todo_completions for insert to authenticated with check (user_id = auth.uid() and public.can_access_admin_todo(todo_id, auth.uid()));
drop policy if exists "Recipients update completions" on public.admin_todo_completions;
create policy "Recipients update completions" on public.admin_todo_completions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ begin alter publication supabase_realtime add table public.chat_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.private_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.admin_todos; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.admin_todo_completions; exception when duplicate_object then null; end $$;
