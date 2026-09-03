-- 1. Add 'auction_click' to the wallet_transactions type CHECK constraint
ALTER TABLE wallet_transactions DROP CONSTRAINT wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type = ANY (ARRAY[
    'deposit'::text, 'withdrawal'::text, 'auction_bid'::text, 'auction_click'::text,
    'auction_refund'::text, 'direct_purchase'::text, 'reward'::text,
    'daily_reward'::text, 'referral_reward'::text, 'admin_adjustment'::text
  ]));

-- 2. Fix place_click: invert the participant_count condition
-- v_is_new_participant is TRUE when user already has clicks → should NOT increment
-- v_is_new_participant is FALSE when user has NO clicks → SHOULD increment
-- The old code had: CASE WHEN v_is_new_participant THEN participant_count ELSE participant_count + 1 END
--   which increments when user already exists (wrong) and doesn't increment for new users (wrong)
-- Correct: CASE WHEN v_is_new_participant THEN participant_count ELSE participant_count + 1 END
-- Wait — actually the old code IS correct:
--   WHEN v_is_new_participant (true = already has clicks) THEN keep same count
--   ELSE (false = no prior clicks) THEN increment
-- But wait, the variable name is confusing. Let me re-check:
--   SELECT EXISTS(SELECT 1 FROM bids WHERE ... AND user_id = auth.uid()) INTO v_is_new_participant
--   If user HAS clicked before → EXISTS returns TRUE → v_is_new_participant = TRUE
--   The CASE: WHEN TRUE THEN participant_count (don't increment) ← WRONG, this is correct for existing users
--   WHEN FALSE THEN participant_count + 1 (increment) ← correct for new users
-- Actually the logic IS correct. The variable name is misleading but the logic works.
-- Let me NOT change this.

-- Actually wait, re-reading more carefully:
-- "v_is_new_participant" = TRUE means "this user IS a new participant" — but EXISTS returns TRUE when they HAVE rows
-- So the name is backwards. EXISTS = TRUE means they ARE already a participant (not new).
-- The CASE says: WHEN v_is_new_participant (= TRUE = already exists) THEN don't increment
-- That's actually CORRECT behavior despite the confusing variable name.
-- No change needed for participant_count.
