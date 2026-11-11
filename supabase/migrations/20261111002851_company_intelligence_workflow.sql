create table if not exists public.company_review_selections (
  id uuid primary key default gen_random_uuid(),
  search_result_id uuid not null references public.search_results(id) on delete cascade,
  decision text not null default 'pending' check (decision in ('pending','approved','rejected')),
  updated_at timestamptz not null default now(),
  unique(search_result_id)
);
create table if not exists public.company_intelligence_tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique default ('CI-' || to_char(now() at time zone 'UTC','YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  task_name text not null default '',
  status text not null default 'queued' check (status in ('queued','running','completed','partial','failed','cancelled')),
  total_items integer not null default 0,
  completed_items integer not null default 0,
  failed_items integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text
);
create table if not exists public.company_intelligence_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.company_intelligence_tasks(id) on delete cascade,
  search_result_id uuid not null references public.search_results(id),
  domain text not null,
  website_url text not null,
  title text not null default '',
  status text not null default 'queued' check (status in ('queued','crawling','extracting','completed','partial','failed','cancelled')),
  pages_found integer not null default 0,
  pages_crawled integer not null default 0,
  error_message text,
  company_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique(task_id, search_result_id)
);
create table if not exists public.company_intelligence_results (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.company_intelligence_items(id) on delete cascade,
  task_id uuid not null references public.company_intelligence_tasks(id) on delete cascade,
  search_result_id uuid not null references public.search_results(id),
  domain text not null,
  website_url text not null,
  company_name text,
  description text,
  country text,
  address text,
  emails jsonb not null default '[]'::jsonb,
  phones jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  main_products jsonb not null default '[]'::jsonb,
  source_pages jsonb not null default '[]'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_intelligence_items_task_status_idx on public.company_intelligence_items(task_id,status);
create index if not exists company_intelligence_results_domain_idx on public.company_intelligence_results(domain);
alter table public.company_review_selections enable row level security;
alter table public.company_intelligence_tasks enable row level security;
alter table public.company_intelligence_items enable row level security;
alter table public.company_intelligence_results enable row level security;
