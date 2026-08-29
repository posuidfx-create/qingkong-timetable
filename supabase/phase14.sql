-- 晴空课表 Phase 14：聊天、私聊、Presence 与所属年级迁移。
-- 在已执行 supabase/schema.sql 的 Supabase 项目中直接执行此文件。

alter table public.profiles add column if not exists cohort_year integer;
alter table public.profiles drop constraint if exists profiles_cohort_year_check;
alter table public.profiles add constraint profiles_cohort_year_check
  check (cohort_year is null or cohort_year in (2024, 2025));

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_type text not null check (room_type in ('public', 'cohort_2024', 'cohort_2025')),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_room_created_at_idx
  on public.chat_messages (room_type, created_at);

create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint private_messages_different_participants check (sender_id <> receiver_id)
);
create index if not exists private_messages_participants_created_at_idx
  on public.private_messages (sender_id, receiver_id, created_at);
create index if not exists private_messages_unread_receiver_idx
  on public.private_messages (receiver_id, created_at) where read_at is null;

alter table public.chat_messages enable row level security;
alter table public.private_messages enable row level security;
grant select, insert, delete on public.chat_messages to authenticated;
grant select, insert, update on public.private_messages to authenticated;

-- The helper runs as the owner to avoid recursive profile RLS in policies.
create or replace function public.can_access_chat_room(target_room text, check_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id and (
      target_room = 'public'
      or role in ('admin', 'super_admin')
      or (target_room = 'cohort_2024' and cohort_year = 2024)
      or (target_room = 'cohort_2025' and cohort_year = 2025)
    )
  );
$$;
revoke all on function public.can_access_chat_room(text, uuid) from public;
grant execute on function public.can_access_chat_room(text, uuid) to authenticated;

drop policy if exists "Authorized users read chat rooms" on public.chat_messages;
create policy "Authorized users read chat rooms" on public.chat_messages for select to authenticated
  using (public.can_access_chat_room(room_type, auth.uid()));
drop policy if exists "Authorized users send chat messages" on public.chat_messages;
create policy "Authorized users send chat messages" on public.chat_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_access_chat_room(room_type, auth.uid()));
drop policy if exists "Admins delete chat messages" on public.chat_messages;
create policy "Admins delete chat messages" on public.chat_messages for delete to authenticated
  using (public.is_super_admin(auth.uid()) or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "Participants read private messages" on public.private_messages;
create policy "Participants read private messages" on public.private_messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());
drop policy if exists "Users send private messages" on public.private_messages;
create policy "Users send private messages" on public.private_messages for insert to authenticated
  with check (sender_id = auth.uid() and receiver_id <> auth.uid());
drop policy if exists "Receivers mark messages read" on public.private_messages;
create policy "Receivers mark messages read" on public.private_messages for update to authenticated
  using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

create or replace function public.guard_private_message_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or old.receiver_id <> auth.uid() then
    raise exception 'Only the receiver may mark a message as read';
  end if;
  if new.sender_id <> old.sender_id or new.receiver_id <> old.receiver_id
     or new.content <> old.content or old.read_at is not null or new.read_at is null then
    raise exception 'Only an unread message read_at value may be updated';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_private_message_update on public.private_messages;
create trigger guard_private_message_update before update on public.private_messages
  for each row execute procedure public.guard_private_message_update();

-- Supabase Realtime must publish both message tables. The duplicate-object
-- handler makes repeat execution safe after the first successful migration.
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.private_messages;
exception when duplicate_object then null;
end $$;
