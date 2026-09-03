-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule the finalization job to run every minute
SELECT cron.schedule(
  'finalize-expired-auctions',
  '* * * * *',
  $$SELECT finalize_auction(NULL);$$
);
