-- Raise the per-auction media limit from 5 to 7
CREATE OR REPLACE FUNCTION public.enforce_auction_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.auction_media
  WHERE auction_id = NEW.auction_id;

  IF v_count >= 7 THEN
    RAISE EXCEPTION 'حداکثر ۷ تصویر برای هر مزایده مجاز است';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_auction_media_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_auction_media_limit() FROM anon, authenticated;
