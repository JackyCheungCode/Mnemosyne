select cron.schedule(
 'mnemosyne-serp-queue-worker',
 '* * * * *',
 $job$
 select net.http_post(
   url := (select decrypted_secret from vault.decrypted_secrets where name = 'mnemosyne_project_url') || '/functions/v1/serp-task-manager',
   headers := jsonb_build_object(
     'Content-Type','application/json',
     'apikey',(select decrypted_secret from vault.decrypted_secrets where name = 'mnemosyne_anon_key'),
     'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mnemosyne_anon_key'),
     'x-queue-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'mnemosyne_queue_worker_secret')
   ),
   body := '{"action":"worker_tick"}'::jsonb,
   timeout_milliseconds := 5000
 );
 $job$
);
