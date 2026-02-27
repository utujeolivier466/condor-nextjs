-- ─── CANDOR — Monetization Schema ───────────────────────────────
-- Run in Supabase SQL Editor

-- ── Subscriptions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  company_id              TEXT        PRIMARY KEY REFERENCES stripe_connections(company_id),
  stripe_subscription_id  TEXT        NOT NULL UNIQUE,
  stripe_customer_id      TEXT        NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active', 'past_due', 'cancelled')),
  plan                    TEXT        NOT NULL CHECK (plan IN ('monthly', 'annual')),
  activated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end      TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ
);

ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- ── Churn log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS churn_log (
  id           SERIAL      PRIMARY KEY,
  company_id   TEXT        NOT NULL,
  reason       TEXT        NOT NULL,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE churn_log DISABLE ROW LEVEL SECURITY;

-- ── Add last_seen_at to stripe_connections (for engagement tracking)
ALTER TABLE stripe_connections
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- ── Add daily churn cron to cron_runs ────────────────────────────
-- (Just the log table — cron config is in vercel.json)
