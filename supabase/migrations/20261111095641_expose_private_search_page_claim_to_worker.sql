create or replace function public.claim_search_task_page()
returns table (
  page_id uuid,
  task_id uuid,
  page_number integer,
  attempts integer,
  max_attempts integer,
  lease_token uuid,
  task_code text,
  task_name text,
  keyword text,
  query text,
  country text,
  language text
)
language sql
security definer
set search_path = public, private, pg_temp
as $$ select * from private.claim_search_task_page(); $$;

revoke all on function public.claim_search_task_page() from public, anon, authenticated;
grant execute on function public.claim_search_task_page() to service_role;
