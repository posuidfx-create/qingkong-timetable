-- Phase 23B: student/teacher profile identity and cohort consistency.
-- Run manually in Supabase SQL Editor after reviewing. This migration is not executed by the frontend.

begin;

alter table public.profiles add column if not exists identity_type text null;

-- Existing accounts with a known cohort are students. Historical accounts with no
-- cohort remain unknown and will be asked to complete their profile in the app.
update public.profiles
set identity_type = 'student'
where identity_type is null and cohort_year in (2024, 2025);

alter table public.profiles drop constraint if exists profiles_identity_type_check;
alter table public.profiles drop constraint if exists profiles_identity_cohort_check;
alter table public.profiles add constraint profiles_identity_type_check
  check (identity_type is null or identity_type in ('student', 'teacher'));
alter table public.profiles add constraint profiles_identity_cohort_check
  check (
    (identity_type is null and cohort_year is null)
    or (identity_type = 'student' and cohort_year in (2024, 2025))
    or (identity_type = 'teacher' and cohort_year is null)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_identity text := nullif(trim(new.raw_user_meta_data ->> 'identity_type'), '');
  requested_cohort integer;
begin
  if (new.raw_user_meta_data ->> 'cohort_year') ~ '^(2024|2025)$' then
    requested_cohort := (new.raw_user_meta_data ->> 'cohort_year')::integer;
  end if;

  if requested_identity = 'teacher' then
    requested_cohort := null;
  elsif requested_identity = 'student' and requested_cohort in (2024, 2025) then
    null;
  else
    requested_identity := null;
    requested_cohort := null;
  end if;

  insert into public.profiles (id, username, identity_type, cohort_year)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      '同学'
    ),
    requested_identity,
    requested_cohort
  );
  return new;
end;
$$;

drop function if exists public.update_my_profile(text, text);
create or replace function public.update_my_profile(
  new_username text,
  new_title text,
  new_identity_type text,
  new_cohort_year integer
)
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_title text := nullif(trim(new_title), '');
  normalized_cohort integer;
  updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if new_username is null or char_length(trim(new_username)) not between 1 and 40 then
    raise exception 'Username must contain 1 to 40 characters';
  end if;
  if normalized_title is not null and char_length(normalized_title) > 20 then
    raise exception 'Title must not exceed 20 characters';
  end if;
  if new_identity_type = 'student' and new_cohort_year in (2024, 2025) then
    normalized_cohort := new_cohort_year;
  elsif new_identity_type = 'teacher' then
    normalized_cohort := null;
  else
    raise exception 'A valid identity and cohort are required';
  end if;

  update public.profiles
  set username = trim(new_username), title = normalized_title,
      identity_type = new_identity_type, cohort_year = normalized_cohort
  where id = auth.uid()
  returning * into updated_profile;
  if not found then raise exception 'Profile not found'; end if;
  return updated_profile;
end;
$$;
revoke all on function public.update_my_profile(text, text, text, integer) from public;
grant execute on function public.update_my_profile(text, text, text, integer) to authenticated;

drop function if exists public.update_user_profile(uuid, text, text);
create or replace function public.update_user_profile(
  target_user_id uuid,
  new_username text,
  new_title text,
  new_identity_type text,
  new_cohort_year integer
)
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role text;
  target_role text;
  normalized_title text := nullif(trim(new_title), '');
  normalized_cohort integer;
  updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select role into actor_role from public.profiles where id = auth.uid();
  select role into target_role from public.profiles where id = target_user_id;
  if actor_role is null or target_role is null then raise exception 'Profile not found'; end if;
  if target_user_id = auth.uid() or target_role = 'super_admin' then raise exception 'Target profile cannot be edited'; end if;
  if not (actor_role = 'super_admin' or (actor_role = 'admin' and target_role = 'user')) then
    raise exception 'Insufficient permission';
  end if;
  if new_username is null or char_length(trim(new_username)) not between 1 and 40 then
    raise exception 'Username must contain 1 to 40 characters';
  end if;
  if normalized_title is not null and char_length(normalized_title) > 20 then
    raise exception 'Title must not exceed 20 characters';
  end if;
  if new_identity_type = 'student' and new_cohort_year in (2024, 2025) then
    normalized_cohort := new_cohort_year;
  elsif new_identity_type = 'teacher' then
    normalized_cohort := null;
  else
    raise exception 'A valid identity and cohort are required';
  end if;

  -- This RPC deliberately updates display/identity fields only; role remains governed separately.
  update public.profiles
  set username = trim(new_username), title = normalized_title,
      identity_type = new_identity_type, cohort_year = normalized_cohort
  where id = target_user_id
  returning * into updated_profile;
  return updated_profile;
end;
$$;
revoke all on function public.update_user_profile(uuid, text, text, text, integer) from public;
grant execute on function public.update_user_profile(uuid, text, text, text, integer) to authenticated;

-- Existing chat policies already call this helper. Replacing it is sufficient:
-- public is open to authenticated profiles; cohort rooms require a matching student,
-- while admins and super administrators retain access regardless of identity.
create or replace function public.can_access_chat_room(target_room text, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
    where check_user_id = auth.uid() and id = auth.uid() and (
      target_room = 'public'
      or role in ('admin', 'super_admin')
      or (identity_type = 'student' and target_room = 'cohort_2024' and cohort_year = 2024)
      or (identity_type = 'student' and target_room = 'cohort_2025' and cohort_year = 2025)
    )
  );
$$;
revoke all on function public.can_access_chat_room(text, uuid) from public;
grant execute on function public.can_access_chat_room(text, uuid) to authenticated;

commit;
