-- ─── CANDOR — Onboarding verification columns ───────────────────
-- Run in Supabase SQL Editor

ALTER TABLE stripe_connections
  ADD COLUMN IF NOT EXISTS verified_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_charge_id  TEXT;

-- Index: quickly find verified accounts
CREATE INDEX IF NOT EXISTS idx_stripe_connections_verified
  ON stripe_connections (verified_at)
  WHERE verified_at IS NOT NULL;
