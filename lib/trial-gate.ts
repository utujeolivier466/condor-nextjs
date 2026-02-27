import { supabase } from "./supabase";

export type TrialState = {
  status: "demo" | "paid" | "active" | "pre_trial" | "expired";
  daysRemaining?: number;
};

export async function getTrialState(companyId: string): Promise<TrialState> {
  // First check if they have an active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("company_id", companyId)
    .eq("status", "active")
    .single();

  if (subscription) {
    return { status: "paid" };
  }

  // Check trial status
  const { data: trial } = await supabase
    .from("trials")
    .select("status, trial_started_at, emails_sent")
    .eq("company_id", companyId)
    .single();

  if (!trial) {
    // No trial record - treat as pre-trial
    return { status: "pre_trial" };
  }

  // If trial hasn't started (no email sent yet)
  if (!trial.trial_started_at) {
    return { status: "pre_trial" };
  }

  // Check if trial is still active (within 7 days)
  const trialStarted = new Date(trial.trial_started_at);
  const sevenDaysLater = new Date(trialStarted.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (sevenDaysLater > now) {
    const daysRemaining = Math.ceil((sevenDaysLater.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return { status: "active", daysRemaining };
  }

  // Trial has expired
  return { status: "expired" };
}

export async function canReceiveEmail(companyId: string): Promise<boolean> {
  const state = await getTrialState(companyId);
  return state.status === "active" || state.status === "paid";
}

export async function startTrial(companyId: string): Promise<void> {
  await supabase
    .from("trials")
    .update({ trial_started_at: new Date().toISOString() })
    .eq("company_id", companyId);
}
