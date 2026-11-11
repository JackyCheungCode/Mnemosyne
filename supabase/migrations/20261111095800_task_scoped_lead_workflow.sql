alter table public.company_intelligence_tasks
  add column if not exists source_search_task_id uuid references public.search_tasks(id) on delete set null;

create index if not exists company_intelligence_tasks_source_search_task_idx
  on public.company_intelligence_tasks(source_search_task_id);
