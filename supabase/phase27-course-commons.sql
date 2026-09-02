-- Phase 27: Course Commons publishing layer. Private Learning RLS remains unchanged.
begin;

create table if not exists public.course_contributions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '学习者',
  course_key text not null,
  course_name_snapshot text not null,
  course_type_snapshot text,
  source_record_id uuid references public.learning_records(id) on delete set null,
  title text not null,
  content text not null default '',
  contribution_type text not null default 'note',
  language text not null default 'zh-CN',
  visibility text not null default 'course',
  status text not null default 'published',
  ai_summary text,
  ai_key_points jsonb not null default '[]'::jsonb,
  ai_suggested_review text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_contributions_course_key check (char_length(trim(course_key)) between 1 and 160),
  constraint course_contributions_course_name check (char_length(trim(course_name_snapshot)) between 1 and 160),
  constraint course_contributions_title check (char_length(trim(title)) between 1 and 160),
  constraint course_contributions_content check (char_length(content) <= 30000),
  constraint course_contributions_type check (contribution_type in ('note', 'knowledge', 'resource')),
  constraint course_contributions_visibility check (visibility in ('course', 'private')),
  constraint course_contributions_status check (status in ('published', 'hidden', 'deleted')),
  constraint course_contributions_ai_points check (jsonb_typeof(ai_key_points) = 'array')
);

create index if not exists course_contributions_course_feed_idx on public.course_contributions (course_key, published_at desc) where visibility = 'course' and status = 'published';
create index if not exists course_contributions_author_idx on public.course_contributions (author_id, updated_at desc);
create unique index if not exists course_contributions_source_active_uidx on public.course_contributions (source_record_id) where source_record_id is not null and status <> 'deleted';

create table if not exists public.course_contribution_assets (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.course_contributions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  source_asset_id uuid references public.learning_assets(id) on delete set null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  storage_bucket text not null default 'course-contributions',
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint course_contribution_assets_name check (char_length(trim(file_name)) between 1 and 255),
  constraint course_contribution_assets_mime check (char_length(trim(mime_type)) between 1 and 160),
  constraint course_contribution_assets_size check (file_size between 1 and 52428800),
  constraint course_contribution_assets_bucket check (storage_bucket = 'course-contributions'),
  constraint course_contribution_assets_object unique (storage_bucket, storage_path)
);
create index if not exists course_contribution_assets_contribution_idx on public.course_contribution_assets (contribution_id, created_at);

create table if not exists public.course_contribution_bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  contribution_id uuid not null references public.course_contributions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, contribution_id)
);

create table if not exists public.course_contribution_reports (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.course_contributions(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  constraint course_contribution_reports_reason check (reason in ('inappropriate', 'copyright', 'spam', 'other')),
  constraint course_contribution_reports_status check (status in ('open', 'resolved', 'dismissed')),
  constraint course_contribution_reports_details check (details is null or char_length(details) <= 1000),
  unique (contribution_id, reporter_id)
);

create table if not exists public.course_commons_analyses (
  course_key text primary key,
  analysis_json jsonb,
  source_fingerprint text,
  processing_status text not null default 'uploaded',
  updated_at timestamptz not null default now(),
  constraint course_commons_analyses_status check (processing_status in ('uploaded', 'processing', 'completed', 'failed'))
);

alter table public.learning_records
  add column if not exists source_contribution_id uuid references public.course_contributions(id) on delete set null,
  add column if not exists source_author_name_snapshot text,
  add column if not exists source_title_snapshot text,
  add column if not exists quoted_at timestamptz;

create or replace function public.guard_learning_quote_attribution()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.role() = 'authenticated' and coalesce(current_setting('app.course_commons_quote', true), '') <> '1' then
    if (tg_op = 'INSERT' and (new.source_contribution_id is not null or new.source_author_name_snapshot is not null or new.source_title_snapshot is not null or new.quoted_at is not null))
      or (tg_op = 'UPDATE' and (new.source_contribution_id is distinct from old.source_contribution_id or new.source_author_name_snapshot is distinct from old.source_author_name_snapshot or new.source_title_snapshot is distinct from old.source_title_snapshot or new.quoted_at is distinct from old.quoted_at)) then
      raise exception 'Learning quote attribution is managed by the quote operation';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists learning_records_guard_quote_attribution on public.learning_records;
create trigger learning_records_guard_quote_attribution before insert or update on public.learning_records for each row execute function public.guard_learning_quote_attribution();

create or replace function public.set_course_commons_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists course_contributions_set_updated_at on public.course_contributions;
create trigger course_contributions_set_updated_at before update on public.course_contributions for each row execute function public.set_course_commons_updated_at();

create or replace function public.guard_course_contribution()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare source_owner uuid; source_course text;
begin
  if tg_op = 'UPDATE' and auth.role() = 'authenticated' then
    if new.author_id is distinct from old.author_id or new.course_key is distinct from old.course_key or new.source_record_id is distinct from old.source_record_id or new.author_name is distinct from old.author_name then
      raise exception 'Course contribution identity is immutable';
    end if;
  end if;
  if new.source_record_id is not null then
    select user_id, course_key into source_owner, source_course from public.learning_records where id = new.source_record_id;
    if source_owner is distinct from new.author_id or nullif(trim(source_course), '') is null or source_course is distinct from new.course_key then raise exception 'Invalid private source record'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_course_contribution_asset()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, storage as $$
declare contribution_owner uuid; parts text[]; object_size bigint;
begin
  select author_id into contribution_owner from public.course_contributions where id = new.contribution_id;
  if contribution_owner is null or contribution_owner is distinct from new.author_id then raise exception 'Invalid contribution asset owner'; end if;
  parts := storage.foldername(new.storage_path);
  if array_length(parts, 1) <> 3 or parts[1] <> 'course' or parts[2] <> new.contribution_id::text or parts[3] <> new.author_id::text then
    raise exception 'Invalid contribution asset path';
  end if;
  select nullif(metadata ->> 'size', '')::bigint into object_size from storage.objects where bucket_id = 'course-contributions' and name = new.storage_path;
  if object_size is null or object_size is distinct from new.file_size then raise exception 'Shared Storage object missing or size mismatch'; end if;
  return new;
end;
$$;
drop trigger if exists course_contributions_guard on public.course_contributions;
create trigger course_contributions_guard before insert or update on public.course_contributions for each row execute function public.guard_course_contribution();
drop trigger if exists course_contribution_assets_guard on public.course_contribution_assets;
create trigger course_contribution_assets_guard before insert or update on public.course_contribution_assets for each row execute function public.guard_course_contribution_asset();

alter table public.course_contributions enable row level security;
alter table public.course_contribution_assets enable row level security;
alter table public.course_contribution_bookmarks enable row level security;
alter table public.course_contribution_reports enable row level security;
alter table public.course_commons_analyses enable row level security;

create policy "Authenticated read published course contributions" on public.course_contributions for select to authenticated using ((visibility = 'course' and status = 'published') or author_id = auth.uid());
create policy "Authors create course contributions" on public.course_contributions for insert to authenticated with check (author_id = auth.uid());
create policy "Authors update course contributions" on public.course_contributions for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors delete course contributions" on public.course_contributions for delete to authenticated using (author_id = auth.uid());
create policy "Authenticated read shared contribution assets" on public.course_contribution_assets for select to authenticated using (author_id = auth.uid() or exists (select 1 from public.course_contributions c where c.id = contribution_id and c.visibility = 'course' and c.status = 'published'));
create policy "Users read own bookmarks" on public.course_contribution_bookmarks for select to authenticated using (user_id = auth.uid());
create policy "Users create own bookmarks" on public.course_contribution_bookmarks for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.course_contributions c where c.id = contribution_id and c.visibility = 'course' and c.status = 'published'));
create policy "Users delete own bookmarks" on public.course_contribution_bookmarks for delete to authenticated using (user_id = auth.uid());
create policy "Users read own reports" on public.course_contribution_reports for select to authenticated using (reporter_id = auth.uid());
create policy "Users create own reports" on public.course_contribution_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Authenticated read commons analyses" on public.course_commons_analyses for select to authenticated using (true);

revoke all on public.course_contributions, public.course_contribution_assets, public.course_contribution_bookmarks, public.course_contribution_reports, public.course_commons_analyses from anon, authenticated;
grant select on public.course_contributions, public.course_contribution_assets, public.course_commons_analyses to authenticated;
grant select, insert, update, delete on public.course_contributions, public.course_contribution_assets, public.course_contribution_bookmarks, public.course_contribution_reports, public.course_commons_analyses to service_role;

create or replace function public.publish_course_contribution(p_source_record_id uuid, new_title text, new_content text, new_type text, new_language text)
returns public.course_contributions language plpgsql security definer set search_path = pg_catalog, public as $$
declare source public.learning_records; profile_name text; result public.course_contributions; source_analysis jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into source from public.learning_records where id = p_source_record_id and user_id = auth.uid();
  if source.id is null or nullif(trim(source.course_key), '') is null then raise exception 'A stable course is required'; end if;
  if nullif(trim(new_title), '') is null then raise exception 'Title is required'; end if;
  select coalesce(nullif(trim(username), ''), '学习者') into profile_name from public.profiles where id = auth.uid();
  source_analysis := source.analysis_json;
  insert into public.course_contributions (author_id, author_name, course_key, course_name_snapshot, source_record_id, title, content, contribution_type, language, ai_summary, ai_key_points, ai_suggested_review)
  values (auth.uid(), profile_name, source.course_key, coalesce(nullif(trim(source.course_name), ''), source.course_key), source.id, trim(new_title), coalesce(new_content, ''), new_type, coalesce(nullif(trim(new_language), ''), 'zh-CN'), source_analysis ->> 'summary', coalesce(source_analysis -> 'keyPoints', '[]'::jsonb), source_analysis ->> 'suggestedReview')
  on conflict (source_record_id) where source_record_id is not null and status <> 'deleted' do update set title = excluded.title, content = excluded.content, contribution_type = excluded.contribution_type, language = excluded.language, ai_summary = excluded.ai_summary, ai_key_points = excluded.ai_key_points, ai_suggested_review = excluded.ai_suggested_review, visibility = 'course', status = 'published', published_at = now()
  returning * into result;
  return result;
end;
$$;

create or replace function public.edit_course_contribution(p_contribution_id uuid, new_title text, new_content text, new_type text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if nullif(trim(new_title), '') is null or new_type not in ('note','knowledge','resource') then raise exception 'Invalid contribution'; end if;
  update public.course_contributions set title = trim(new_title), content = coalesce(new_content, ''), contribution_type = new_type where id = p_contribution_id and author_id = auth.uid();
  if not found then raise exception 'Contribution not found'; end if;
end;
$$;

create or replace function public.set_course_contribution_bookmark(p_contribution_id uuid, should_bookmark boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.course_contributions where id = p_contribution_id and visibility = 'course' and status = 'published') then raise exception 'Contribution unavailable'; end if;
  if should_bookmark then insert into public.course_contribution_bookmarks(user_id, contribution_id) values (auth.uid(), p_contribution_id) on conflict do nothing;
  else delete from public.course_contribution_bookmarks where user_id = auth.uid() and contribution_id = p_contribution_id; end if;
end;
$$;

create or replace function public.quote_course_contribution(p_contribution_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare contribution public.course_contributions; record_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into contribution from public.course_contributions where id = p_contribution_id and visibility = 'course' and status = 'published';
  if contribution.id is null then raise exception 'Contribution unavailable'; end if;
  perform set_config('app.course_commons_quote', '1', true);
  insert into public.learning_records (id, user_id, record_date, title, course_name, course_key, record_type, content, mood_note, processing_status, source_contribution_id, source_author_name_snapshot, source_title_snapshot, quoted_at)
  values (record_id, auth.uid(), current_date, contribution.title, contribution.course_name_snapshot, contribution.course_key, 'note', contribution.content, format('来源：%s · %s · 课程公共知识库', contribution.author_name, contribution.course_name_snapshot), 'uploaded', contribution.id, contribution.author_name, contribution.title, now());
  return record_id;
end;
$$;

create or replace function public.report_course_contribution(p_contribution_id uuid, report_reason text, report_details text default '')
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if auth.uid() is null or report_reason not in ('inappropriate','copyright','spam','other') or not exists (select 1 from public.course_contributions where id = p_contribution_id and visibility = 'course' and status = 'published') then raise exception 'Invalid report'; end if;
  insert into public.course_contribution_reports(contribution_id, reporter_id, reason, details) values (p_contribution_id, auth.uid(), report_reason, nullif(trim(report_details), '')) on conflict (contribution_id, reporter_id) do update set reason = excluded.reason, details = excluded.details, status = 'open', created_at = now();
end;
$$;

create or replace function public.moderate_course_contribution(p_contribution_id uuid, moderation_action text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_admin_or_super(auth.uid()) then raise exception 'Permission denied'; end if;
  if moderation_action = 'hide' then update public.course_contributions set status = 'hidden' where id = p_contribution_id;
  elsif moderation_action = 'restore' then update public.course_contributions set status = 'published', visibility = 'course' where id = p_contribution_id;
  else raise exception 'Invalid moderation action'; end if;
  if not found then raise exception 'Contribution not found'; end if;
end;
$$;

create or replace function public.get_course_contributions(requested_course_key text)
returns table (id uuid, author_id uuid, author_name text, course_key text, course_name_snapshot text, source_record_id uuid, title text, content text, contribution_type text, language text, status text, ai_summary text, ai_key_points jsonb, ai_suggested_review text, published_at timestamptz, updated_at timestamptz, bookmark_count bigint, bookmarked boolean)
language sql security definer stable set search_path = pg_catalog, public as $$
  select c.id, c.author_id, c.author_name, c.course_key, c.course_name_snapshot, case when c.author_id = auth.uid() then c.source_record_id else null end, c.title, c.content, c.contribution_type, c.language, c.status, c.ai_summary, c.ai_key_points, c.ai_suggested_review, c.published_at, c.updated_at,
    (select count(*) from public.course_contribution_bookmarks b where b.contribution_id = c.id),
    exists(select 1 from public.course_contribution_bookmarks b where b.contribution_id = c.id and b.user_id = auth.uid())
  from public.course_contributions c where c.course_key = requested_course_key and c.visibility = 'course' and c.status = 'published' order by c.published_at desc;
$$;

revoke all on function public.publish_course_contribution(uuid,text,text,text,text), public.edit_course_contribution(uuid,text,text,text), public.set_course_contribution_bookmark(uuid,boolean), public.quote_course_contribution(uuid), public.report_course_contribution(uuid,text,text), public.moderate_course_contribution(uuid,text), public.get_course_contributions(text) from public;
grant execute on function public.publish_course_contribution(uuid,text,text,text,text) to authenticated;
grant execute on function public.edit_course_contribution(uuid,text,text,text) to authenticated;
grant execute on function public.set_course_contribution_bookmark(uuid,boolean) to authenticated;
grant execute on function public.quote_course_contribution(uuid) to authenticated;
grant execute on function public.report_course_contribution(uuid,text,text) to authenticated;
grant execute on function public.moderate_course_contribution(uuid,text) to authenticated;
grant execute on function public.get_course_contributions(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit) values ('course-contributions', 'course-contributions', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create or replace function public.can_read_course_contribution_object(object_name text)
returns boolean language plpgsql security definer stable set search_path = pg_catalog, public, storage as $$
declare parts text[] := storage.foldername(object_name); contribution uuid; object_author uuid;
begin
  if auth.uid() is null or array_length(parts, 1) <> 3 or parts[1] <> 'course' then return false; end if;
  begin contribution := parts[2]::uuid; object_author := parts[3]::uuid; exception when others then return false; end;
  return exists (select 1 from public.course_contributions c where c.id = contribution and c.author_id = object_author and (c.author_id = auth.uid() or (c.visibility = 'course' and c.status = 'published')));
end;
$$;
revoke all on function public.can_read_course_contribution_object(text) from public;
grant execute on function public.can_read_course_contribution_object(text) to authenticated;
drop policy if exists "Authenticated read published course contribution objects" on storage.objects;
create policy "Authenticated read published course contribution objects" on storage.objects for select to authenticated using (bucket_id = 'course-contributions' and public.can_read_course_contribution_object(name));

commit;
