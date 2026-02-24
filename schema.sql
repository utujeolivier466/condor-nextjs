-- ─── CANDOR — Stripe Connections ────────────────────────────────
-- Only 3 fields. If you're adding more, you're procrastinating.

CREATE TABLE stripe_connections (
  company_id        TEXT        PRIMARY KEY,
  stripe_account_id TEXT        NOT NULL UNIQUE,
  connected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by stripe_account_id (used in callback)
CREATE INDEX idx_stripe_connections_account
  ON stripe_connections (stripe_account_id);


-- ─── CANDOR — Snapshots (prep for /snapshot route) ───────────────
-- Populated after first compute run. Null until then.

CREATE TABLE snapshots (
  id                  SERIAL      PRIMARY KEY,
  company_id          TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The only 5 numbers that matter
  nrr                 NUMERIC(6,2),   -- Net Revenue Retention (%)
  new_net_arr         NUMERIC(12,2),  -- New Net ARR last 30d ($)
  burn_multiple       NUMERIC(6,2),   -- Burn Multiple (x)
  runway_months       NUMERIC(5,1),   -- Runway (months)
  activation_rate     NUMERIC(6,2),   -- Activation → Value Rate (%)

  -- Health score
  health_score        TEXT CHECK (health_score IN ('HEALTHY', 'FRAGILE', 'AT_RISK')),

  UNIQUE (company_id, computed_at)
);

CREATE INDEX idx_snapshots_company
  ON snapshots (company_id, computed_at DESC);
