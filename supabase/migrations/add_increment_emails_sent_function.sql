-- Add the increment_emails_sent RPC function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_emails_sent(p_company_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE trials
  SET emails_sent = emails_sent + 1
  WHERE company_id = p_company_id;
END;
$$;
