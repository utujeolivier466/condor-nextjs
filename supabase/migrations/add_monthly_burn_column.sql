-- Migration: Add monthly_burn column to stripe_connections
-- Run this in Supabase SQL Editor to fix the schema cache error

-- Add the monthly_burn column if it doesn't exist
ALTER TABLE stripe_connections ADD COLUMN IF NOT EXISTS monthly_burn NUMERIC(12,2);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stripe_connections' AND column_name = 'monthly_burn';
