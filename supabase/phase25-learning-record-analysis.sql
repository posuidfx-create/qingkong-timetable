-- Record-level AI persistence for private Learning records.
-- Existing own-only RLS policies remain unchanged.
begin;

alter table public.learning_records
  add column if not exists processing_status text not null default 'uploaded',
  add column if not exists analysis_json jsonb;

alter table public.learning_records
  drop constraint if exists learning_records_processing_status;
alter table public.learning_records
  add constraint learning_records_processing_status
  check (processing_status in ('uploaded', 'pending', 'processing', 'completed', 'failed'));

create or replace function public.guard_learning_record_ai_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and (
      new.processing_status <> 'uploaded'
      or new.analysis_json is not null
    ) then
      raise exception 'Authenticated clients cannot set learning record AI results';
    end if;
    if tg_op = 'UPDATE' and (
      new.processing_status is distinct from old.processing_status
      or new.analysis_json is distinct from old.analysis_json
    ) then
      raise exception 'Authenticated clients cannot update learning record AI results';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists learning_records_ai_guard on public.learning_records;
create trigger learning_records_ai_guard
before insert or update on public.learning_records
for each row execute function public.guard_learning_record_ai_fields();

revoke insert, update on public.learning_records from authenticated;
grant insert (
  id, user_id, record_date, title, course_name, course_key,
  record_type, content, mood_note
) on public.learning_records to authenticated;
grant update (
  record_date, title, course_name, course_key,
  record_type, content, mood_note
) on public.learning_records to authenticated;

grant select on public.learning_records to service_role;
grant update (processing_status, analysis_json) on public.learning_records to service_role;

commit;
