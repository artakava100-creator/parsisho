/*
# User Auction History + Direct Purchase

## New RPCs:
1. get_user_auction_history() — returns all auctions the current user participated in,
   with their click count, total spent, final price, winner info, and result status.
2. process_direct_purchase(p_auction_id) — atomically deducts remaining amount from wallet
   after applying click-expenditure credit, records wallet transaction, logs event.
   Only works for ended auctions where user participated but did not win, and where
   original_price is set and remaining > 0.

## Security:
- Both SECURITY DEFINER, authenticated only.
- All financial values server-authoritative.
*/

-- 1. get_user_auction_history
CREATE OR REPLACE FUNCTION public.get_user_auction_history()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای مشاهده تاریخچه وارد حساب خود شوید');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'auction_id', a.id,
    'title', a.title,
    'product_name', a.product_name,
    'image_url', a.image_url,
    'status', a.status,
    'auction_date', a.auction_date,
    'current_price', a.current_price,
    'original_price', a.original_price,
    'click_cost', a.click_cost,
    'click_increment', a.click_increment,
    'user_click_count', uc.click_count,
    'user_total_spent', uc.click_count * a.click_cost,
    'winner_user_id', a.winner_user_id,
    'winner_name', wp.display_name,
    'is_winner', (a.winner_user_id = auth.uid()),
    'ends_at', a.ends_at
  ) ORDER BY a.ends_at DESC), '[]'::jsonb) INTO v_result
  FROM auctions a
  INNER JOIN (
    SELECT auction_id, count(*) as click_count
    FROM bids
    WHERE user_id = auth.uid()
    GROUP BY auction_id
  ) uc ON uc.auction_id = a.id
  LEFT JOIN profiles wp ON wp.id = a.winner_user_id;

  RETURN jsonb_build_object('success', true, 'history', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_auction_history() TO authenticated;

-- 2. process_direct_purchase
CREATE OR REPLACE FUNCTION public.process_direct_purchase(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_auction auctions%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_user_click_count integer;
  v_credit bigint;
  v_remaining bigint;
  v_tx_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای خرید مستقیم وارد حساب خود شوید');
  END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
  END IF;

  IF v_auction.status != 'ended' THEN
    RETURN jsonb_build_object('success', false, 'error', 'خرید مستقیم فقط پس از پایان مزایده ممکن است');
  END IF;

  IF v_auction.winner_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما برنده این مزایده هستید — نیاز به خرید مستقیم ندارید');
  END IF;

  IF v_auction.original_price IS NULL OR v_auction.original_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'قیمت اصلی کالا مشخص نیست');
  END IF;

  SELECT count(*) INTO v_user_click_count
  FROM bids WHERE auction_id = p_auction_id AND user_id = auth.uid();
  IF v_user_click_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما در این مزایده شرکت نکرده‌اید');
  END IF;

  v_credit := v_user_click_count * v_auction.click_cost;
  v_remaining := v_auction.original_price - v_credit;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'مبلغ باقی‌مانده صفر یا منفی است — خرید مستقیم لازم نیست');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_wallet.available_balance < v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error', 'موجودی پارسی شما برای خرید مستقیم کافی نیست', 'remaining', v_remaining, 'balance', v_wallet.available_balance);
  END IF;

  UPDATE wallets SET available_balance = available_balance - v_remaining WHERE user_id = auth.uid();

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (auth.uid(), 'direct_purchase', v_remaining, v_wallet.available_balance - v_remaining,
    'خرید مستقیم: ' || COALESCE(v_auction.product_name, v_auction.title))
  RETURNING id INTO v_tx_id;

  PERFORM log_auction_event(p_auction_id, 'direct_purchase', auth.uid(),
    jsonb_build_object('credit', v_credit, 'remaining', v_remaining, 'tx_id', v_tx_id));

  RETURN jsonb_build_object(
    'success', true,
    'auction_id', p_auction_id,
    'original_price', v_auction.original_price,
    'credit', v_credit,
    'remaining', v_remaining,
    'new_balance', v_wallet.available_balance - v_remaining
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_direct_purchase(uuid) TO authenticated;
