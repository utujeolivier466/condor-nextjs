-- ─── CANDOR — Engine v2 schema additions ────────────────────────
-- Run in Supabase SQL Editor

-- 1. Cache detected core action on stripe_connections
--    Avoids re-running detection every week unnecessarily
ALTER TABLE stripe_connections
  ADD COLUMN IF NOT EXISTS detected_core_action   TEXT,
  ADD COLUMN IF NOT EXISTS business_model         TEXT CHECK (business_model IN ('subscription', 'transactional')),
  ADD COLUMN IF NOT EXISTS core_action_updated_at TIMESTAMPTZ;

-- 2. Add forward_score to snapshots table
--    Lets you track how the score moves over time
ALTER TABLE snapshots
  ADD COLUMN IF NOT EXISTS forward_score   INTEGER,
  ADD COLUMN IF NOT EXISTS business_model  TEXT,
  ADD COLUMN IF NOT EXISTS core_action     TEXT;

-- 3. MRR snapshots table
--    Stores point-in-time MRR per company for trend analysis
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id           SERIAL      PRIMARY KEY,
  company_id   TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  taken_at     TIMESTAMPTZ NOT NULL,
  total_mrr    NUMERIC(12,2) NOT NULL,
  customer_count INTEGER   NOT NULL DEFAULT 0,
  expansion    NUMERIC(12,2) NOT NULL DEFAULT 0,
  contraction  NUMERIC(12,2) NOT NULL DEFAULT 0,
  churn        NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_mrr      NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_company
  ON mrr_snapshots (company_id, taken_at DESC);

ALTER TABLE mrr_snapshots DISABLE ROW LEVEL SECURITY;
