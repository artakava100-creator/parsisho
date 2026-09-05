-- Stage 1: Guard finalize_auction — only admins can manually finalize a specific auction.
-- finalize_auction(NULL) (the cron/batch path) remains unchanged.
-- No other RPC, schema, frontend, cron config, or data is modified.

CREATE OR REPLACE FUNCTION public.finalize_auction(p_auction_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
v_auction auctions%ROWTYPE;
v_winning_click bids%ROWTYPE;
v_results jsonb[] := ARRAY[]::jsonb[];
v_auction_id uuid;
v_cursor CURSOR FOR
SELECT id FROM auctions
WHERE status IN ('live', 'ending') AND ends_at < now()
ORDER BY ends_at ASC;
BEGIN
IF p_auction_id IS NOT NULL AND NOT is_admin() THEN
  RETURN jsonb_build_object('success', false, 'error', 'دسترسی غیرمجاز');
END IF;

IF p_auction_id IS NOT NULL THEN
SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
IF NOT FOUND THEN
RETURN jsonb_build_object('success', false, 'error', 'مزایده پیدا نشد');
END IF;
IF v_auction.status = 'ended' THEN
RETURN jsonb_build_object('success', true, 'already_ended', true, 'winner_user_id', v_auction.winner_user_id);
END IF;
IF v_auction.status NOT IN ('live', 'ending') THEN
RETURN jsonb_build_object('success', false, 'error', 'مزایده در وضعیت نامعتبر است');
END IF;
IF now() < v_auction.ends_at THEN
RETURN jsonb_build_object('success', false, 'error', 'مزایده هنوز به پایان نرسیده است');
END IF;

UPDATE auctions SET status = 'ended', actual_end_at = now() WHERE id = p_auction_id;
PERFORM log_auction_event(p_auction_id, 'auction_ended', NULL, '{}'::jsonb);

SELECT * INTO v_winning_click FROM bids WHERE auction_id = p_auction_id ORDER BY created_at DESC LIMIT 1;

IF FOUND THEN
UPDATE bids SET is_winning = true WHERE id = v_winning_click.id;
UPDATE auctions SET winner_user_id = v_winning_click.user_id, winning_bid_id = v_winning_click.id WHERE id = p_auction_id;
PERFORM log_auction_event(p_auction_id, 'winner_determined', v_winning_click.user_id,
jsonb_build_object('winning_amount', v_winning_click.amount, 'winning_click_id', v_winning_click.id));

PERFORM create_auction_notification(v_winning_click.user_id, p_auction_id, 'user_won', 'in_app',
'شما برنده مزایده شدید! مبلغ نهایی: ' || v_winning_click.amount::text || ' پارسی');

PERFORM create_auction_notification(b.user_id, p_auction_id, 'user_lost', 'in_app',
'مزایده به پایان رسید. شما برنده نشدید.', jsonb_build_object('direct_purchase_eligible', true))
FROM bids b
WHERE b.auction_id = p_auction_id AND b.user_id != v_winning_click.user_id
GROUP BY b.user_id;

RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id,
'winner_user_id', v_winning_click.user_id, 'winning_click_id', v_winning_click.id,
'winning_amount', v_winning_click.amount);
ELSE
RETURN jsonb_build_object('success', true, 'auction_id', p_auction_id, 'no_clicks', true);
END IF;
ELSE
FOR v_auction_id IN v_cursor LOOP
SELECT * INTO v_auction FROM auctions WHERE id = v_auction_id FOR UPDATE;
IF v_auction.status NOT IN ('live', 'ending') THEN CONTINUE; END IF;

UPDATE auctions SET status = 'ended', actual_end_at = now() WHERE id = v_auction_id;
PERFORM log_auction_event(v_auction_id, 'auction_ended', NULL, '{}'::jsonb);

SELECT * INTO v_winning_click FROM bids WHERE auction_id = v_auction_id ORDER BY created_at DESC LIMIT 1;

IF FOUND THEN
UPDATE bids SET is_winning = true WHERE id = v_winning_click.id;
UPDATE auctions SET winner_user_id = v_winning_click.user_id, winning_bid_id = v_winning_click.id WHERE id = v_auction_id;
PERFORM log_auction_event(v_auction_id, 'winner_determined', v_winning_click.user_id,
jsonb_build_object('winning_amount', v_winning_click.amount));

PERFORM create_auction_notification(v_winning_click.user_id, v_auction_id, 'user_won', 'in_app',
'شما برنده مزایده شدید! مبلغ نهایی: ' || v_winning_click.amount::text || ' پارسی');

v_results := array_append(v_results, jsonb_build_object('success', true,
'auction_id', v_auction_id, 'winner_user_id', v_winning_click.user_id,
'winning_amount', v_winning_click.amount));
ELSE
v_results := array_append(v_results, jsonb_build_object('success', true,
'auction_id', v_auction_id, 'no_clicks', true));
END IF;
END LOOP;
RETURN jsonb_build_object('success', true, 'finalized', to_jsonb(v_results));
END IF;
END;
$$;

-- Preserve existing grants: revoke from PUBLIC/anon/authenticated, grant to authenticated
REVOKE EXECUTE ON FUNCTION public.finalize_auction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_auction(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_auction(uuid) TO authenticated;
