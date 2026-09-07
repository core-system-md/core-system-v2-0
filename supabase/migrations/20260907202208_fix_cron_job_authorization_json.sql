-- Align pg_cron HTTP requests with valid JSON headers/body construction.
-- The existing schedules were failing before reaching their Edge Functions.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-lock-release') THEN
    PERFORM cron.unschedule('auto-lock-release');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'leakage-detector') THEN
    PERFORM cron.unschedule('leakage-detector');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analytics-snapshot') THEN
    PERFORM cron.unschedule('analytics-snapshot');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notification-processor') THEN
    PERFORM cron.unschedule('notification-processor');
  END IF;
END $$;

SELECT cron.schedule('auto-lock-release', '*/1 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/auto-lock-release',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('leakage-detector', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/leakage-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('analytics-snapshot', '0 2 * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/analytics-snapshot',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('notification-processor', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/notification-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);