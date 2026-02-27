-- ─── CANDOR — Trial system schema additions ──────────────────────
-- Run in Supabase SQL Editor

-- 1. Add trial_started_at column to trials table
--    NULL = trial hasn't started yet (no email sent)
--    Set once when first email fires. Never updated again.
ALTER TABLE trials
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- 2. Replace old increment() function with emails_sent specific version
--    (avoids ambiguity with previous increment function)
CREATE OR REPLACE FUNCTION increment_emails_sent(company_id_input TEXT)
RETURNS VOID AS $$
  UPDATE trials
  SET emails_sent = emails_sent + 1
  WHERE company_id = company_id_input;
$$ LANGUAGE SQL;

-- 3. Index for fast trial expiry checks
CREATE INDEX IF NOT EXISTS idx_trials_trial_started
  ON trials (trial_started_at)
  WHERE trial_started_at IS NOT NULL;

-- 4. View: current trial status for all companies (useful for monitoring)
CREATE OR REPLACE VIEW trial_status AS
SELECT
  t.company_id,
  t.status,
  t.trial_started_at,
  t.emails_sent,
  t.next_email_at,
  CASE
    WHEN s.status = 'active'                                                THEN 'paid'
    WHEN t.trial_started_at IS NULL                                         THEN 'pre_trial'
    WHEN t.trial_started_at + INTERVAL '7 days' > NOW()                     THEN 'active'
    ELSE 'expired'
  END AS trial_state,
  CASE
    WHEN t.trial_started_at IS NOT NULL AND t.trial_started_at + INTERVAL '7 days' > NOW()
    THEN EXTRACT(DAY FROM (t.trial_started_at + INTERVAL '7 days') - NOW())::INTEGER
    ELSE 0
  END AS days_remaining
FROM trials t
LEFT JOIN subscriptions s ON s.company_id = t.company_id;
