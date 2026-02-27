import { supabase } from "./supabase";
import { computeMetrics } from "./lib-compute";
import { generateJudgment, computeHealthScore } from "./lib-judgment";
import { buildEmail } from "./lib-email-template";
import { sendEmail } from "./lib-send-email";
import { canReceiveEmail, startTrial } from "./trial-gate";

// ─── lib/weekly-job.ts (updated with trial logic) ─────────────────
// Trial starts on FIRST email send. Expires 7 days later. No exceptions.

export type JobResult = {
  company_id: string;
  status:     "sent" | "skipped" | "failed";
  reason?:    string;
};

export async function runWeeklyJob(): Promise<JobResult[]> {
  console.log("[weekly-job] Starting at", new Date().toISOString());

  const { data: trials } = await supabase
    .from("trials")
    .select("company_id, next_email_at, emails_sent, trial_started_at")
    .eq("status", "active");

  if (!trials?.length) {
    console.log("[weekly-job] No active trials.");
    return [];
  }

  console.log(`[weekly-job] Processing ${trials.length} active trials`);

  const results: JobResult[] = [];
  const batchSize = 5;

  for (let i = 0; i < trials.length; i += batchSize) {
    const batch = trials.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(t => processCompany(t.company_id))
    );
    results.push(...batchResults);
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

export async function processCompany(companyId: string): Promise<JobResult> {
  try {
    // ── Gate: check trial state before computing anything ────────
    const allowed = await canReceiveEmail(companyId);
    if (!allowed) {
      return { company_id: companyId, status: "skipped", reason: "Trial expired or not active" };
    }

    // ── Get recipient email ──────────────────────────────────────
    const email = await getCompanyEmail(companyId);
    if (!email) {
      return { company_id: companyId, status: "skipped", reason: "No email address on file" };
    }

    // ── Compute metrics ──────────────────────────────────────────
    let metrics;
    try {
      metrics = await computeMetrics(companyId);
    } catch (err: any) {
      return { company_id: companyId, status: "failed", reason: "Compute failed: " + err.message };
    }

    const hasMinData = metrics.nrr !== null || metrics.new_net_arr !== null;
    if (!hasMinData) {
      return { company_id: companyId, status: "skipped", reason: "Insufficient data" };
    }

    // ── Generate judgment ────────────────────────────────────────
    const judgment    = generateJudgment(metrics);
    const healthScore = computeHealthScore(metrics);
    const content     = buildEmail(metrics, judgment, healthScore, new Date());

    // ── Send ─────────────────────────────────────────────────────
    const result = await sendEmail(email, content);
    if (!result.ok) {
      return { company_id: companyId, status: "failed", reason: result.error };
    }

    // ── Start trial clock on first email (idempotent) ────────────
    await startTrial(companyId);

    // ── Log everything ───────────────────────────────────────────
    await Promise.all([
      supabase.from("emails_sent").insert({
        company_id:      companyId,
        sent_at:         new Date().toISOString(),
        subject:         content.subject,
        constraint_text: judgment,
        health_score:    healthScore,
      }),
      supabase.from("snapshots").insert({
        company_id:      companyId,
        computed_at:     new Date().toISOString(),
        nrr:             metrics.nrr,
        new_net_arr:     metrics.new_net_arr,
        burn_multiple:   metrics.burn_multiple,
        activation_rate: metrics.core_action_conv,
        health_score:    healthScore,
      }),
      supabase.from("trials")
        .update({ next_email_at: getNextMonday(new Date()).toISOString() })
        .eq("company_id", companyId),
      supabase.rpc("increment_emails_sent", { company_id_input: companyId }),
    ]);

    console.log(`[weekly-job] ✓ ${companyId} (${healthScore})`);
    return { company_id: companyId, status: "sent" };

  } catch (err: any) {
    console.error(`[weekly-job] ✗ ${companyId}:`, err.message);
    return { company_id: companyId, status: "failed", reason: err.message };
  }
}

async function getCompanyEmail(companyId: string): Promise<string | null> {
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
  d.setUTCHours(23, 0, 0, 0);
  return d;
}
