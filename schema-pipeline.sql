-- ─── CANDOR — Schema additions for email pipeline ───────────────
-- Run in Supabase SQL Editor

-- 1. Add email column to stripe_connections
--    This is where you store the founder's email address
ALTER TABLE stripe_connections
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add email index for fast lookup
CREATE INDEX IF NOT EXISTS idx_stripe_connections_email
  ON stripe_connections (email);

-- 3. Helper function: atomic increment for emails_sent counter
--    Used by weekly-job to increment trial.emails_sent safely
CREATE OR REPLACE FUNCTION increment(row_id TEXT, amount INT DEFAULT 1)
RETURNS VOID AS $$
  UPDATE trials
  SET emails_sent = emails_sent + amount
  WHERE company_id = row_id;
$$ LANGUAGE SQL;

-- 4. Add run log table to track cron execution
--    Lets you verify cron fired without checking email inboxes
CREATE TABLE IF NOT EXISTS cron_runs (
  id          SERIAL      PRIMARY KEY,
  ran_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  sent        INTEGER     NOT NULL DEFAULT 0,
  failed      INTEGER     NOT NULL DEFAULT 0,
  skipped     INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE cron_runs DISABLE ROW LEVEL SECURITY;
