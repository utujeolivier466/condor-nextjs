-- ─── CANDOR — Full Schema ────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- If you already ran the previous schema.sql, run only the ALTER TABLE line.

-- ── Stripe connections ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_connections (
  company_id        TEXT        PRIMARY KEY,
  stripe_account_id TEXT        NOT NULL UNIQUE,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monthly_burn      NUMERIC(12,2)         -- added: the one manual input
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


-- ── Row Level Security (recommended) ─────────────────────────────
-- Disable RLS since we use service role key (bypasses it anyway).
-- Enable only if you add user auth later.
ALTER TABLE stripe_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots          DISABLE ROW LEVEL SECURITY;
