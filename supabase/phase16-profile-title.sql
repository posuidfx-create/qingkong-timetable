-- 晴空课表：用户展示头衔与受控资料编辑。请在 Supabase SQL Editor 手动执行；不会由前端自动执行。
alter table public.profiles add column if not exists title text null;
alter table public.profiles drop constraint if exists profiles_title_check;
alter table public.profiles add constraint profiles_title_check check (title is null or char_length(trim(title)) between 1 and 20);

create or replace function public.update_user_profile(target_user_id uuid, new_username text, new_title text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare actor_role text; target_role text; normalized_title text; updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select role into actor_role from public.profiles where id = auth.uid();
  select role into target_role from public.profiles where id = target_user_id;
  if actor_role is null or target_role is null then raise exception 'Profile not found'; end if;
  if target_user_id = auth.uid() or target_role = 'super_admin' then raise exception 'Target profile cannot be edited'; end if;
  if not (actor_role = 'super_admin' or (actor_role = 'admin' and target_role = 'user')) then raise exception 'Insufficient permission'; end if;
  if new_username is null or char_length(trim(new_username)) not between 1 and 40 then raise exception 'Username must contain 1 to 40 characters'; end if;
  normalized_title := nullif(trim(new_title), '');
  if normalized_title is not null and char_length(normalized_title) > 20 then raise exception 'Title must contain at most 20 characters'; end if;
  update public.profiles set username = trim(new_username), title = normalized_title where id = target_user_id returning * into updated_profile;
  return updated_profile;
end;
$$;
revoke all on function public.update_user_profile(uuid, text, text) from public;
grant execute on function public.update_user_profile(uuid, text, text) to authenticated;
