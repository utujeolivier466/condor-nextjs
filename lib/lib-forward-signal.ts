import { Metrics } from "./lib-compute";

// ─── lib/forward-signal.ts ────────────────────────────────────────
// 4-input scored Forward Signal algorithm.
// Replaces the old 2-input binary version.
//
// Inputs: NRR, New Net ARR, Burn Multiple, Core Action Conversion
// Each scored independently. Sum determines signal.
//
// Score ranges:
//   ≥ 4  → STRONG
//   1–3  → STABLE
//   < 1  → AT_RISK

export type ForwardSignal = "STRONG" | "STABLE" | "AT_RISK" | null;

export type SignalBreakdown = {
  signal:      ForwardSignal;
  score:       number;
  components: {
    nrr:                { score: number; reason: string };
    growth:             { score: number; reason: string };
    burn:               { score: number; reason: string };
    core_action:        { score: number; reason: string };
  };
  insufficient: boolean;
};

export function computeForwardSignal(m: Metrics): SignalBreakdown {
  const { nrr, new_net_arr, burn_multiple, core_action_conv } = m;

  // If core inputs are missing, fall back to 2-input version
  // (don't penalize companies for not having burn entered yet)
  const hasBurn       = burn_multiple !== null;
  const hasCoreAction = core_action_conv !== null;

  // ── NRR score ─────────────────────────────────────────────────
  let nrrScore  = 0;
  let nrrReason = "No data";
  if (nrr !== null) {
    if      (nrr >= 110) { nrrScore = +2; nrrReason = `${nrr}% — compounding`; }
    else if (nrr >= 100) { nrrScore = +1; nrrReason = `${nrr}% — holding`; }
    else                 { nrrScore = -2; nrrReason = `${nrr}% — shrinking`; }
  }

  // ── Growth score ──────────────────────────────────────────────
  let growthScore  = 0;
  let growthReason = "No data";
  if (new_net_arr !== null) {
    if      (new_net_arr > 0)  { growthScore = +1; growthReason = `+$${fmt(new_net_arr)} new ARR`; }
    else if (new_net_arr === 0) { growthScore =  0; growthReason = "Flat"; }
    else                        { growthScore = -2; growthReason = `-$${fmt(Math.abs(new_net_arr))} contraction`; }
  }

  // ── Burn score ────────────────────────────────────────────────
  let burnScore  = 0;
  let burnReason = "No burn input";
  if (hasBurn && burn_multiple !== null) {
    if      (burn_multiple < 1) { burnScore = +2; burnReason = `${burn_multiple}x — efficient`; }
    else if (burn_multiple < 2) { burnScore = +1; burnReason = `${burn_multiple}x — acceptable`; }
    else if (burn_multiple <= 3){ burnScore =  0; burnReason = `${burn_multiple}x — expensive`; }
    else                         { burnScore = -2; burnReason = `${burn_multiple}x — unsustainable`; }
  }

  // ── Core Action score ─────────────────────────────────────────
  let coreScore  = 0;
  let coreReason = "Insufficient data";
  if (hasCoreAction && core_action_conv !== null) {
    const pct = core_action_conv; // already 0–100
    if      (pct >= 70) { coreScore = +2; coreReason = `${pct}% — strong activation`; }
    else if (pct >= 50) { coreScore = +1; coreReason = `${pct}% — acceptable activation`; }
    else                 { coreScore = -2; coreReason = `${pct}% — weak activation`; }
  }

  // ── Total score ───────────────────────────────────────────────
  const score = nrrScore + growthScore + burnScore + coreScore;

  // ── Signal ────────────────────────────────────────────────────
  // Can only produce a signal if we have at least NRR + one other input
  const hasMinData = nrr !== null && new_net_arr !== null;
  if (!hasMinData) {
    return {
      signal: null,
      score:  0,
      components: {
        nrr:         { score: 0,         reason: "No data" },
        growth:      { score: 0,         reason: "No data" },
        burn:        { score: burnScore,  reason: burnReason },
        core_action: { score: coreScore,  reason: coreReason },
      },
      insufficient: true,
    };
  }

  const signal: ForwardSignal =
    score >= 4 ? "STRONG" :
    score >= 1 ? "STABLE" :
    "AT_RISK";

  return {
    signal,
    score,
    components: {
      nrr:         { score: nrrScore,    reason: nrrReason },
      growth:      { score: growthScore, reason: growthReason },
      burn:        { score: burnScore,   reason: burnReason },
      core_action: { score: coreScore,   reason: coreReason },
    },
    insufficient: false,
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}
