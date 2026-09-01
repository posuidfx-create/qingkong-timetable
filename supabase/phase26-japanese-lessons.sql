-- Phase 26: own-only Japanese textbook lesson organization for Vocabulary Workspace.
-- This migration adds no copyrighted textbook content and does not widen Learning or administrator access.
begin;

alter table public.vocabulary_words
  add column if not exists textbook_key text,
  add column if not exists volume text,
  add column if not exists lesson_number integer;

alter table public.vocabulary_words
  drop constraint if exists vocabulary_words_textbook_key,
  add constraint vocabulary_words_textbook_key check (textbook_key is null or textbook_key = 'minna_no_nihongo'),
  drop constraint if exists vocabulary_words_volume,
  add constraint vocabulary_words_volume check (volume is null or volume in ('beginner_1', 'beginner_2')),
  drop constraint if exists vocabulary_words_lesson,
  add constraint vocabulary_words_lesson check (
    (textbook_key is null and volume is null and lesson_number is null)
    or (
      textbook_key = 'minna_no_nihongo'
      and lesson_number between 1 and 50
      and volume = case when lesson_number <= 25 then 'beginner_1' else 'beginner_2' end
    )
  );

create index if not exists vocabulary_words_user_lesson_idx
  on public.vocabulary_words (user_id, textbook_key, lesson_number)
  where lesson_number is not null;

revoke insert, update on public.vocabulary_words from authenticated;
grant insert (
  id, user_id, term, language, reading, meaning, notes,
  course_name, course_key, textbook_key, volume, lesson_number, mastery
) on public.vocabulary_words to authenticated;
grant update (
  term, language, reading, meaning, notes,
  course_name, course_key, textbook_key, volume, lesson_number, mastery
) on public.vocabulary_words to authenticated;

create table if not exists public.grammar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  textbook_key text not null,
  volume text not null,
  lesson_number integer not null,
  pattern text not null,
  meaning text,
  connection text,
  usage_note text,
  example text,
  example_translation text,
  personal_note text,
  mastery text not null default 'new',
  analysis_status text not null default 'uploaded',
  analysis_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_items_textbook check (textbook_key = 'minna_no_nihongo'),
  constraint grammar_items_volume check (volume in ('beginner_1', 'beginner_2')),
  constraint grammar_items_lesson check (
    lesson_number between 1 and 50
    and volume = case when lesson_number <= 25 then 'beginner_1' else 'beginner_2' end
  ),
  constraint grammar_items_pattern check (char_length(trim(pattern)) between 1 and 240),
  constraint grammar_items_meaning check (meaning is null or char_length(trim(meaning)) between 1 and 2000),
  constraint grammar_items_connection check (connection is null or char_length(trim(connection)) between 1 and 2000),
  constraint grammar_items_usage check (usage_note is null or char_length(trim(usage_note)) between 1 and 4000),
  constraint grammar_items_example check (example is null or char_length(trim(example)) between 1 and 2000),
  constraint grammar_items_example_translation check (example_translation is null or char_length(trim(example_translation)) between 1 and 2000),
  constraint grammar_items_personal_note check (personal_note is null or char_length(trim(personal_note)) between 1 and 4000),
  constraint grammar_items_mastery check (mastery in ('new', 'learning', 'mastered')),
  constraint grammar_items_analysis_status check (analysis_status in ('uploaded', 'processing', 'completed', 'failed'))
);

create index if not exists grammar_items_user_lesson_idx
  on public.grammar_items (user_id, textbook_key, lesson_number, created_at);

create or replace function public.set_grammar_item_updated_at()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$ begin new.updated_at := now(); return new; end; $$;

drop trigger if exists grammar_items_set_updated_at on public.grammar_items;
create trigger grammar_items_set_updated_at before update on public.grammar_items
for each row execute function public.set_grammar_item_updated_at();

create or replace function public.guard_grammar_item_fields()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and (new.analysis_status <> 'uploaded' or new.analysis_json is not null) then
      raise exception 'Authenticated clients cannot set grammar AI results';
    end if;
    if tg_op = 'UPDATE' and (
      new.analysis_status is distinct from old.analysis_status
      or new.analysis_json is distinct from old.analysis_json
      or new.user_id is distinct from old.user_id
    ) then
      raise exception 'Authenticated clients cannot update protected grammar fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists grammar_items_field_guard on public.grammar_items;
create trigger grammar_items_field_guard before insert or update on public.grammar_items
for each row execute function public.guard_grammar_item_fields();

alter table public.grammar_items enable row level security;
drop policy if exists "Users read own grammar" on public.grammar_items;
create policy "Users read own grammar" on public.grammar_items for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users create own grammar" on public.grammar_items;
create policy "Users create own grammar" on public.grammar_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users update own grammar" on public.grammar_items;
create policy "Users update own grammar" on public.grammar_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users delete own grammar" on public.grammar_items;
create policy "Users delete own grammar" on public.grammar_items for delete to authenticated using (user_id = auth.uid());

revoke all on public.grammar_items from anon, authenticated;
grant select, delete on public.grammar_items to authenticated;
grant insert (id, user_id, textbook_key, volume, lesson_number, pattern, meaning, connection, usage_note, example, example_translation, personal_note, mastery) on public.grammar_items to authenticated;
grant update (textbook_key, volume, lesson_number, pattern, meaning, connection, usage_note, example, example_translation, personal_note, mastery) on public.grammar_items to authenticated;
grant select on public.grammar_items to service_role;
grant update (analysis_status, analysis_json) on public.grammar_items to service_role;

create table if not exists public.vocabulary_lesson_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  textbook_key text not null,
  volume text not null,
  lesson_number integer not null,
  analysis_status text not null default 'uploaded',
  analysis_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_lesson_analyses_textbook check (textbook_key = 'minna_no_nihongo'),
  constraint vocabulary_lesson_analyses_volume check (volume in ('beginner_1', 'beginner_2')),
  constraint vocabulary_lesson_analyses_lesson check (
    lesson_number between 1 and 50
    and volume = case when lesson_number <= 25 then 'beginner_1' else 'beginner_2' end
  ),
  constraint vocabulary_lesson_analyses_status check (analysis_status in ('uploaded', 'processing', 'completed', 'failed')),
  unique (user_id, textbook_key, lesson_number)
);

create or replace function public.set_vocabulary_lesson_analysis_updated_at()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$ begin new.updated_at := now(); return new; end; $$;

drop trigger if exists vocabulary_lesson_analyses_set_updated_at on public.vocabulary_lesson_analyses;
create trigger vocabulary_lesson_analyses_set_updated_at before update on public.vocabulary_lesson_analyses
for each row execute function public.set_vocabulary_lesson_analysis_updated_at();

create or replace function public.guard_vocabulary_lesson_analysis_fields()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and (new.analysis_status <> 'uploaded' or new.analysis_json is not null) then
      raise exception 'Authenticated clients cannot set lesson AI results';
    end if;
    if tg_op = 'UPDATE' and (
      new.analysis_status is distinct from old.analysis_status
      or new.analysis_json is distinct from old.analysis_json
      or new.user_id is distinct from old.user_id
    ) then
      raise exception 'Authenticated clients cannot update protected lesson fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vocabulary_lesson_analyses_field_guard on public.vocabulary_lesson_analyses;
create trigger vocabulary_lesson_analyses_field_guard before insert or update on public.vocabulary_lesson_analyses
for each row execute function public.guard_vocabulary_lesson_analysis_fields();

alter table public.vocabulary_lesson_analyses enable row level security;
drop policy if exists "Users read own lesson analyses" on public.vocabulary_lesson_analyses;
create policy "Users read own lesson analyses" on public.vocabulary_lesson_analyses for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users create own lesson analyses" on public.vocabulary_lesson_analyses;
drop policy if exists "Users delete own lesson analyses" on public.vocabulary_lesson_analyses;
create policy "Users delete own lesson analyses" on public.vocabulary_lesson_analyses for delete to authenticated using (user_id = auth.uid());

revoke all on public.vocabulary_lesson_analyses from anon, authenticated;
grant select, delete on public.vocabulary_lesson_analyses to authenticated;
grant select, insert, delete on public.vocabulary_lesson_analyses to service_role;
grant update (analysis_status, analysis_json) on public.vocabulary_lesson_analyses to service_role;

commit;
