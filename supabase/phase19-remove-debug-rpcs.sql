-- Phase 19 diagnostic cleanup. Review and execute manually in Supabase SQL Editor.
drop function if exists public.debug_auth_context();
drop function if exists public.debug_admin_todo_insert_check(uuid);
drop function if exists public.debug_todo_attachment_insert_check(uuid, uuid);
