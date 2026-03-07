import Stripe from "stripe";
import { supabase } from "./supabase";
import { buildMRRSnapshot, compareMRRSnapshots } from "./lib-mrr-snapshot";
import { detectCoreAction } from "./lib-core-action-detector";
import { computeForwardSignal } from "./lib-forward-signal";

// ─── lib/compute.ts v2 ───────────────────────────────────────────
// Full metric engine.
// NRR:             subscription MRR snapshots (not raw charges)
// Core Action:     auto-detected from Stripe events
// Forward Signal:  4-input scored algorithm

export type Metrics = {
  nrr:              number | null;
  new_net_arr:      number | null;
  burn_multiple:    number | null;
  core_action_conv: number | null;
  core_action_name: string | null;   // e.g. "invoice.paid"
  forward_signal:   "STRONG" | "STABLE" | "AT_RISK" | null;
  forward_score:    number;           // raw score for transparency
  business_model:   "subscription" | "transactional";
  insufficient:     string[];
};

export async function computeMetrics(companyId: string): Promise<Metrics> {
  const insufficient: string[] = [];

  // ── Load connection ───────────────────────────────────────────
  const { data: conn } = await supabase
    .from("stripe_connections")
    .select("stripe_account_id, monthly_burn")
    .eq("company_id", companyId)
    .single();

  if (!conn) throw new Error("Company not found: " + companyId);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });

  const monthly_burn = conn.monthly_burn ?? 0;

  // ── Build MRR snapshots (30 days apart) ───────────────────────
  const now         = new Date();
  const thirtyAgo   = new Date(now.getTime()      - 30 * 24 * 60 * 60 * 1000);
  const sixtyAgo    = new Date(now.getTime()      - 60 * 24 * 60 * 60 * 1000);

  const [snapshotStart, snapshotEnd] = await Promise.all([
    buildMRRSnapshot(stripe, conn.stripe_account_id, sixtyAgo),
    buildMRRSnapshot(stripe, conn.stripe_account_id, thirtyAgo),
  ]);

  const movement = compareMRRSnapshots(snapshotStart, snapshotEnd);

  // ── 1. NRR ────────────────────────────────────────────────────
  let nrr: number | null = null;
  if (movement.starting_mrr > 0) {
    const retained = movement.starting_mrr + movement.expansion - movement.contraction - movement.churn;
    nrr = Math.round((retained / movement.starting_mrr) * 100 * 10) / 10;
  } else {
    insufficient.push("NRR");
  }

  // ── 2. New Net ARR ────────────────────────────────────────────
  // MRR change × 12, excluding new customers (pure growth of existing base)
  const mrr_change  = movement.ending_mrr - movement.starting_mrr - movement.new_mrr;
  const new_net_arr = Math.round(mrr_change * 12);

  // ── 3. Burn Multiple ──────────────────────────────────────────
  let burn_multiple: number | null = null;
  if (monthly_burn > 0 && movement.new_mrr > 0) {
    burn_multiple = Math.round((monthly_burn / movement.new_mrr) * 10) / 10;
  } else if (monthly_burn === 0) {
    insufficient.push("Burn Multiple");
  }

  // ── 4. Core Action (auto-detected) ────────────────────────────
  const coreActionResult = await detectCoreAction(stripe, conn.stripe_account_id);

  let core_action_conv: number | null = null;
  let core_action_name: string | null = null;

  if (coreActionResult.confidence !== "insufficient") {
    core_action_conv = coreActionResult.conversion_rate;
    core_action_name = coreActionResult.action;
  }

  if (core_action_conv === null) {
    insufficient.push("Core Action Conversion");
  }

  // ── 5. Forward Signal (scored) ────────────────────────────────
  const signalResult = computeForwardSignal({
    nrr,
    new_net_arr,
    burn_multiple,
    core_action_conv,
    core_action_name,
    forward_signal: null,
    forward_score: 0,
    business_model: coreActionResult.business_model,
    insufficient,
  });

  if (signalResult.signal === null) {
    insufficient.push("Forward Signal");
  }

  // ── Cache core action result to DB (avoids re-detection weekly) ─
  if (coreActionResult.confidence === "confirmed") {
    await supabase
      .from("stripe_connections")
      .update({
        detected_core_action:  coreActionResult.action,
        business_model:        coreActionResult.business_model,
        core_action_updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId);
  }

  return {
    nrr,
    new_net_arr,
    burn_multiple,
    core_action_conv,
    core_action_name,
    forward_signal:  signalResult.signal,
    forward_score:   signalResult.score,
    business_model:  coreActionResult.business_model,
    insufficient,
  };
}
