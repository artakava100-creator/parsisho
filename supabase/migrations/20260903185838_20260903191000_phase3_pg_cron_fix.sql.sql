/*
# Phase 3 — Marketplace Catalog Control (fix: pg_cron schedule syntax)

Fixes the pg_cron.schedule call to use a string literal instead of dollar-quoted body.
All other SQL is identical to the first attempt (which committed successfully before the error).
Uses DROP IF EXISTS + CREATE IF NOT EXISTS for idempotency.
*/

-- Unschedule old job if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('publish_scheduled_products_job');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'unschedule skipped: %', SQLERRM;
END $$;

-- Reschedule with proper string literal
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'publish_scheduled_products_job',
      '* * * * *',
      'SELECT public.publish_scheduled_products()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;