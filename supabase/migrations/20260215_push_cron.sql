-- Enable extensions for scheduled push notifications
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily push notifications at 21:00 KST (12:00 UTC)
SELECT cron.schedule(
  'daily-push-notifications',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xqyoculmqbjhcgyzukgx.supabase.co/functions/v1/send-notifications',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "14828e7ce5e7d4f0bab8b6dcc663600faa63262dd0c91bce23f59ee889649ae3"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
