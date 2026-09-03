/*
# Phase 2C — Guess It Server-Side Game Engine

## Purpose
Implement the complete server-side transaction for one "Guess It / حدس بزن"
attempt. A single narrowly scoped SECURITY DEFINER RPC — `submit_guess_attempt` —
atomically validates the round, checks eligibility, deducts the Parsi entry fee,
creates a game entry, validates the submitted answer SERVER-SIDE, creates an
authoritative game result, and marks qualification status.

The raffle/draw itself is NOT implemented in this phase.

## 1. New Functions

### normalize_guess_answer(p_answer text, p_answer_type text)
SECURITY DEFINER helper. Normalizes a submitted or reference answer for
comparison:
- Collapses repeated whitespace, trims leading/trailing whitespace.
- For text answers: converts Arabic Yeh (ي) to Persian Yeh (ی), Arabic
  Kaf (ك) to Persian Kaf (ک), and Arabic letter marks (tashkeel/diacritics)
  to their base forms. Does NOT do fuzzy/AI matching.
- For number answers: converts Persian/Arabic digits to Latin digits, then
  compares the resulting numeric value (leading zeros stripped).
Returns the normalized string.

### submit_guess_attempt(p_round_id uuid, p_submitted_answer text, p_idempotency_key text)
SECURITY DEFINER. Processes exactly one Guess It attempt atomically.

Flow:
  1. Authenticate (auth.uid() must be non-null)
  2. Validate inputs (round_id, submitted_answer non-empty)
  3. Lock the round row; verify:
     - round exists
     - round belongs to the `guess_it` game
     - round status = 'active'
     - server time is within starts_at..ends_at
     - entry_fee is valid (>= 0)
  4. Check entry limit (max_entries_per_user) with row-level locking
     on game_entries to prevent races
  5. Idempotency: if p_idempotency_key matches an existing entry,
     return the previously created result (no second charge)
  6. Lock the wallet row; verify sufficient balance
  7. Deduct entry fee, create `game_entry` wallet transaction (negative amount)
  8. Create game_entries row with qualification_status
  9. Validate answer SERVER-SIDE (never expose correct_answer to client)
 10. Create game_results row (qualified/incorrect)
 11. Link wallet_transaction_id back onto game_entries
 12. Return safe fields only: entry_id, result_id, is_correct,
     qualification_status, result_type, message

## 2. Security
- Both functions are SECURITY DEFINER with SET search_path = public.
- User identity derived from auth.uid() — p_user_id is NOT accepted.
- EXECUTE revoked from PUBLIC and anon; granted to authenticated only.
- correct_answer, accepted_answers, original_image_path are NEVER returned.
- No dynamic SQL is used.
- No client-created results, wallet transactions, or winners.

## 3. Atomicity
The entire operation runs inside a single PL/pgSQL function call, which is
implicitly a single transaction. Either ALL operations succeed or NONE commit.
The wallet row is locked with FOR UPDATE before any deduction. The round row
is locked with FOR UPDATE. Entry limits are enforced with a separate FOR UPDATE
lock on the existing entry row (or the unique partial index catches duplicates).

## 4. Idempotency
game_entries.idempotency_key has a partial UNIQUE index
idx_game_entries_idempotency on (round_id, user_id, idempotency_key)
WHERE idempotency_key IS NOT NULL. A repeated request with the same key
hits this constraint. The function catches the exception and returns the
previously created result.

## 5. Entry Limit
The partial UNIQUE index idx_game_entries_round_user_unique on (round_id, user_id)
WHERE idempotency_key IS NULL enforces max_entries_per_user = 1 at the DB level.
For rounds where max_entries_per_user > 1, the function counts existing entries
with a lock.

## 6. No Changes to Existing Systems
- No wallet architecture changes
- No auction RPC changes
- No payment RPC changes
- No auth changes
- No existing wallet table modifications
- No Phase 2B admin UI changes
- No Excitement Land user UI changes
- No frontend file changes
*/

-- ============================================================
-- 1. normalize_guess_answer() — SECURITY DEFINER helper
--    Normalizes a submitted or reference answer for comparison.
--    Text: whitespace + Arabic→Persian character normalization.
--    Number: Persian/Arabic digits → Latin, numeric comparison.
-- ============================================================
CREATE OR REPLACE FUNCTION normalize_guess_answer(p_answer text, p_answer_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result text;
BEGIN
  IF p_answer IS NULL THEN
    RETURN NULL;
  END IF;

  v_result := p_answer;

  -- Trim leading/trailing whitespace and collapse repeated whitespace
  v_result := btrim(v_result);
  v_result := regexp_replace(v_result, '\s+', ' ', 'g');

  IF p_answer_type = 'number' THEN
    -- Convert Persian digits (۰۱۲۳۴۵۶۷۸۹) to Latin
    v_result := translate(v_result, '۰۱۲۳۴۵۶۷۸۹', '0123456789');
    -- Convert Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to Latin
    v_result := translate(v_result, '٠١٢٣٤٥٦٧٨٩', '0123456789');
    -- Remove any remaining non-digit characters (spaces, commas, etc.)
    v_result := regexp_replace(v_result, '[^0-9]', '', 'g');
    -- Strip leading zeros for numeric comparison
    v_result := ltrim(v_result, '0');
    -- If empty after stripping (was "0" or "000"), return '0'
    IF v_result = '' THEN
      v_result := '0';
    END IF;
  ELSE
    -- Text answer: normalize Arabic characters to Persian equivalents
    -- Arabic Yeh (ي, U+064A) → Persian Yeh (ی, U+06CC)
    v_result := translate(v_result, 'ي', 'ی');
    -- Arabic Kaf (ك, U+0643) → Persian Kaf (ک, U+06A9)
    v_result := translate(v_result, 'ك', 'ک');
    -- Remove Arabic tashkeel/diacritics (harakat)
    -- U+064B-U+0652 (tanwin, fatha, damma, kasra, sukun, shadda, dammatan, kasratan, fathatan)
    v_result := regexp_replace(v_result, '[\u064B-\u0652]', '', 'g');
    -- Remove tatweel/kashida (ـ, U+0640)
    v_result := translate(v_result, 'ـ', '');
    -- Normalize Arabic letter Alef with Hamza above (أ إ آ) to plain Alef (ا)
    v_result := translate(v_result, 'أإآ', 'ااا');
    -- Normalize Arabic Yeh with hamza (ئ) to Persian Yeh (ی)
    v_result := translate(v_result, 'ئ', 'ی');
    -- Convert Arabic letter Hamza on line (ء) — keep as-is, it's valid
    -- Final trim after all replacements
    v_result := btrim(v_result);
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION normalize_guess_answer(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION normalize_guess_answer(text, text) FROM anon;
-- Not granted to authenticated — internal helper, only called by submit_guess_attempt


-- ============================================================
-- 2. submit_guess_attempt() — the main RPC
--    Processes exactly one Guess It attempt atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION submit_guess_attempt(
  p_round_id uuid,
  p_submitted_answer text,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_round game_rounds%ROWTYPE;
  v_game games%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_existing_entry game_entries%ROWTYPE;
  v_existing_result game_results%ROWTYPE;
  v_entry_count integer;
  v_new_balance bigint;
  v_tx_id uuid;
  v_entry_id uuid;
  v_result_id uuid;
  v_is_correct boolean;
  v_qualification_status text;
  v_result_type text;
  v_norm_submitted text;
  v_norm_correct text;
  v_norm_accepted text;
  v_answer_match boolean;
  v_accepted_answer text;
  v_message text;
BEGIN
  -- ========================================================
  -- STEP 1: Authentication
  -- ========================================================
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'برای شرکت در بازی حدس بزن وارد حساب خود شوید');
  END IF;

  -- ========================================================
  -- STEP 2: Input validation
  -- ========================================================
  IF p_round_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'شناسه دور الزامی است');
  END IF;

  IF p_submitted_answer IS NULL OR length(btrim(p_submitted_answer)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'پاسخ الزامی است');
  END IF;

  -- Idempotency key, if provided, must not be empty after trim
  IF p_idempotency_key IS NOT NULL AND length(btrim(p_idempotency_key)) = 0 THEN
    p_idempotency_key := NULL;
  END IF;

  -- ========================================================
  -- STEP 3: Lock and validate the round
  -- ========================================================
  SELECT * INTO v_round
  FROM game_rounds
  WHERE id = p_round_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'دور بازی پیدا نشد');
  END IF;

  -- Round must belong to the guess_it game
  SELECT * INTO v_game FROM games WHERE id = v_round.game_id;
  IF NOT FOUND OR v_game.game_type != 'guess_it' THEN
    RETURN jsonb_build_object('success', false, 'error', 'این دور متعلق به بازی حدس بزن نیست');
  END IF;

  -- Round status must be active
  IF v_round.status != 'active' THEN
    IF v_round.status IN ('draft', 'scheduled') THEN
      RETURN jsonb_build_object('success', false, 'error', 'این دور هنوز شروع نشده است');
    ELSIF v_round.status IN ('ended', 'drawn') THEN
      RETURN jsonb_build_object('success', false, 'error', 'این دور به پایان رسیده است');
    ELSIF v_round.status = 'cancelled' THEN
      RETURN jsonb_build_object('success', false, 'error', 'این دور لغو شده است');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'این دور در وضعیت نامعتبر است');
  END IF;

  -- Server time must be within the round window
  IF now() < v_round.starts_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'این دور هنوز شروع نشده است');
  END IF;
  IF now() > v_round.ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'این دور به پایان رسیده است');
  END IF;

  -- Entry fee must be valid
  IF v_round.entry_fee < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'هزینه ورود این دور نامعتبر است');
  END IF;

  -- ========================================================
  -- STEP 4: Idempotency check
  -- If the same (round_id, user_id, idempotency_key) already exists,
  -- return the previously created result — no second charge.
  -- ========================================================
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_entry
    FROM game_entries
    WHERE round_id = p_round_id
      AND user_id = v_user_id
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF FOUND THEN
      -- Return the existing result for this entry
      SELECT * INTO v_existing_result
      FROM game_results
      WHERE entry_id = v_existing_entry.id
      LIMIT 1;

      RETURN jsonb_build_object(
        'success', true,
        'entry_id', v_existing_entry.id,
        'result_id', CASE WHEN v_existing_result.id IS NOT NULL THEN v_existing_result.id ELSE NULL END,
        'is_correct', CASE WHEN v_existing_result.id IS NOT NULL THEN v_existing_result.is_correct ELSE NULL END,
        'qualification_status', v_existing_entry.qualification_status,
        'result_type', CASE WHEN v_existing_result.id IS NOT NULL THEN v_existing_result.result_type ELSE NULL END,
        'message', 'این پاسخ قبلاً ثبت شده است',
        'idempotent_replay', true
      );
    END IF;
  END IF;

  -- ========================================================
  -- STEP 5: Entry limit check
  -- Prevent race conditions with row-level locking.
  -- ========================================================
  -- Lock any existing entries for this user+round to serialize concurrent attempts
  SELECT * INTO v_existing_entry
  FROM game_entries
  WHERE round_id = p_round_id
    AND user_id = v_user_id
  FOR UPDATE;

  -- Count existing entries
  SELECT count(*) INTO v_entry_count
  FROM game_entries
  WHERE round_id = p_round_id
    AND user_id = v_user_id;

  IF v_entry_count >= v_round.max_entries_per_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'شما به حداکثر تعداد شرکت در این دور رسیده‌اید');
  END IF;

  -- ========================================================
  -- STEP 6: Validate user eligibility
  -- ========================================================
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  IF NOT FOUND OR v_profile.account_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'حساب شما در حال حاضر اجازه شرکت در بازی را ندارد');
  END IF;

  -- ========================================================
  -- STEP 7: Lock wallet and check balance
  -- ========================================================
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create wallet if it doesn't exist (balance will be 0)
    INSERT INTO wallets (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_wallet
    FROM wallets
    WHERE user_id = v_user_id
    FOR UPDATE;
  END IF;

  IF v_wallet.available_balance < v_round.entry_fee THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'موجودی پارسی شما برای شرکت در این دور کافی نیست',
      'entry_fee', v_round.entry_fee,
      'balance', v_wallet.available_balance
    );
  END IF;

  -- ========================================================
  -- STEP 8: Deduct entry fee and create wallet transaction
  -- ========================================================
  v_new_balance := v_wallet.available_balance - v_round.entry_fee;

  UPDATE wallets
  SET available_balance = v_new_balance
  WHERE user_id = v_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (
    v_user_id,
    'game_entry',
    -(v_round.entry_fee),
    v_new_balance,
    'هزینه شرکت در دور حدس بزن: ' || v_round.title
  )
  RETURNING id INTO v_tx_id;

  -- ========================================================
  -- STEP 9: Validate answer SERVER-SIDE
  -- The correct answer is read from the round row (already locked).
  -- It is NEVER returned to the client.
  -- ========================================================
  v_norm_submitted := normalize_guess_answer(p_submitted_answer, v_round.answer_type);
  v_norm_correct := normalize_guess_answer(v_round.correct_answer, v_round.answer_type);

  v_answer_match := (v_norm_submitted = v_norm_correct);

  -- Also check accepted_answers array
  IF NOT v_answer_match AND array_length(v_round.accepted_answers, 1) IS NOT NULL THEN
    FOREACH v_accepted_answer IN ARRAY v_round.accepted_answers LOOP
      v_norm_accepted := normalize_guess_answer(v_accepted_answer, v_round.answer_type);
      IF v_norm_submitted = v_norm_accepted THEN
        v_answer_match := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- ========================================================
  -- STEP 10: Determine qualification status and result type
  -- ========================================================
  IF v_answer_match THEN
    v_qualification_status := 'qualified';
    v_result_type := 'qualified';
    v_is_correct := true;
    v_message := 'پاسخ شما صحیح است و برای قرعه‌کشی واجد شرایط شدید';
  ELSE
    v_qualification_status := 'not_qualified';
    v_result_type := 'incorrect';
    v_is_correct := false;
    v_message := 'پاسخ شما صحیح نبود';
  END IF;

  -- ========================================================
  -- STEP 11: Create game_entries record
  -- ========================================================
  INSERT INTO game_entries (
    game_id, round_id, user_id, entry_fee,
    wallet_transaction_id, submitted_answer,
    qualification_status, idempotency_key
  )
  VALUES (
    v_round.game_id, p_round_id, v_user_id, v_round.entry_fee,
    v_tx_id, p_submitted_answer,
    v_qualification_status, p_idempotency_key
  )
  RETURNING id INTO v_entry_id;

  -- ========================================================
  -- STEP 12: Create authoritative game_results record
  -- ========================================================
  INSERT INTO game_results (
    entry_id, result_type, is_correct, reward_amount, result_data
  )
  VALUES (
    v_entry_id,
    v_result_type,
    v_is_correct,
    0,
    jsonb_build_object('round_id', p_round_id, 'game_type', 'guess_it')
  )
  RETURNING id INTO v_result_id;

  -- ========================================================
  -- STEP 13: Return safe response (no private fields)
  -- ========================================================
  RETURN jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'result_id', v_result_id,
    'is_correct', v_is_correct,
    'qualification_status', v_qualification_status,
    'result_type', v_result_type,
    'message', v_message,
    'new_balance', v_new_balance
  );

EXCEPTION
  -- Catch unique violation from idempotency or entry-limit indexes
  -- (race condition: another concurrent request inserted first)
  WHEN unique_violation THEN
    -- If we already created the wallet transaction, we need to undo it
    -- However, in practice the unique violation will happen at the game_entries
    -- INSERT (step 11), which is AFTER the wallet deduction (step 8).
    -- The EXCEPTION block causes the entire function's transaction to roll back,
    -- undoing the wallet deduction as well. This is the correct behavior:
    -- the concurrent request that won gets to keep its charge; we roll back ours.
    --
    -- Now try to return the winning request's result
    SELECT * INTO v_existing_entry
    FROM game_entries
    WHERE round_id = p_round_id
      AND user_id = v_user_id
      AND (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key
           OR p_idempotency_key IS NULL)
    LIMIT 1;

    IF FOUND THEN
      SELECT * INTO v_existing_result
      FROM game_results
      WHERE entry_id = v_existing_entry.id
      LIMIT 1;

      RETURN jsonb_build_object(
        'success', true,
        'entry_id', v_existing_entry.id,
        'result_id', CASE WHEN v_existing_result.id IS NOT NULL THEN v_existing_result.id ELSE NULL END,
        'is_correct', CASE WHEN v_existing_result.id IS NOT NULL THEN v_existing_result.is_correct ELSE NULL END,
        'qualification_status', v_existing_entry.qualification_status,
        'result_type', CASE WHEN v_existing_result.id IS NOT NULL THEN v_existing_result.result_type ELSE NULL END,
        'message', 'این پاسخ قبلاً ثبت شده است',
        'idempotent_replay', true
      );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'درخواست تکراری ثبت شد — لطفاً دوباره تلاش کنید');
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_guess_attempt(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION submit_guess_attempt(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION submit_guess_attempt(uuid, text, text) TO authenticated;
