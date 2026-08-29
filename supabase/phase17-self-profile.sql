-- Phase 17: self-service profile editing.
-- Prerequisite: phase16-profile-title.sql has already added profiles.title.
-- Run this file manually in the Supabase SQL Editor; do not expose service_role credentials to the client.

create or replace function public.update_my_profile(
  new_username text,
  new_title text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_title text;
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if new_username is null
    or char_length(trim(new_username)) not between 1 and 40 then
    raise exception 'Username must contain 1 to 40 characters';
  end if;

  normalized_title := nullif(trim(new_title), '');
  if normalized_title is not null and char_length(normalized_title) > 20 then
    raise exception 'Title must not exceed 20 characters';
  end if;

  -- auth.uid() determines the only row this RPC can update. It never accepts a target id
  -- and intentionally updates no role, cohort_year, email, id, or other sensitive field.
  update public.profiles
  set
    username = trim(new_username),
    title = normalized_title
  where id = auth.uid()
  returning * into updated_profile;

  if not found then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_my_profile(text, text) from public;
grant execute on function public.update_my_profile(text, text) to authenticated;
