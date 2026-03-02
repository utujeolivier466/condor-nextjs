-- ─── CANDOR — Full Schema ────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- If you already ran the previous schema.sql, run only the ALTER TABLE line.

-- ── Stripe connections ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_connections (
  company_id                TEXT        PRIMARY KEY,
  stripe_account_id         TEXT        NOT NULL UNIQUE,
  connected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monthly_burn              NUMERIC(12,2),       -- the one manual input
  email                     TEXT,                  -- founder's email for weekly brief
  country                   TEXT,
  default_currency          TEXT,
  verified_at               TIMESTAMPTZ,
  verification_charge_id    TEXT,
  last_seen_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_connections_account
  ON stripe_connections (stripe_account_id);

-- If you already created the table WITHOUT monthly_burn, run this:
-- ALTER TABLE stripe_connections ADD COLUMN IF NOT EXISTS monthly_burn NUMERIC(12,2);


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


-- ── Trials ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trials (
  company_id         TEXT        PRIMARY KEY REFERENCES stripe_connections(company_id),
  status             TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  trial_started_at   TIMESTAMPTZ,
  emails_sent        INTEGER     NOT NULL DEFAULT 0,
  next_email_at     TIMESTAMPTZ,
  last_warning_at   TIMESTAMPTZ,
  started_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trials_company
  ON trials (company_id);

-- ── Subscriptions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                 SERIAL      PRIMARY KEY,
  company_id         TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  status             TEXT        NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  plan               TEXT,
  activated_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company
  ON subscriptions (company_id);

-- ── Emails sent ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails_sent (
  id                SERIAL      PRIMARY KEY,
  company_id        TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  sent_at           TIMESTAMPTZ DEFAULT NOW(),
  subject           TEXT,
  constraint_text   TEXT,
  health_score     TEXT CHECK (health_score IN ('HEALTHY', 'FRAGILE', 'AT_RISK'))
);

CREATE INDEX IF NOT EXISTS idx_emails_sent_company
  ON emails_sent (company_id, sent_at DESC);

-- ── Churn log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS churn_log (
  id             SERIAL      PRIMARY KEY,
  company_id     TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  reason         TEXT,
  cancelled_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_churn_log_company
  ON churn_log (company_id);


-- ── Row Level Security (recommended) ─────────────────────────────
-- Disable RLS since we use service role key (bypasses it anyway).
-- Enable only if you add user auth later.
ALTER TABLE stripe_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots          DISABLE ROW LEVEL SECURITY;
ALTER TABLE trials             DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions      DISABLE ROW LEVEL SECURITY;
ALTER TABLE emails_sent        DISABLE ROW LEVEL SECURITY;
ALTER TABLE churn_log          DISABLE ROW LEVEL SECURITY;
