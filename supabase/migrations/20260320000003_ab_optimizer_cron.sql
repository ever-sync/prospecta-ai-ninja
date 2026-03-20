-- A/B Optimizer Weekly Cron
--
-- Calls whatsapp-optimize-variants every Monday at 09:00 UTC with service-role key
-- so it runs for ALL users that have A/B experiment groups.
--
-- Requires the one-time DB settings (see 20260320000002_campaign_scheduler_cron.sql):
--   ALTER DATABASE postgres SET "app.supabase_url"     = 'https://YOUR_PROJECT_REF.supabase.co';
--   ALTER DATABASE postgres SET "app.service_role_key" = 'YOUR_SERVICE_ROLE_KEY';

-- Enable pg_cron and pg_net (available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.invoke_ab_optimizer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url  text := current_setting('app.supabase_url',     true);
  v_key  text := current_setting('app.service_role_key', true);
BEGIN
  IF v_url IS NULL OR v_key IS NULL OR v_url = '' OR v_key = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/whatsapp-optimize-variants',
    headers := json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )::jsonb,
    body    := json_build_object(
      'mode',                 'auto',
      'lookback_days',        14,
      'min_sent_per_variant', 20
    )::jsonb
  );
END;
$$;

-- Schedule: every Monday at 09:00 UTC (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('ab-optimizer-weekly')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'ab-optimizer-weekly'
    );

  PERFORM cron.schedule(
    'ab-optimizer-weekly',
    '0 9 * * 1',
    'SELECT public.invoke_ab_optimizer()'
  );
END;
$$;
