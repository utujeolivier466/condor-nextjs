import { supabase } from "./supabase";

// ─── lib/churn-enforcement.ts ─────────────────────────────────────
// Runs daily. Enforces churn rules ruthlessly.
// You WANT to lose these users. They cost time and give nothing.
//
// Churn rules:
//   1. No Stripe connect within 24h of signup
//   2. No burn input entered after 48h
//   3. No email opened in last 3 weeks (passive disengagement)

export type ChurnResult = {
  company_id: string;
  reason:     string;
  action:     "cancelled" | "warned";
};

export async function runChurnEnforcement(): Promise<ChurnResult[]> {
  console.log("[churn] Running at", new Date().toISOString());
  const results: ChurnResult[] = [];

  await Promise.all([
    enforceNoStripeConnect(results),
    enforceNoBurnInput(results),
    enforceEmailIgnored(results),
  ]);

  console.log(`[churn] Cancelled ${results.filter(r => r.action === "cancelled").length} accounts`);
  return results;
}

// ─── Rule 1: No Stripe connect within 24h ────────────────────────
// These people clicked through but never committed.
// They're not your customer. Remove them now.
async function enforceNoStripeConnect(results: ChurnResult[]) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find trials where Stripe account ID looks like a placeholder
  // (In practice: find trials with no charges in Stripe after 24h)
  const { data: stale } = await supabase
    .from("trials")
    .select("company_id, started_at")
    .eq("status", "active")
    .lt("started_at", cutoff);

  if (!stale) return;

  for (const trial of stale) {
    // Check if they have any subscription or Stripe data
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("company_id", trial.company_id)
      .single();

    // No subscription after 24h = never paid = cancel
    if (!sub) {
      await cancelTrial(trial.company_id, "No payment after 24 hours");
      results.push({ company_id: trial.company_id, reason: "No payment within 24h", action: "cancelled" });
    }
  }
}

// ─── Rule 2: No burn input after 48h ─────────────────────────────
// If they won't enter one number, they won't act on any of them.
async function enforceNoBurnInput(results: ChurnResult[]) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: connections } = await supabase
    .from("stripe_connections")
    .select("company_id, connected_at, monthly_burn")
    .lt("connected_at", cutoff)
    .is("monthly_burn", null);

  if (!connections) return;

  for (const conn of connections) {
    // Check if they have an active trial
    const { data: trial } = await supabase
      .from("trials")
      .select("status")
      .eq("company_id", conn.company_id)
      .single();

    if (trial?.status === "active") {
      await cancelTrial(conn.company_id, "No burn input after 48 hours");
      results.push({ company_id: conn.company_id, reason: "No burn input within 48h", action: "cancelled" });
    }
  }
}

// ─── Rule 3: 3 emails sent, none opened ──────────────────────────
// Passive disengagement. They don't want it.
// Warns on first detection, cancels if still silent after 7 days
async function enforceEmailIgnored(results: ChurnResult[]) {
  const { data: trials } = await supabase
    .from("trials")
    .select("company_id, emails_sent, last_warning_at")
    .eq("status", "active")
    .gte("emails_sent", 3);

  if (!trials) return;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const trial of trials) {
    // Check if they've visited /home recently (last_seen_at)
    const { data: conn } = await supabase
      .from("stripe_connections")
      .select("last_seen_at")
      .eq("company_id", trial.company_id)
      .single();

    const lastSeen = conn?.last_seen_at ? new Date(conn.last_seen_at) : null;
    const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

    if (!lastSeen || lastSeen < threeWeeksAgo) {
      // Check if already warned
      const lastWarningAt = trial.last_warning_at ? new Date(trial.last_warning_at) : null;

      if (!lastWarningAt) {
        // First time detecting disengagement — warn them
        await supabase
          .from("trials")
          .update({ last_warning_at: new Date().toISOString() })
          .eq("company_id", trial.company_id);

        results.push({
          company_id: trial.company_id,
          reason: "3+ emails sent, no engagement - warned",
          action: "warned",
        });
      } else if (lastWarningAt < oneWeekAgo) {
        // Already warned and still silent after 7 days — cancel
        await cancelTrial(trial.company_id, "3+ emails sent, ignored warnings for 7+ days");
        results.push({
          company_id: trial.company_id,
          reason: "3+ emails sent, warned 7+ days ago, still no engagement - cancelled",
          action: "cancelled",
        });
      }
      // If warned within last 7 days, do nothing (give them time to respond)
    }
  }
}

// ─── Cancel a trial ───────────────────────────────────────────────
async function cancelTrial(companyId: string, reason: string) {
  await supabase
    .from("trials")
    .update({ status: "cancelled" })
    .eq("company_id", companyId);

  // Log cancellation
  await supabase
    .from("churn_log")
    .insert({ company_id: companyId, reason, cancelled_at: new Date().toISOString() });
}
