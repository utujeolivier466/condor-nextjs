import { Metrics } from "./lib-compute";

// ─── lib/judgment.ts ──────────────────────────────────────────────
// Three rules:
//   1. One interpretation — names the problem
//   2. One action        — what to do this week
//   3. Worst problem first — priority order is non-negotiable

export type Judgment = {
  interpretation: string;   // what is wrong
  action:         string;   // what to do this week
};

export function generateJudgment(m: Metrics): Judgment {
  const { nrr, new_net_arr, burn_multiple, core_action_conv, forward_signal } = m;

  // ── Priority order: existential → structural → warning ────────

  // 1. Existential: burning fast, not growing
  if (burn_multiple !== null && burn_multiple > 3 && (new_net_arr ?? 0) <= 0) {
    return {
      interpretation: "You are spending more than 3x what you earn in new revenue — this trajectory ends the company.",
      action:         "Cut monthly spend by 30% before next Monday.",
    };
  }

  // 2. Broken activation + declining revenue
  if (core_action_conv !== null && core_action_conv < 20 && (new_net_arr ?? 0) < 0) {
    return {
      interpretation: `Core Action Conversion at ${core_action_conv}% means most new users never reach value — churn is structural, not fixable by sales.`,
      action:         "Talk to 3 users who churned this month. Ask one question: where did we lose you?",
    };
  }

  // 3. Retention collapsing
  if (nrr !== null && nrr < 85) {
    return {
      interpretation: `NRR of ${nrr}% means your existing base is shrinking faster than you can replace it.`,
      action:         "Identify your 3 highest-paying customers. Call them this week.",
    };
  }

  // 4. Growth masking retention leak
  if (nrr !== null && nrr < 100 && (new_net_arr ?? 0) > 0) {
    return {
      interpretation: `New revenue is masking a retention problem — NRR of ${nrr}% means growth will stall the moment sales slow.`,
      action:         "Find the cohort with the lowest retention. Block time this week to understand why they left.",
    };
  }

  // 5. Burn high while growing
  if (burn_multiple !== null && burn_multiple > 2 && (new_net_arr ?? 0) > 0) {
    return {
      interpretation: `Burn Multiple of ${burn_multiple}x is too high — you're buying growth at a price that won't survive a fundraise.`,
      action:         "List every expense over $500/month. Cut one before next Monday.",
    };
  }

  // 6. Weak activation while growing
  if (core_action_conv !== null && core_action_conv < 20 && (new_net_arr ?? 0) > 0) {
    return {
      interpretation: `Only ${core_action_conv}% of new users reach the value moment — growth will stall when acquisition slows.`,
      action:         "Watch 3 new users attempt the core action. Do not help them. Watch where they stop.",
    };
  }

  // 7. Stalled growth, retention holding
  if ((new_net_arr ?? 0) <= 0 && nrr !== null && nrr >= 100) {
    return {
      interpretation: "Revenue is flat — retention is holding but nothing new is coming in.",
      action:         "Reach out to 5 churned users. Offer nothing. Just ask why.",
    };
  }

  // 8. Indicators turning before revenue confirms
  if (forward_signal === "AT_RISK" && nrr !== null && nrr >= 100) {
    return {
      interpretation: "The leading indicators are turning before the revenue does — act before Stripe confirms it.",
      action:         "Review last month's churned accounts. Find the common thread before it widens.",
    };
  }

  // 9. Stable but not compounding
  if (nrr !== null && nrr >= 100 && nrr < 110 && (new_net_arr ?? 0) > 0) {
    return {
      interpretation: `NRR of ${nrr}% is stable but not compounding — push expansion before assuming this holds.`,
      action:         "Identify your 5 most engaged customers. Ask one of them if they'd pay more for a specific outcome.",
    };
  }

  // 10. Compounding with strong activation
  if (core_action_conv !== null && core_action_conv >= 70 && nrr !== null && nrr >= 110) {
    return {
      interpretation: `NRR of ${nrr}% with ${core_action_conv}% activation is genuine compounding — don't change what's working.`,
      action:         "Do not change pricing, positioning, or product this week.",
    };
  }

  // 11. Strong without core action data
  if (nrr !== null && nrr >= 110 && (new_net_arr ?? 0) > 0) {
    return {
      interpretation: `NRR of ${nrr}% with positive net ARR is genuine compounding — don't change what's working.`,
      action:         "Do not change pricing, positioning, or product this week.",
    };
  }

  // 12. Insufficient data
  return {
    interpretation: "Insufficient data this week — connect product event tracking to unlock the full picture.",
    action:         "Verify your Stripe account is connected and burn input is current.",
  };
}

// ─── Health score ─────────────────────────────────────────────────
export function computeHealthScore(m: Metrics): "HEALTHY" | "FRAGILE" | "AT_RISK" {
  const { nrr, burn_multiple, forward_signal, new_net_arr, core_action_conv } = m;

  const badSignals = [
    nrr !== null && nrr < 90,
    burn_multiple !== null && burn_multiple > 3,
    forward_signal === "AT_RISK",
    new_net_arr !== null && new_net_arr < -5000,
    core_action_conv !== null && core_action_conv < 15,
  ].filter(Boolean).length;

  const warnSignals = [
    nrr !== null && nrr < 100,
    burn_multiple !== null && burn_multiple > 2,
    new_net_arr !== null && new_net_arr <= 0,
    core_action_conv !== null && core_action_conv < 40,
  ].filter(Boolean).length;

  if (badSignals >= 2)  return "AT_RISK";
  if (badSignals >= 1)  return "FRAGILE";
  if (warnSignals >= 2) return "FRAGILE";
  return "HEALTHY";
}
