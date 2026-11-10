# Mnemosyne

Global B2B Intelligence — personal global B2B company discovery.

## First phase
- Google SERP-based candidate website discovery.
- Search syntax preview with country, language, company-type terms and exclusion domains.
- Search results table.
- Cloudflare Pages Function proxy; API credentials remain server-side.

## Cloudflare Pages
Project: `mnemosyne-console` · Production branch: `main` · Framework: None · Build command: empty · Build output directory: `/` (repository root).

Set Production secrets/variables:
- `BRIGHTDATA_API_KEY`: Bright Data API key
- `BRIGHTDATA_SERP_ZONE`: exact SERP zone name

Never commit API credentials. This first phase intentionally excludes AI scoring, contact discovery, CRM and multi-user features.


## Persistent SERP search tasks
- Search tasks are stored in Supabase Postgres: `search_tasks`, `search_task_pages`, and `search_results`.
- Supabase Edge Function `serp-task-manager` creates tasks and runs page-by-page SERP collection in a background task.
- Cloudflare Pages Function `/api/tasks` forwards requests to the Edge Function and passes Bright Data credentials server-to-server; credentials are never sent to browser code.
- UI routes: `/search` (create task), `/tasks` (task history and per-page status), and `/results` (persistent results with keyword, task, country, and domain filters).
- Each task supports a range of up to 10 Google result pages (approximately 100 raw SERP results). Larger searches should be split into multiple tasks.
- Each result retains its task ID, keyword, country, language, page number, rank, URL, domain, title, snippet, discovery time, and source URL when a Google redirect was resolved.
- The three database tables have RLS enabled and no public policies. Only the Edge Function's server-side secret key accesses them.
- Bright Data API key and zone remain Cloudflare Pages environment variables and are forwarded only from the Pages Function to the Supabase Edge Function over HTTPS.
