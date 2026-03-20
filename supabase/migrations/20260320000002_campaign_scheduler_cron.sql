-- Campaign Scheduler via pg_cron
--
-- Triggers campaign-scheduler edge function every 5 minutes.
--
-- ONE-TIME SETUP: Run these two statements once after applying this migration,
-- replacing the values with your actual Supabase project URL and service role key:
--
--   ALTER DATABASE postgres SET "app.supabase_url"     = 'https://YOUR_PROJECT_REF.supabase.co';
--   ALTER DATABASE postgres SET "app.service_role_key" = 'YOUR_SERVICE_ROLE_KEY';
--
-- You can find both values in: Supabase Dashboard → Settings → API

-- Enable pg_cron and pg_net (available on all Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- DB function that pg_cron calls every 5 minutes
CREATE OR REPLACE FUNCTION public.invoke_campaign_scheduler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url  text := current_setting('app.supabase_url',     true);
  v_key  text := current_setting('app.service_role_key', true);
BEGIN
  -- Silently skip if one-time setup has not been run yet
  IF v_url IS NULL OR v_key IS NULL OR v_url = '' OR v_key = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/campaign-scheduler',
    headers := json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )::jsonb,
    body    := '{}'::jsonb
  );
END;
$$;

-- Schedule: every 5 minutes (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('campaign-auto-scheduler')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'campaign-auto-scheduler'
    );

  PERFORM cron.schedule(
    'campaign-auto-scheduler',
    '*/5 * * * *',
    'SELECT public.invoke_campaign_scheduler()'
  );
END;
$$;
