-- 023_cron_jobs.sql
-- Cron Jobs for Edge Functions (using pg_cron)

-- Enable pg_cron extension if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: auto-lock-release every minute
SELECT cron.schedule('auto-lock-release', '*/1 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/auto-lock-release',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
$$);

-- Job 2: leakage-detector every hour
SELECT cron.schedule('leakage-detector', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/leakage-detector',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
$$);

-- Job 3: analytics-snapshot daily at 2 AM
SELECT cron.schedule('analytics-snapshot', '0 2 * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/analytics-snapshot',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
$$);

-- Job 4: notification-processor every 5 minutes
SELECT cron.schedule('notification-processor', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/notification-processor',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
$$);
