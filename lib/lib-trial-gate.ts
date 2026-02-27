import { supabase } from "./supabase";

// ─── lib/trial-gate.ts ────────────────────────────────────────────
// Single source of truth for trial state.
// Trial starts when first email is sent. Expires 7 days later. Full stop.
//
// States:
//   "pre_trial"  — Stripe connected, no email sent yet (free flow)
//   "active"     — trial started, within 7 days
//   "expired"    — 7 days past first email, no payment
//   "paid"       — active subscription

export type TrialState =
  | { status: "pre_trial" }
  | { status: "active";  started_at: Date; expires_at: Date; days_remaining: number }
  | { status: "expired"; started_at: Date; expired_at: Date }
  | { status: "paid" }
  | { status: "demo" }
  | { status: "unknown" };

export const TRIAL_DAYS = 7;

// ─── Get current trial state for a company ───────────────────────
export async function getTrialState(companyId: string): Promise<TrialState> {
  if (!companyId) return { status: "unknown" };
  if (companyId.startsWith("demo_")) return { status: "demo" };

  // Check for active subscription first — paid trumps everything
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("company_id", companyId)
    .single();

  if (sub?.status === "active") return { status: "paid" };

  // Check trial record
  const { data: trial } = await supabase
    .from("trials")
    .select("started_at, trial_started_at, status, emails_sent")
    .eq("company_id", companyId)
    .single();

  if (!trial) return { status: "pre_trial" };

  // Trial starts when first email is sent
  if (!trial.trial_started_at) return { status: "pre_trial" };

  const started_at  = new Date(trial.trial_started_at);
  const expires_at  = new Date(started_at.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const now         = new Date();

  if (now < expires_at) {
    const ms_remaining  = expires_at.getTime() - now.getTime();
    const days_remaining = Math.ceil(ms_remaining / (24 * 60 * 60 * 1000));
    return { status: "active", started_at, expires_at, days_remaining };
  }

  return { status: "expired", started_at, expired_at: expires_at };
}

// ─── Mark trial as started (called when first email sends) ────────
export async function startTrial(companyId: string): Promise<void> {
  await supabase
    .from("trials")
    .update({ trial_started_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .is("trial_started_at", null); // only set once — idempotent
}

// ─── Check if company can receive emails ──────────────────────────
export async function canReceiveEmail(companyId: string): Promise<boolean> {
  const state = await getTrialState(companyId);
  return state.status === "active" || state.status === "paid" || state.status === "demo";
}

// ─── Check if company can access app ──────────────────────────────
export async function canAccessApp(companyId: string): Promise<boolean> {
  const state = await getTrialState(companyId);
  // expired = read-only (can access but sees banner)
  return state.status !== "unknown" && state.status !== "pre_trial";
}
