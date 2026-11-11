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
    and (
      (p.locked_until is not null and p.locked_until <= now())
      or (p.locked_until is null and coalesce(p.started_at, '-infinity'::timestamptz) < now() - interval '5 minutes')
    )
    and p.attempts >= p.max_attempts;

  with candidate as (
    select p.id
    from public.search_task_pages p
    join public.search_tasks t on t.id = p.task_id
    where t.status not in ('cancelled','completed','failed')
      and (
        (p.status = 'queued' and coalesce(p.next_retry_at, now()) <= now())
        or (p.status = 'failed' and p.attempts < p.max_attempts and coalesce(p.next_retry_at, now()) <= now())
        or (p.status = 'running' and p.attempts < p.max_attempts and (
          (p.locked_until is not null and p.locked_until <= now())
          or (p.locked_until is null and coalesce(p.started_at, '-infinity'::timestamptz) < now() - interval '5 minutes')
        ))
      )
    order by
      (select count(*) from public.search_task_pages active
       where active.task_id = t.id and active.status = 'running') asc,
      t.created_at asc,
      p.page_number asc
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
