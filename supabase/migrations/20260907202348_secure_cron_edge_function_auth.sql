-- Secure pg_cron -> Edge Function authentication without exposing secrets in source control.
-- The token is generated once and stored in Supabase Vault.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_edge_functions_secret') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'cron_edge_functions_secret',
      'Internal authorization token for Supabase Cron to invoke private Edge Functions'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_internal_cron_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_edge_functions_secret'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_internal_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_internal_cron_secret() TO service_role;

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
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_edge_functions_secret')
    ),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('leakage-detector', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/leakage-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_edge_functions_secret')
    ),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('analytics-snapshot', '0 2 * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/analytics-snapshot',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_edge_functions_secret')
    ),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('notification-processor', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://gobdznqbdaklkkqbkynx.supabase.co/functions/v1/notification-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_edge_functions_secret')
    ),
    body := '{}'::jsonb
  );
$$);