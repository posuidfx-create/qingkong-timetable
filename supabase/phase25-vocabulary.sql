-- Phase 25: private Vocabulary Workspace and server-owned DeepSeek analysis cache.
-- This migration does not widen Learning, profile, chat, or administrator permissions.
begin;

create table if not exists public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null,
  language text not null,
  reading text,
  meaning text,
  notes text,
  course_name text,
  course_key text,
  mastery text not null default 'new',
  analysis_status text not null default 'uploaded',
  analysis_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_words_term check (char_length(trim(term)) between 1 and 160),
  constraint vocabulary_words_language check (language in ('ja-JP', 'en-US', 'en-GB', 'zh-CN')),
  constraint vocabulary_words_reading check (reading is null or char_length(trim(reading)) between 1 and 160),
  constraint vocabulary_words_meaning check (meaning is null or char_length(trim(meaning)) between 1 and 1000),
  constraint vocabulary_words_notes check (notes is null or char_length(trim(notes)) between 1 and 2000),
  constraint vocabulary_words_course_name check (course_name is null or char_length(trim(course_name)) between 1 and 160),
  constraint vocabulary_words_course_key check (course_key is null or char_length(course_key) <= 160),
  constraint vocabulary_words_mastery check (mastery in ('new', 'learning', 'mastered')),
  constraint vocabulary_words_analysis_status check (analysis_status in ('uploaded', 'processing', 'completed', 'failed'))
);

create unique index if not exists vocabulary_words_user_term_language_uidx
  on public.vocabulary_words (user_id, lower(trim(term)), language);
create index if not exists vocabulary_words_user_created_idx
  on public.vocabulary_words (user_id, created_at desc);
create index if not exists vocabulary_words_user_course_idx
  on public.vocabulary_words (user_id, course_key) where course_key is not null;

create or replace function public.set_vocabulary_word_updated_at()
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

drop trigger if exists vocabulary_words_set_updated_at on public.vocabulary_words;
create trigger vocabulary_words_set_updated_at
before update on public.vocabulary_words
for each row execute function public.set_vocabulary_word_updated_at();

create or replace function public.guard_vocabulary_ai_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and (
      new.analysis_status <> 'uploaded'
      or new.analysis_json is not null
    ) then
      raise exception 'Authenticated clients cannot set vocabulary AI results';
    end if;
    if tg_op = 'UPDATE' and (
      new.analysis_status is distinct from old.analysis_status
      or new.analysis_json is distinct from old.analysis_json
    ) then
      raise exception 'Authenticated clients cannot update vocabulary AI results';
    end if;
    if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
      raise exception 'Vocabulary owner is immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vocabulary_words_ai_guard on public.vocabulary_words;
create trigger vocabulary_words_ai_guard
before insert or update on public.vocabulary_words
for each row execute function public.guard_vocabulary_ai_fields();

alter table public.vocabulary_words enable row level security;

drop policy if exists "Users read own vocabulary" on public.vocabulary_words;
create policy "Users read own vocabulary" on public.vocabulary_words
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users create own vocabulary" on public.vocabulary_words;
create policy "Users create own vocabulary" on public.vocabulary_words
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users update own vocabulary" on public.vocabulary_words;
create policy "Users update own vocabulary" on public.vocabulary_words
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users delete own vocabulary" on public.vocabulary_words;
create policy "Users delete own vocabulary" on public.vocabulary_words
for delete to authenticated using (user_id = auth.uid());

revoke insert, update on public.vocabulary_words from authenticated;
grant select, delete on public.vocabulary_words to authenticated;
grant insert (
  id, user_id, term, language, reading, meaning, notes,
  course_name, course_key, mastery
) on public.vocabulary_words to authenticated;
grant update (
  term, language, reading, meaning, notes,
  course_name, course_key, mastery
) on public.vocabulary_words to authenticated;

grant select on public.vocabulary_words to service_role;
grant update (analysis_status, analysis_json) on public.vocabulary_words to service_role;

commit;
