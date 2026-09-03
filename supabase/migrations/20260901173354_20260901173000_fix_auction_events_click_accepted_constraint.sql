-- Fix: add 'click_accepted' to the auction_events event_type CHECK constraint.
-- The place_click() function logs 'click_accepted' but the CHECK constraint
-- only allowed 'bid_accepted', causing every click transaction to fail and roll back.

ALTER TABLE auction_events DROP CONSTRAINT auction_events_event_type_check;
ALTER TABLE auction_events ADD CONSTRAINT auction_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'auction_created'::text, 'auction_scheduled'::text, 'auction_published'::text,
    'auction_started'::text, 'bid_accepted'::text, 'bid_rejected'::text,
    'click_accepted'::text,
    'extension_triggered'::text, 'extension_consumed'::text,
    'auction_ending'::text, 'auction_ended'::text, 'winner_determined'::text,
    'auction_cancelled'::text, 'auto_activated'::text
  ]));
