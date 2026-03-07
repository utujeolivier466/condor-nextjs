import { Metrics } from "./lib-compute";
import { Judgment } from "./lib-judgment";

// ─── lib/email-template.ts ────────────────────────────────────────
// Three rules:
//   1. Only 5 numbers
//   2. One interpretation per metric
//   3. One action — what to fix this week
// Plain text primary. Looks like it came from a human.

export type EmailContent = {
  subject:  string;
  text:     string;
  html:     string;
};

export function buildEmail(
  metrics:     Metrics,
  judgment:    Judgment,
  healthScore: "HEALTHY" | "FRAGILE" | "AT_RISK",
  weekOf:      Date,
  trialStatus: "trial" | "paid" = "trial"
): EmailContent {

  const fmt = (n: number | null, prefix = "", suffix = "", decimals = 1): string => {
    if (n === null) return "Insufficient data";
    return `${prefix}${n.toFixed(decimals)}${suffix}`;
  };

  const fmtCurrency = (n: number | null): string => {
    if (n === null) return "Insufficient data";
    const abs  = Math.abs(n);
    const sign = n >= 0 ? "+" : "-";
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  const weekStr = weekOf.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const subject  = buildSubject(metrics, healthScore);
  const nrrLine  = metrics.nrr !== null ? `${metrics.nrr.toFixed(1)}%` : "Insufficient data";
  const closing  = buildClosingBlock(healthScore, trialStatus);

  // ── Plain text ────────────────────────────────────────────────
  const text = `Week of ${weekStr}

Net Revenue Retention:     ${nrrLine}
New Net ARR:               ${fmtCurrency(metrics.new_net_arr)}
Burn Multiple:             ${fmt(metrics.burn_multiple, "", "x")}
Core Action Conversion:    ${metrics.core_action_conv !== null ? fmt(metrics.core_action_conv, "", "%") : "Insufficient data"}
Forward Signal:            ${metrics.forward_signal ?? "Insufficient data"}

${judgment.interpretation}

This week: ${judgment.action}

${closing.text}

—
Candor | weekly@candor.so
Reply to cancel.`;

  // ── HTML ──────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <style>
    body        { font-family: 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.8; color: #1a1a1a; background: #fff; max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .metrics    { margin: 24px 0; border-left: 3px solid #c0392b; padding-left: 20px; }
    .metric     { margin: 6px 0; }
    .label      { color: #666; }
    .value      { font-weight: 600; color: #1a1a1a; }
    .judgment   { margin: 28px 0 8px; font-style: italic; color: #1a1a1a; }
    .action     { margin: 0 0 28px; font-weight: 600; color: #0B0A08; border-left: 3px solid #0B0A08; padding-left: 14px; }
    .closing    { margin: 36px 0 0; padding-top: 24px; border-top: 1px solid #eee; }
    .closing p  { margin: 0 0 10px; font-size: 14px; color: #333; line-height: 1.7; }
    .closing .threat { color: #c0392b; font-weight: 600; }
    .cta-btn    { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #0B0A08; color: #F2EEE7 !important; text-decoration: none; font-family: 'Courier New', Courier, monospace; font-size: 13px; letter-spacing: 0.05em; }
    .footer     { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <p style="color:#999; font-size:12px;">Week of ${weekStr}</p>

  <div class="metrics">
    <div class="metric"><span class="label">Net Revenue Retention:  </span><span class="value">${nrrLine}</span></div>
    <div class="metric"><span class="label">New Net ARR:            </span><span class="value">${fmtCurrency(metrics.new_net_arr)}</span></div>
    <div class="metric"><span class="label">Burn Multiple:          </span><span class="value">${fmt(metrics.burn_multiple, "", "x")}</span></div>
    <div class="metric"><span class="label">Core Action Conversion: </span><span class="value">${metrics.core_action_conv !== null ? fmt(metrics.core_action_conv, "", "%") : "Insufficient data"}</span></div>
    <div class="metric"><span class="label">Forward Signal:         </span><span class="value">${metrics.forward_signal ?? "Insufficient data"}</span></div>
  </div>

  <p class="judgment">${judgment.interpretation}</p>
  <p class="action">This week: ${judgment.action}</p>

  ${closing.html}

  <div class="footer">
    Candor &mdash; <a href="mailto:weekly@candor.so" style="color:#999;">weekly@candor.so</a><br>
    Reply to cancel.
  </div>
</body>
</html>`;

  return { subject, text, html };
}

// ─── Closing block — the conversion moment ────────────────────────
// Appears after judgment. Signal-aware.
// Order: insight → anxiety → loss threat → CTA.
// "paid" accounts get no closing block — they already converted.

type ClosingBlock = { text: string; html: string };

function buildClosingBlock(
  health:      "HEALTHY" | "FRAGILE" | "AT_RISK",
  trialStatus: "trial" | "paid"
): ClosingBlock {

  // Paid users: no trial pressure — just clean sign-off
  if (trialStatus === "paid") {
    return { text: "", html: "" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://candor.so";
  const ctaUrl = `${appUrl}/pricing`;

  // AT_RISK: lean into the anxiety — they cannot afford to lose visibility now
  if (health === "AT_RISK") {
    const text = `Revenue decline is forming.

This report stops updating when your trial ends.

Keep the signal alive:
${ctaUrl}`;

    const html = `
  <div class="closing">
    <p class="threat">Revenue decline is forming.</p>
    <p>This report stops updating when your trial ends.</p>
    <p>Keep the signal alive:</p>
    <a href="${ctaUrl}" class="cta-btn">Keep My Weekly Reality</a>
  </div>`;

    return { text, html };
  }

  // FRAGILE or HEALTHY: standard closing block
  const text = `Your numbers update automatically every week.

This report stops updating when your trial ends.

Keep the signal alive:
${ctaUrl}`;

  const html = `
  <div class="closing">
    <p>Your numbers update automatically every week.</p>
    <p class="threat">This report stops updating when your trial ends.</p>
    <p>Keep the signal alive:</p>
    <a href="${ctaUrl}" class="cta-btn">Keep My Weekly Reality</a>
  </div>`;

  return { text, html };
}

// ─── Subject line ─────────────────────────────────────────────────
function buildSubject(m: Metrics, health: "HEALTHY" | "FRAGILE" | "AT_RISK"): string {
  if (health === "AT_RISK") {
    if (m.nrr !== null && m.nrr < 90)
      return `Your SaaS is losing ground — NRR at ${m.nrr.toFixed(0)}%`;
    if (m.burn_multiple !== null && m.burn_multiple > 3)
      return `Burn Multiple hit ${m.burn_multiple}x — this needs to change`;
    return "Your SaaS is at risk — read this now";
  }

  if (health === "FRAGILE") {
    if (m.nrr !== null && m.nrr < 100)
      return `Your SaaS is growing — but it's fragile`;
    if (m.burn_multiple !== null && m.burn_multiple > 2)
      return `Growth is happening — but you're paying too much for it`;
    return "Your SaaS is fragile — one number needs attention";
  }

  if (m.nrr !== null && m.nrr >= 110)
    return `Your SaaS is compounding — NRR at ${m.nrr.toFixed(0)}%`;
  return "Your SaaS is healthy — here's this week's picture";
}
