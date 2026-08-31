-- Phase 24A: private learning records and learning materials.
-- Review in Supabase SQL Editor before running. This migration is intentionally transactional.

begin;

create table if not exists public.learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  title text,
  course_name text,
  course_key text,
  record_type text not null,
  content text,
  mood_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_records_type check (record_type in ('daily', 'class', 'note', 'achievement')),
  constraint learning_records_title_length check (title is null or char_length(trim(title)) between 1 and 120),
  constraint learning_records_course_length check (course_name is null or char_length(trim(course_name)) between 1 and 160),
  constraint learning_records_course_key_length check (course_key is null or char_length(course_key) <= 160),
  constraint learning_records_content_length check (content is null or char_length(content) <= 20000),
  constraint learning_records_mood_length check (mood_note is null or char_length(mood_note) <= 500),
  constraint learning_records_class_course check (record_type <> 'class' or nullif(trim(course_name), '') is not null)
);

create index if not exists learning_records_user_date_idx on public.learning_records (user_id, record_date desc, created_at desc);
create index if not exists learning_records_user_course_idx on public.learning_records (user_id, course_name) where course_name is not null;

create or replace function public.set_learning_record_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists learning_records_set_updated_at on public.learning_records;
create trigger learning_records_set_updated_at before update on public.learning_records
for each row execute function public.set_learning_record_updated_at();

create or replace function public.guard_learning_record_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
begin
  if auth.role() = 'authenticated' and exists (
    select 1
    from storage.objects object_row
    where object_row.bucket_id = any (array[
      'learning-materials-images',
      'learning-materials-documents',
      'learning-materials-audio'
    ]::text[])
      and storage.foldername(object_row.name) = array[
        'learning',
        old.user_id::text,
        old.id::text
      ]::text[]
  ) then
    raise exception 'Learning record still contains Storage objects';
  end if;
  return old;
end;
$$;

drop trigger if exists learning_records_guard_delete on public.learning_records;
create trigger learning_records_guard_delete before delete on public.learning_records
for each row execute function public.guard_learning_record_delete();

create table if not exists public.learning_assets (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.learning_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null,
  original_name text not null,
  mime_type text not null,
  file_size bigint not null,
  storage_bucket text not null,
  storage_path text not null,
  sort_order integer not null default 0,
  processing_status text not null default 'uploaded',
  extracted_text text,
  analysis_json jsonb,
  created_at timestamptz not null default now(),
  constraint learning_assets_type check (asset_type in ('image', 'document', 'audio')),
  constraint learning_assets_status check (processing_status in ('uploaded', 'pending', 'processing', 'completed', 'failed')),
  constraint learning_assets_bucket check (storage_bucket in ('learning-materials-images', 'learning-materials-documents', 'learning-materials-audio')),
  constraint learning_assets_name check (char_length(trim(original_name)) between 1 and 255),
  constraint learning_assets_mime check (char_length(trim(mime_type)) between 1 and 160),
  constraint learning_assets_sort check (sort_order >= 0),
  constraint learning_assets_size check (
    file_size > 0 and (
      (asset_type = 'image' and file_size <= 15728640) or
      (asset_type = 'document' and file_size <= 26214400) or
      (asset_type = 'audio' and file_size <= 52428800)
    )
  ),
  constraint learning_assets_storage_object unique (storage_bucket, storage_path)
);

create index if not exists learning_assets_record_order_idx on public.learning_assets (record_id, sort_order, created_at);
create index if not exists learning_assets_user_idx on public.learning_assets (user_id, created_at desc);

create or replace function public.learning_material_bucket_for_extension(object_name text)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog, storage
as $$
  select case lower(storage.extension(object_name))
    when 'jpg' then 'learning-materials-images'
    when 'jpeg' then 'learning-materials-images'
    when 'png' then 'learning-materials-images'
    when 'webp' then 'learning-materials-images'
    when 'heic' then 'learning-materials-images'
    when 'heif' then 'learning-materials-images'
    when 'pdf' then 'learning-materials-documents'
    when 'txt' then 'learning-materials-documents'
    when 'doc' then 'learning-materials-documents'
    when 'docx' then 'learning-materials-documents'
    when 'xls' then 'learning-materials-documents'
    when 'xlsx' then 'learning-materials-documents'
    when 'ppt' then 'learning-materials-documents'
    when 'pptx' then 'learning-materials-documents'
    when 'mp3' then 'learning-materials-audio'
    when 'm4a' then 'learning-materials-audio'
    when 'wav' then 'learning-materials-audio'
    when 'webm' then 'learning-materials-audio'
    when 'ogg' then 'learning-materials-audio'
    else null
  end;
$$;

create or replace function public.guard_learning_asset()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  record_owner uuid;
  path_parts text[];
  actual_file_size bigint;
begin
  if tg_op = 'UPDATE' and (new.record_id, new.user_id, new.storage_bucket, new.storage_path) is distinct from (old.record_id, old.user_id, old.storage_bucket, old.storage_path) then
    raise exception 'Learning asset ownership and path are immutable';
  end if;

  select lr.user_id into record_owner from public.learning_records lr where lr.id = new.record_id;
  if record_owner is null or record_owner <> new.user_id then
    raise exception 'Learning asset owner does not match record owner';
  end if;

  path_parts := storage.foldername(new.storage_path);
  if coalesce(array_length(path_parts, 1), 0) <> 3
     or path_parts[1] <> 'learning'
     or path_parts[2] <> new.user_id::text
     or path_parts[3] <> new.record_id::text then
    raise exception 'Learning asset path does not match owner and record';
  end if;
  if new.storage_bucket <> public.learning_material_bucket_for_extension(new.storage_path)
     or (new.asset_type = 'image' and new.storage_bucket <> 'learning-materials-images')
     or (new.asset_type = 'document' and new.storage_bucket <> 'learning-materials-documents')
     or (new.asset_type = 'audio' and new.storage_bucket <> 'learning-materials-audio') then
    raise exception 'Learning asset bucket does not match its type and extension';
  end if;

  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and (
      new.processing_status <> 'uploaded'
      or new.extracted_text is not null
      or new.analysis_json is not null
    ) then
      raise exception 'Authenticated clients cannot set learning asset processing results';
    end if;
    if tg_op = 'UPDATE' and (
      new.processing_status is distinct from old.processing_status
      or new.extracted_text is distinct from old.extracted_text
      or new.analysis_json is distinct from old.analysis_json
    ) then
      raise exception 'Authenticated clients cannot update learning asset processing results';
    end if;
  end if;

  select nullif(object_row.metadata ->> 'size', '')::bigint
    into actual_file_size
  from storage.objects object_row
  where object_row.bucket_id = new.storage_bucket
    and object_row.name = new.storage_path;

  if not found then
    raise exception 'Learning material Storage object does not exist';
  end if;
  if actual_file_size is null or actual_file_size <> new.file_size then
    raise exception 'Learning asset file size does not match the Storage object';
  end if;

  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext(new.record_id::text));
    if (select count(*) from public.learning_assets la where la.record_id = new.record_id) >= 20 then
      raise exception 'A learning record can contain at most 20 assets';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists learning_assets_guard on public.learning_assets;
create trigger learning_assets_guard before insert or update on public.learning_assets
for each row execute function public.guard_learning_asset();

alter table public.learning_records enable row level security;
alter table public.learning_assets enable row level security;

drop policy if exists "Users read own learning records" on public.learning_records;
create policy "Users read own learning records" on public.learning_records for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users create own learning records" on public.learning_records;
create policy "Users create own learning records" on public.learning_records for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users update own learning records" on public.learning_records;
create policy "Users update own learning records" on public.learning_records for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users delete own learning records" on public.learning_records;
create policy "Users delete own learning records" on public.learning_records for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Users read own learning assets" on public.learning_assets;
create policy "Users read own learning assets" on public.learning_assets for select to authenticated using (
  user_id = auth.uid() and exists (select 1 from public.learning_records lr where lr.id = record_id and lr.user_id = auth.uid())
);
drop policy if exists "Users create own learning assets" on public.learning_assets;
create policy "Users create own learning assets" on public.learning_assets for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.learning_records lr where lr.id = record_id and lr.user_id = auth.uid())
);
drop policy if exists "Users update own learning assets" on public.learning_assets;
create policy "Users update own learning assets" on public.learning_assets for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users delete own learning assets" on public.learning_assets;
create policy "Users delete own learning assets" on public.learning_assets for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.learning_records to authenticated;
revoke insert, update on public.learning_assets from authenticated;
grant select, delete on public.learning_assets to authenticated;
grant insert (id, record_id, user_id, asset_type, original_name, mime_type, file_size, storage_bucket, storage_path, sort_order) on public.learning_assets to authenticated;
grant update (original_name, sort_order) on public.learning_assets to authenticated;
grant select on public.learning_records to service_role;
grant select on public.learning_assets to service_role;
grant update (processing_status, extracted_text, analysis_json) on public.learning_assets to service_role;

-- Storage RLS is evaluated before the backend has written its final metadata.size.
-- Separate private buckets therefore provide the reliable, Storage-native per-category hard limits.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('learning-materials-images', 'learning-materials-images', false, 15728640),
  ('learning-materials-documents', 'learning-materials-documents', false, 26214400),
  ('learning-materials-audio', 'learning-materials-audio', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create or replace function public.can_manage_learning_material(object_name text, object_bucket text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
  select auth.uid() is not null
    and object_bucket = public.learning_material_bucket_for_extension(object_name)
    and coalesce(array_length(storage.foldername(object_name), 1), 0) = 3
    and (storage.foldername(object_name))[1] = 'learning'
    and (storage.foldername(object_name))[2] = auth.uid()::text
    and exists (
      select 1 from public.learning_records lr
      where lr.id::text = (storage.foldername(object_name))[3]
        and lr.user_id = auth.uid()
    );
$$;

create or replace function public.can_upload_learning_material(object_name text, object_bucket text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
  -- This preflight guard bounds orphan objects even when a malicious client never writes learning_assets.
  -- It is intentionally separate from the stricter advisory-locked metadata trigger.
  select public.can_manage_learning_material(object_name, object_bucket)
    and (
      select count(*)
      from storage.objects existing_object
      where existing_object.bucket_id = any (array[
        'learning-materials-images',
        'learning-materials-documents',
        'learning-materials-audio'
      ]::text[])
        and storage.foldername(existing_object.name) = storage.foldername(object_name)
    ) < 20;
$$;

create or replace function public.can_read_learning_material(object_name text, object_bucket text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
  select public.can_manage_learning_material(object_name, object_bucket);
$$;

revoke all on function public.can_manage_learning_material(text, text) from public;
revoke all on function public.can_upload_learning_material(text, text) from public;
revoke all on function public.can_read_learning_material(text, text) from public;
grant execute on function public.can_manage_learning_material(text, text) to authenticated;
grant execute on function public.can_upload_learning_material(text, text) to authenticated;
grant execute on function public.can_read_learning_material(text, text) to authenticated;

drop policy if exists "Users upload own learning materials" on storage.objects;
create policy "Users upload own learning materials" on storage.objects for insert to authenticated
with check (
  bucket_id = any (array['learning-materials-images', 'learning-materials-documents', 'learning-materials-audio']::text[])
  and public.can_upload_learning_material(name, bucket_id)
);
drop policy if exists "Users read own learning materials" on storage.objects;
create policy "Users read own learning materials" on storage.objects for select to authenticated
using (
  bucket_id = any (array['learning-materials-images', 'learning-materials-documents', 'learning-materials-audio']::text[])
  and public.can_read_learning_material(name, bucket_id)
);
drop policy if exists "Users delete own learning materials" on storage.objects;
create policy "Users delete own learning materials" on storage.objects for delete to authenticated
using (
  bucket_id = any (array['learning-materials-images', 'learning-materials-documents', 'learning-materials-audio']::text[])
  and public.can_manage_learning_material(name, bucket_id)
);

commit;
