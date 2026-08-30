-- Phase 18: private chat-media storage and attachment metadata.
-- Run manually in the Supabase SQL Editor after phases 14-17. This migration never changes old messages.

alter table public.chat_messages add column if not exists message_type text not null default 'text';
alter table public.chat_messages add column if not exists attachment_path text;
alter table public.chat_messages add column if not exists attachment_name text;
alter table public.chat_messages add column if not exists attachment_mime text;
alter table public.chat_messages add column if not exists attachment_size bigint;
alter table public.chat_messages add column if not exists attachment_duration numeric;
alter table public.chat_messages add column if not exists attachment_width integer;
alter table public.chat_messages add column if not exists attachment_height integer;
alter table public.private_messages add column if not exists message_type text not null default 'text';
alter table public.private_messages add column if not exists attachment_path text;
alter table public.private_messages add column if not exists attachment_name text;
alter table public.private_messages add column if not exists attachment_mime text;
alter table public.private_messages add column if not exists attachment_size bigint;
alter table public.private_messages add column if not exists attachment_duration numeric;
alter table public.private_messages add column if not exists attachment_width integer;
alter table public.private_messages add column if not exists attachment_height integer;

alter table public.chat_messages alter column content set default '';
alter table public.private_messages alter column content set default '';
alter table public.chat_messages drop constraint if exists chat_messages_content_check;
alter table public.private_messages drop constraint if exists private_messages_content_check;

-- Text remains required for legacy text messages. Attachments retain a non-null content value (normally '').
alter table public.chat_messages add constraint chat_messages_attachment_shape check (
  content is not null and message_type in ('text', 'image', 'file', 'audio', 'video') and char_length(content) <= 2000 and
  (message_type <> 'image' or attachment_size <= 10485760) and
  (message_type <> 'file' or attachment_size <= 20971520) and
  (message_type <> 'audio' or attachment_size <= 20971520) and
  (message_type <> 'video' or attachment_size <= 52428800) and
  ((message_type = 'text' and attachment_path is null and char_length(trim(content)) between 1 and 2000) or
   (message_type <> 'text' and attachment_path is not null and attachment_name is not null and attachment_mime is not null and attachment_size is not null and attachment_size between 1 and 52428800))
);
alter table public.private_messages add constraint private_messages_attachment_shape check (
  content is not null and message_type in ('text', 'image', 'file', 'audio', 'video') and char_length(content) <= 2000 and
  (message_type <> 'image' or attachment_size <= 10485760) and
  (message_type <> 'file' or attachment_size <= 20971520) and
  (message_type <> 'audio' or attachment_size <= 20971520) and
  (message_type <> 'video' or attachment_size <= 52428800) and
  ((message_type = 'text' and attachment_path is null and char_length(trim(content)) between 1 and 2000) or
   (message_type <> 'text' and attachment_path is not null and attachment_name is not null and attachment_mime is not null and attachment_size is not null and attachment_size between 1 and 52428800))
);

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-media', 'chat-media', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

-- Storage path format is group/{room_type}/{sender_uuid}/{random_uuid.ext}
-- or private/{sorted_sender_uuid--receiver_uuid}/{sender_uuid}/{random_uuid.ext}.
-- These helpers accept no caller-controlled user id: the principal is always auth.uid().
drop function if exists public.can_access_chat_media_object(text, uuid);
drop function if exists public.can_upload_chat_media_object(text, uuid);
create or replace function public.can_access_chat_media_object(object_name text)
returns boolean language plpgsql stable security definer set search_path = pg_catalog, public, storage as $$
declare current_user_id uuid := auth.uid(); parts text[]; pair text[];
begin
  if current_user_id is null then return false; end if;
  parts := storage.foldername(object_name);
  if array_length(parts, 1) <> 3 then return false; end if;
  if parts[1] = 'group' then return public.can_access_chat_room(parts[2], current_user_id); end if;
  if parts[1] = 'private' then
    pair := string_to_array(parts[2], '--');
    return array_length(pair, 1) = 2 and (pair[1]::uuid = current_user_id or pair[2]::uuid = current_user_id);
  end if;
  return false;
exception when invalid_text_representation then return false;
end;
$$;
revoke all on function public.can_access_chat_media_object(text) from public;
grant execute on function public.can_access_chat_media_object(text) to authenticated;

create or replace function public.can_upload_chat_media_object(object_name text)
returns boolean language plpgsql stable security definer set search_path = pg_catalog, public, storage as $$
declare current_user_id uuid := auth.uid(); parts text[]; object_extension text := lower(storage.extension(object_name));
begin
  if current_user_id is null then return false; end if;
  if object_extension is null or object_extension <> all (array[
    'jpg', 'jpeg', 'png', 'webp', 'gif',
    'mp4', 'webm', 'mov',
    'mp3', 'm4a', 'wav', 'ogg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'
  ]) then return false; end if;
  parts := storage.foldername(object_name);
  if array_length(parts, 1) <> 3 or parts[3] <> current_user_id::text then return false; end if;
  if parts[1] = 'group' then return public.can_access_chat_room(parts[2], current_user_id); end if;
  if parts[1] = 'private' then return public.can_access_chat_media_object(object_name); end if;
  return false;
end;
$$;
revoke all on function public.can_upload_chat_media_object(text) from public;
grant execute on function public.can_upload_chat_media_object(text) to authenticated;

create or replace function public.validate_chat_media_attachment_binding()
returns trigger language plpgsql set search_path = pg_catalog, public, storage as $$
declare parts text[]; expected_pair text;
begin
  if new.message_type = 'text' then return new; end if;
  parts := storage.foldername(new.attachment_path);
  if array_length(parts, 1) <> 3 or parts[3] <> new.sender_id::text then
    raise exception 'Attachment path sender does not match message sender';
  end if;
  if tg_table_name = 'chat_messages' then
    if parts[1] <> 'group' or parts[2] <> new.room_type then
      raise exception 'Attachment path room does not match group message';
    end if;
  else
    expected_pair := least(new.sender_id::text, new.receiver_id::text) || '--' || greatest(new.sender_id::text, new.receiver_id::text);
    if parts[1] <> 'private' or parts[2] <> expected_pair then
      raise exception 'Attachment path participants do not match private message';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validate_chat_media_attachment_binding on public.chat_messages;
create trigger validate_chat_media_attachment_binding before insert or update of message_type, attachment_path, sender_id, room_type on public.chat_messages
  for each row execute function public.validate_chat_media_attachment_binding();
drop trigger if exists validate_private_media_attachment_binding on public.private_messages;
create trigger validate_private_media_attachment_binding before insert or update of message_type, attachment_path, sender_id, receiver_id on public.private_messages
  for each row execute function public.validate_chat_media_attachment_binding();

drop policy if exists "Chat media participants read" on storage.objects;
create policy "Chat media participants read" on storage.objects for select to authenticated
  using (bucket_id = 'chat-media' and public.can_access_chat_media_object(name));
drop policy if exists "Chat media users upload only own path" on storage.objects;
create policy "Chat media users upload only own path" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and public.can_upload_chat_media_object(name));
drop policy if exists "Chat media group admins remove" on storage.objects;
drop policy if exists "Chat media uploaders or group admins remove" on storage.objects;
create policy "Chat media uploaders or group admins remove" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and (
    (storage.foldername(name))[3] = auth.uid()::text or
    ((storage.foldername(name))[1] = 'group' and public.is_admin_or_super(auth.uid()))
  ));

-- Policy review checklist: Storage RLS uses profiles.cohort_year only through can_access_chat_room.
-- A signed URL is issued only after the above SELECT policy passes; it is not stored in either message table.
-- Bucket hard-limits every object to 50 MB. The database validates client-supplied message metadata,
-- while the browser enforces tighter per-kind limits. Storage does not natively enforce per-kind actual sizes.
