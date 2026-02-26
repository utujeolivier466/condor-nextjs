import { supabase } from "./supabase";
import { computeMetrics } from "./compute";
import { generateJudgment, computeHealthScore } from "./judgment";
import { buildEmail } from "./email-template";
import { sendEmail } from "./send-email";

// ─── lib/weekly-job.ts ────────────────────────────────────────────
// The product. Called by the cron endpoint every Sunday at 11pm.
// Processes all active trials. Sends one email per company.

export type JobResult = {
  company_id: string;
  status:     "sent" | "skipped" | "failed";
  reason?:    string;
};

// ─── Process ALL active trials ────────────────────────────────────
export async function runWeeklyJob(): Promise<JobResult[]> {
  console.log("[weekly-job] Starting at", new Date().toISOString());

  // Load all active trials
  const { data: trials, error } = await supabase
    .from("trials")
    .select("company_id, next_email_at, emails_sent")
    .eq("status", "active");

  if (error || !trials) {
    console.error("[weekly-job] Failed to load trials:", error?.message);
    return [];
  }

  console.log(`[weekly-job] Processing ${trials.length} active trials`);

  // Process in parallel batches of 5 to avoid rate limits
  const results: JobResult[] = [];
  const batchSize = 5;

  for (let i = 0; i < trials.length; i += batchSize) {
    const batch = trials.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(trial => processCompany(trial.company_id))
    );
    results.push(...batchResults);

    // Small delay between batches
    if (i + batchSize < trials.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const sent    = results.filter(r => r.status === "sent").length;
  const failed  = results.filter(r => r.status === "failed").length;
  const skipped = results.filter(r => r.status === "skipped").length;

  console.log(`[weekly-job] Done. Sent: ${sent} | Failed: ${failed} | Skipped: ${skipped}`);
  return results;
}

// ─── Process ONE company ──────────────────────────────────────────
export async function processCompany(companyId: string): Promise<JobResult> {
  try {
    // 1. Get recipient email
    const email = await getCompanyEmail(companyId);
    if (!email) {
      return { company_id: companyId, status: "skipped", reason: "No email address on file" };
    }

    // 2. Compute metrics
    let metrics;
    try {
      metrics = await computeMetrics(companyId);
    } catch (err: any) {
      return { company_id: companyId, status: "failed", reason: "Compute failed: " + err.message };
    }

    // 3. Check we have enough data to send
    const hasMinData = metrics.nrr !== null || metrics.new_net_arr !== null;
    if (!hasMinData) {
      return { company_id: companyId, status: "skipped", reason: "Insufficient data — not sending noise" };
    }

    // 4. Generate judgment + health score
    const judgment    = generateJudgment(metrics);
    const healthScore = computeHealthScore(metrics);

    // 5. Build email
    const content = buildEmail(metrics, judgment, healthScore, new Date());

    // 6. Send
    const result = await sendEmail(email, content);
    if (!result.ok) {
      return { company_id: companyId, status: "failed", reason: result.error };
    }

    // 7. Log to DB
    await Promise.all([
      // Log email sent
      supabase.from("emails_sent").insert({
        company_id:      companyId,
        sent_at:         new Date().toISOString(),
        subject:         content.subject,
        constraint_text: judgment,
        health_score:    healthScore,
      }),

      // Save snapshot
      supabase.from("snapshots").insert({
        company_id:      companyId,
        computed_at:     new Date().toISOString(),
        nrr:             metrics.nrr,
        new_net_arr:     metrics.new_net_arr,
        burn_multiple:   metrics.burn_multiple,
        activation_rate: metrics.core_action_conv,
        health_score:    healthScore,
      }),

      // Update trial: increment count, set next Monday
      supabase.from("trials").update({
        emails_sent:   supabase.rpc("increment", { row_id: companyId, amount: 1 }),
        next_email_at: getNextMonday(new Date()).toISOString(),
      }).eq("company_id", companyId),
    ]);

    console.log(`[weekly-job] ✓ Sent to ${companyId} (${healthScore})`);
    return { company_id: companyId, status: "sent" };

  } catch (err: any) {
    console.error(`[weekly-job] ✗ ${companyId}:`, err.message);
    return { company_id: companyId, status: "failed", reason: err.message };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
async function getCompanyEmail(companyId: string): Promise<string | null> {
  // Get from stripe_connections table
  // You'll need to add an `email` column when founders sign up
  const { data } = await supabase
    .from("stripe_connections")
    .select("email")
    .eq("company_id", companyId)
    .single();

  return data?.email ?? null;
}

function getNextMonday(from: Date): Date {
  const d   = new Date(from);
  const day = d.getUTCDay();
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(23, 0, 0, 0); // Sunday 11pm UTC
  return d;
}
