create schema if not exists private;

alter table public.search_task_pages
  add column if not exists lease_token uuid,
  add column if not exists locked_until timestamptz,
  add column if not exists next_retry_at timestamptz,
  add column if not exists max_attempts integer not null default 4,
  add column if not exists last_error text;

create index if not exists search_task_pages_queue_idx
  on public.search_task_pages (status, next_retry_at, locked_until, page_number);

create table if not exists public.internal_worker_config (
  name text primary key,
  secret_value text not null,
  updated_at timestamptz not null default now()
);
alter table public.internal_worker_config enable row level security;
revoke all on public.internal_worker_config from public, anon, authenticated;
grant all on public.internal_worker_config to service_role;

create or replace function private.claim_search_task_page()
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
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v record;
begin
  update public.search_task_pages p
  set status = 'failed',
      error_code = coalesce(p.error_code, 'WORKER_LEASE_EXHAUSTED'),
      error_detail = coalesce(p.error_detail, jsonb_build_object('message','Worker lease expired and retry limit was reached')),
      locked_until = null,
      lease_token = null,
      completed_at = now(),
      last_error = coalesce(p.last_error, 'Worker lease expired and retry limit was reached')
  where p.status = 'running'
    and p.locked_until is not null
    and p.locked_until <= now()
    and p.attempts >= p.max_attempts;

  with candidate as (
    select p.id
    from public.search_task_pages p
    join public.search_tasks t on t.id = p.task_id
    where t.status not in ('cancelled','completed','failed')
      and (
        (p.status = 'queued' and coalesce(p.next_retry_at, now()) <= now())
        or (p.status = 'failed' and p.attempts < p.max_attempts and coalesce(p.next_retry_at, now()) <= now())
        or (p.status = 'running' and p.locked_until is not null and p.locked_until <= now() and p.attempts < p.max_attempts)
      )
    order by t.created_at asc, p.page_number asc
    for update of p skip locked
    limit 1
  ),
  claimed as (
    update public.search_task_pages p
    set status = 'running',
        attempts = p.attempts + 1,
        lease_token = gen_random_uuid(),
        locked_until = now() + interval '4 minutes',
        next_retry_at = null,
        started_at = now(),
        completed_at = null,
        error_code = null,
        error_detail = null,
        last_error = null
    from candidate c
    where p.id = c.id
    returning p.*
  )
  select c.id, c.task_id, c.page_number, c.attempts, c.max_attempts,
         c.lease_token, t.task_code, t.task_name, t.keyword, t.query,
         t.country, t.language
  into v
  from claimed c
  join public.search_tasks t on t.id = c.task_id;

  if not found then
    return;
  end if;

  update public.search_tasks
  set status = 'running',
      started_at = coalesce(started_at, now()),
      completed_at = null,
      error_summary = null
  where id = v.task_id;

  return query select v.id, v.task_id, v.page_number, v.attempts, v.max_attempts,
                      v.lease_token, v.task_code, v.task_name, v.keyword,
                      v.query, v.country, v.language;
end;
$$;

revoke all on function private.claim_search_task_page() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.claim_search_task_page() to service_role;
