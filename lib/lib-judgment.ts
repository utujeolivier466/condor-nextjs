import { Metrics } from "./lib-compute";

// ─── lib/judgment.ts ──────────────────────────────────────────────
// Rule-based. Not AI. One sentence. No advice list.
// If it looks like marketing copy, rewrite it.

export function generateJudgment(m: Metrics): string {
  const { nrr, new_net_arr, burn_multiple, forward_signal } = m;

  // ── Priority order: worst problem first ──────────────────────

  // 1. Existential: burning fast, not growing
  if (burn_multiple !== null && burn_multiple > 3 && (new_net_arr ?? 0) <= 0) {
    return "You are spending more than 3x what you earn in new revenue — this trajectory ends the company.";
  }

  // 2. Retention is broken
  if (nrr !== null && nrr < 85) {
    return `NRR of ${nrr}% means your existing base is shrinking faster than you can replace it.`;
  }

  // 3. Growth is fake (retention looks okay but NRR hiding decline)
  if (nrr !== null && nrr < 100 && (new_net_arr ?? 0) > 0) {
    return `New revenue is masking a retention problem — NRR of ${nrr}% means growth will stall the moment sales slow.`;
  }

  // 4. Burn is high but growing
  if (burn_multiple !== null && burn_multiple > 2 && (new_net_arr ?? 0) > 0) {
    return `Burn Multiple of ${burn_multiple}x is too high — you're buying growth at a price that won't survive a fundraise.`;
  }

  // 5. Stalled growth
  if (new_net_arr !== null && new_net_arr <= 0 && nrr !== null && nrr >= 100) {
    return "Revenue is flat — retention is holding but nothing new is coming in.";
  }

  // 6. Forward signal deteriorating
  if (forward_signal === "AT_RISK" && nrr !== null && nrr >= 100) {
    return "The leading indicators are turning before the revenue does — act before Stripe confirms it.";
  }

  // 7. Healthy but not compounding
  if (nrr !== null && nrr >= 100 && nrr < 110 && (new_net_arr ?? 0) > 0) {
    return `NRR of ${nrr}% is stable but not compounding — push expansion before assuming this holds.`;
  }

  // 8. Strong
  if (nrr !== null && nrr >= 110 && (new_net_arr ?? 0) > 0 && (burn_multiple === null || burn_multiple < 1.5)) {
    return `NRR of ${nrr}% with positive net ARR is genuine compounding — don't change what's working.`;
  }

  // 9. Insufficient data fallback
  if (m.insufficient.length >= 3) {
    return "Insufficient data this week — connect product event tracking to unlock the full picture.";
  }

  // 10. Default: something is missing
  return "One or more metrics couldn't be computed — verify your Stripe data and burn input are current.";
}

// ─── Health score ─────────────────────────────────────────────────
export function computeHealthScore(m: Metrics): "HEALTHY" | "FRAGILE" | "AT_RISK" {
  const { nrr, burn_multiple, forward_signal, new_net_arr } = m;

  const badSignals = [
    nrr !== null && nrr < 90,
    burn_multiple !== null && burn_multiple > 3,
    forward_signal === "AT_RISK",
    new_net_arr !== null && new_net_arr < -5000,
  ].filter(Boolean).length;

  const warnSignals = [
    nrr !== null && nrr < 100,
    burn_multiple !== null && burn_multiple > 2,
    new_net_arr !== null && new_net_arr <= 0,
    forward_signal === "STABLE" && nrr !== null && nrr < 105,
  ].filter(Boolean).length;

  if (badSignals >= 2)   return "AT_RISK";
  if (badSignals >= 1)   return "FRAGILE";
  if (warnSignals >= 2)  return "FRAGILE";
  return "HEALTHY";
}
