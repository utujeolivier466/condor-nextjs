import { createClient } from "@supabase/supabase-js";

// ─── Supabase singleton ───────────────────────────────────────────
// Import this wherever you need DB access.
// Usage: import { supabase } from "@/lib/supabase";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role = bypasses RLS, server-only

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }, // server-side, no session persistence needed
});

// ─── Types (mirrors schema.sql) ───────────────────────────────────
export type StripeConnection = {
  company_id:        string;
  stripe_account_id: string;
  connected_at:      string;
  monthly_burn?:     number | null;
  email?:            string | null;
};

export type Trial = {
  company_id:       string;
  started_at?:      string;
  next_email_at:    string;
  status:           "active" | "paused" | "cancelled";
  emails_sent:      number;
};

export type EmailSent = {
  id?:              number;
  company_id:       string;
  sent_at?:         string;
  subject?:         string;
  constraint_text?: string | null;
  health_score?:    "HEALTHY" | "FRAGILE" | "AT_RISK" | null;
};

export type Snapshot = {
  id?:               number;
  company_id:        string;
  computed_at?:      string;
  nrr?:              number | null;
  new_net_arr?:      number | null;
  burn_multiple?:    number | null;
  runway_months?:    number | null;
  activation_rate?:  number | null;
  health_score?:     "HEALTHY" | "FRAGILE" | "AT_RISK" | null;
};
