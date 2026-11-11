# SERP queue worker provisioning

The production project has a scheduled worker configured by
`20261111095903_schedule_serp_queue_worker.sql`. The worker authenticates with
a dedicated random secret stored in Supabase Vault and in the service-role-only
`public.internal_worker_config` table.

For a new environment, provision these Vault entries before enabling the cron job:

- `mnemosyne_project_url`: the Supabase project URL
- `mnemosyne_anon_key`: the project's legacy anon JWT key (used only as the Edge Function gateway key)
- `mnemosyne_queue_worker_secret`: a newly generated high-entropy random secret

Store the same worker secret in the internal config table:

```sql
insert into public.internal_worker_config(name, secret_value, updated_at)
values ('serp_queue_worker', '<SAME_RANDOM_WORKER_SECRET>', now())
on conflict (name) do update
set secret_value = excluded.secret_value, updated_at = now();
```

Create Vault entries using `vault.create_secret(secret, name)`. Never commit
secret values or place them in browser code. The internal config table has RLS
enabled and no client policies; privileges are revoked from `anon` and
`authenticated`, and only the service role can read it.

The Edge Function also requires the existing server-side `APIFY_API_TOKEN`
secret. The cron job invokes `serp-task-manager` every minute; each tick
schedules up to three page workers. Page leases expire after four minutes,
and failed requests retry with backoff up to four attempts.
