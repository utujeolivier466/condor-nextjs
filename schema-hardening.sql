-- ─── CANDOR — Hardening schema additions ────────────────────────
-- Run in Supabase SQL Editor

-- 1. Add country + currency columns to stripe_connections
--    These come from Stripe account object during validation
ALTER TABLE stripe_connections
  ADD COLUMN IF NOT EXISTS country          TEXT,
  ADD COLUMN IF NOT EXISTS default_currency TEXT;

-- 2. Populate from existing data (if any rows exist)
--    You'll need to re-validate or manually fill from Stripe dashboard
--    For new accounts: api-onboarding-validate-route.ts saves these automatically

-- 3. Remove demo accounts (clean slate)
--    WARNING: this deletes all demo_ prefixed rows
--    Run only if you want to purge test data
-- DELETE FROM trials             WHERE company_id LIKE 'demo_%';
-- DELETE FROM stripe_connections WHERE company_id LIKE 'demo_%';
-- (commented out — uncomment deliberately)

-- 4. Index for admin view performance
CREATE INDEX IF NOT EXISTS idx_stripe_connections_country
  ON stripe_connections (country);

CREATE INDEX IF NOT EXISTS idx_stripe_connections_currency
  ON stripe_connections (default_currency);
