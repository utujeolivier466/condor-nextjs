-- ─── CANDOR — Full Schema (Complete) ─────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- This includes ALL tables needed for the application to work.

-- ── Stripe connections ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_connections (
  company_id        TEXT        PRIMARY KEY,
  stripe_account_id TEXT        NOT NULL UNIQUE,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monthly_burn      NUMERIC(12,2),       -- the one manual input
  email             TEXT                  -- founder's email for weekly brief
);

CREATE INDEX IF NOT EXISTS idx_stripe_connections_account
  ON stripe_connections (stripe_account_id);

-- ── Trials ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trials (
  company_id       TEXT        PRIMARY KEY REFERENCES stripe_connections(company_id),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_email_at    TIMESTAMPTZ NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  emails_sent      INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_trials_status
  ON trials (status);

CREATE INDEX IF NOT EXISTS idx_trials_next_email
  ON trials (next_email_at);

-- ── Emails sent log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails_sent (
  id               SERIAL      PRIMARY KEY,
  company_id       TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subject          TEXT        NOT NULL,
  constraint_text  TEXT,
  health_score     TEXT
);

CREATE INDEX IF NOT EXISTS idx_emails_sent_company
  ON emails_sent (company_id, sent_at DESC);

-- ── Snapshots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshots (
  id               SERIAL      PRIMARY KEY,
  company_id       TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The 5 numbers
  nrr              NUMERIC(6,2),
  new_net_arr      NUMERIC(12,2),
  burn_multiple    NUMERIC(6,2),
  runway_months    NUMERIC(5,1),
  activation_rate  NUMERIC(6,2),

  -- Health score
  health_score     TEXT CHECK (health_score IN ('HEALTHY', 'FRAGILE', 'AT_RISK')),

  UNIQUE (company_id, computed_at)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_company
  ON snapshots (company_id, computed_at DESC);

-- ── Row Level Security (disabled since we use service role) ────────────
ALTER TABLE stripe_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE trials              DISABLE ROW LEVEL SECURITY;
ALTER TABLE emails_sent         DISABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots          DISABLE ROW LEVEL SECURITY;

-- ── Helper function to increment emails_sent ───────────────────────────
-- This is used by lib-weekly-job.ts
CREATE OR REPLACE FUNCTION increment_emails_sent(p_company_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE trials
  SET emails_sent = emails_sent + 1
  WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql;
