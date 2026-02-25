-- ─── CANDOR — Schema additions for email flow ───────────────────
-- Run in Supabase SQL Editor (in addition to previous schema.sql)

-- ── Trials ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trials (
  company_id     TEXT        PRIMARY KEY REFERENCES stripe_connections(company_id),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_email_at  TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'cancelled', 'paused')),
  emails_sent    INTEGER     NOT NULL DEFAULT 0
);

-- ── Emails sent log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails_sent (
  id               SERIAL      PRIMARY KEY,
  company_id       TEXT        NOT NULL REFERENCES stripe_connections(company_id),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subject          TEXT,
  constraint_text  TEXT,        -- the one hard sentence
  health_score     TEXT CHECK (health_score IN ('HEALTHY', 'FRAGILE', 'AT_RISK'))
);

CREATE INDEX IF NOT EXISTS idx_emails_sent_company
  ON emails_sent (company_id, sent_at DESC);

-- ── Disable RLS (service role bypasses anyway) ────────────────────
ALTER TABLE trials      DISABLE ROW LEVEL SECURITY;
ALTER TABLE emails_sent DISABLE ROW LEVEL SECURITY;
