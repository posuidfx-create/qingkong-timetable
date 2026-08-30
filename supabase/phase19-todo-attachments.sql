-- 晴空课表 Phase 19：管理员待办附件。
-- 依赖 phase15.sql（admin_todos、can_access_admin_todo、is_admin_or_super）。
-- Phase 15 的既有模型：所有 admin / super_admin 共同管理全部管理员待办，
-- 并非仅管理自己创建的待办；本 migration 的写入和删除策略严格沿用该模型。
-- 请在 Supabase SQL Editor 审核后手动执行；本文件不会由前端自动执行。

insert into storage.buckets (id, name, public, file_size_limit)
values ('todo-attachments', 'todo-attachments', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

create table if not exists public.todo_attachments (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.admin_todos(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  attachment_path text not null unique,
  attachment_name text not null check (char_length(trim(attachment_name)) between 1 and 120),
  attachment_mime text not null check (char_length(attachment_mime) between 1 and 160),
  attachment_size bigint not null check (attachment_size between 1 and 20971520),
  attachment_kind text not null check (attachment_kind in ('image', 'file')),
  created_at timestamptz not null default now()
);
create index if not exists todo_attachments_todo_idx on public.todo_attachments (todo_id, created_at);

create or replace function public.guard_todo_attachment()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, storage as $$
declare path_parts text[];
begin
  path_parts := storage.foldername(new.attachment_path);
  if array_length(path_parts, 1) <> 3 or path_parts[1] <> 'todo'
     or path_parts[2] <> new.todo_id::text or path_parts[3] <> new.uploader_id::text then
    raise exception 'Todo attachment path does not match its todo and uploader';
  end if;
  if tg_op = 'UPDATE' and (new.todo_id <> old.todo_id or new.uploader_id <> old.uploader_id or new.attachment_path <> old.attachment_path) then
    raise exception 'Todo attachment identity cannot be changed';
  end if;
  if tg_op = 'INSERT' then
    -- Serialize concurrent inserts for this todo before counting, so five is a hard per-todo limit.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.todo_id::text));
    if (select count(*) from public.todo_attachments where todo_id = new.todo_id) >= 5 then
      raise exception 'A todo may contain at most five attachments';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_todo_attachment on public.todo_attachments;
create trigger guard_todo_attachment before insert or update on public.todo_attachments for each row execute procedure public.guard_todo_attachment();

create or replace function public.can_access_todo_attachment(object_name text)
returns boolean language sql stable security definer set search_path = pg_catalog, public, storage as $$
  select auth.uid() is not null and exists (
    select 1 from public.todo_attachments attachment
    join public.admin_todos todo on todo.id = attachment.todo_id
    where attachment.attachment_path = object_name and (
      public.can_access_admin_todo(attachment.todo_id, auth.uid()) or todo.created_by = auth.uid()
    )
  );
$$;

create or replace function public.can_read_todo_attachment(todo_attachment_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public, storage as $$
  select auth.uid() is not null and exists (
    select 1 from public.todo_attachments attachment
    join public.admin_todos todo on todo.id = attachment.todo_id
    where attachment.id = todo_attachment_id and (
      public.can_access_admin_todo(attachment.todo_id, auth.uid()) or todo.created_by = auth.uid()
    )
  );
$$;

create or replace function public.can_upload_todo_attachment(object_name text)
returns boolean language plpgsql stable security definer set search_path = pg_catalog, public, storage as $$
declare path_parts text[]; extension text;
begin
  path_parts := storage.foldername(object_name);
  extension := lower(storage.extension(object_name));
  return auth.uid() is not null
    and array_length(path_parts, 1) = 3
    and path_parts[1] = 'todo'
    and path_parts[3] = auth.uid()::text
    and extension in ('jpg','jpeg','png','webp','gif','pdf','doc','docx','xls','xlsx','ppt','pptx','txt','zip')
    -- Phase 15 grants every admin/super_admin shared management of every admin_todo.
    and public.is_admin_or_super(auth.uid())
    and exists (select 1 from public.admin_todos where id = path_parts[2]::uuid);
exception when invalid_text_representation then return false;
end;
$$;

create or replace function public.can_manage_todo_attachment(object_name text)
returns boolean language sql stable security definer set search_path = pg_catalog, public, storage as $$
  -- Shared-management model: any admin/super_admin may remove attachments of any admin_todo.
  select auth.uid() is not null and public.is_admin_or_super(auth.uid()) and exists (
    select 1 from public.todo_attachments attachment where attachment.attachment_path = object_name
  );
$$;

revoke all on function public.can_access_todo_attachment(text) from public;
revoke all on function public.can_upload_todo_attachment(text) from public;
revoke all on function public.can_manage_todo_attachment(text) from public;
revoke all on function public.can_read_todo_attachment(uuid) from public;
grant execute on function public.can_access_todo_attachment(text), public.can_upload_todo_attachment(text), public.can_manage_todo_attachment(text), public.can_read_todo_attachment(uuid) to authenticated;

alter table public.todo_attachments enable row level security;
grant select, insert, delete on public.todo_attachments to authenticated;
drop policy if exists "Recipients read todo attachments" on public.todo_attachments;
create policy "Recipients read todo attachments" on public.todo_attachments for select to authenticated using (public.can_read_todo_attachment(id));
drop policy if exists "Admins insert todo attachments" on public.todo_attachments;
-- Shared-management model: any admin/super_admin can add attachments to any existing admin_todo.
create policy "Admins insert todo attachments" on public.todo_attachments for insert to authenticated with check (
  uploader_id = auth.uid()
  and public.is_admin_or_super(auth.uid())
  and exists (select 1 from public.admin_todos todo where todo.id = todo_id)
);
drop policy if exists "Admins delete todo attachments" on public.todo_attachments;
-- Shared-management model: any admin/super_admin can remove attachments from any admin_todo.
create policy "Admins delete todo attachments" on public.todo_attachments for delete to authenticated using (public.is_admin_or_super(auth.uid()));

drop policy if exists "Todo recipients read media" on storage.objects;
create policy "Todo recipients read media" on storage.objects for select to authenticated using (bucket_id = 'todo-attachments' and public.can_access_todo_attachment(name));
drop policy if exists "Admins upload todo media" on storage.objects;
create policy "Admins upload todo media" on storage.objects for insert to authenticated with check (bucket_id = 'todo-attachments' and public.can_upload_todo_attachment(name));
drop policy if exists "Admins delete todo media" on storage.objects;
create policy "Admins delete todo media" on storage.objects for delete to authenticated using (bucket_id = 'todo-attachments' and public.can_manage_todo_attachment(name));

-- Security review checklist:
-- * Bucket is private and object paths must be todo/{todoId}/{uploaderId}/{uuid.ext}.
-- * Recipients can only read attachments for admin_todos visible through Phase 15 RLS.
-- * Phase 15 deliberately makes all admin/super_admin users shared managers of every admin_todo;
--   they can upload/delete its attachments, while normal recipients never receive write access.
-- * The 20 MB bucket limit and attachment_size constraint are complementary; clients must not be trusted for metadata alone.
