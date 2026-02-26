import { Metrics } from "./lib-compute";

// ─── lib/email-template.ts ────────────────────────────────────────
// Plain text. No images. No branding. No HTML styling.
// Looks like it came from a human.
// If it looks like marketing, it won't work.

export type EmailContent = {
  subject:  string;
  text:     string;  // plain text body — primary
  html:     string;  // minimal HTML — only for email client compatibility
};

export function buildEmail(
  metrics:    Metrics,
  judgment:   string,
  healthScore: "HEALTHY" | "FRAGILE" | "AT_RISK",
  weekOf:     Date
): EmailContent {

  const fmt = (n: number | null, prefix = "", suffix = "", decimals = 1): string => {
    if (n === null) return "Insufficient data";
    return `${prefix}${n.toFixed(decimals)}${suffix}`;
  };

  const fmtCurrency = (n: number | null): string => {
    if (n === null) return "Insufficient data";
    const abs = Math.abs(n);
    const sign = n >= 0 ? "+" : "-";
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000)    return `${sign}$${(abs / 1000).toFixed(1)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  const weekStr = weekOf.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });

  // ── Subject line — rule-based, not clickbait ──────────────────
  const subject = buildSubject(metrics, healthScore);

  // ── Plain text body ───────────────────────────────────────────
  const nrrLine  = metrics.nrr !== null
    ? `${metrics.nrr.toFixed(1)}%`
    : "Insufficient data";

  const text = `Week of ${weekStr}

${metrics.nrr !== null ? `Net Revenue Retention: ${nrrLine}` : "Net Revenue Retention: Insufficient data"}
New Net ARR: ${fmtCurrency(metrics.new_net_arr)}
Burn Multiple: ${fmt(metrics.burn_multiple, "", "x")}
Core Action Conversion: ${metrics.core_action_conv !== null ? fmt(metrics.core_action_conv, "", "%") : "Insufficient data"}
Forward Signal: ${metrics.forward_signal ?? "Insufficient data"}

${judgment}

—
Candor | weekly@candor.so
Reply to cancel.`;

  // ── Minimal HTML (structure only, no design) ──────────────────
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <style>
    body { font-family: 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.8; color: #1a1a1a; background: #fff; max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .metrics { margin: 24px 0; border-left: 3px solid #c0392b; padding-left: 20px; }
    .metric  { margin: 6px 0; }
    .label   { color: #666; }
    .value   { font-weight: 600; color: #1a1a1a; }
    .judgment { margin: 28px 0; font-style: italic; color: #1a1a1a; }
    .footer  { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <p style="color:#999; font-size:12px;">Week of ${weekStr}</p>

  <div class="metrics">
    <div class="metric"><span class="label">Net Revenue Retention: </span><span class="value">${nrrLine}</span></div>
    <div class="metric"><span class="label">New Net ARR: </span><span class="value">${fmtCurrency(metrics.new_net_arr)}</span></div>
    <div class="metric"><span class="label">Burn Multiple: </span><span class="value">${fmt(metrics.burn_multiple, "", "x")}</span></div>
    <div class="metric"><span class="label">Core Action Conversion: </span><span class="value">${metrics.core_action_conv !== null ? fmt(metrics.core_action_conv, "", "%") : "Insufficient data"}</span></div>
    <div class="metric"><span class="label">Forward Signal: </span><span class="value">${metrics.forward_signal ?? "Insufficient data"}</span></div>
  </div>

  <p class="judgment">${judgment}</p>

  <div class="footer">
    Candor &mdash; <a href="mailto:weekly@candor.so" style="color:#999;">weekly@candor.so</a><br>
    Reply to cancel.
  </div>
</body>
</html>`;

  return { subject, text, html };
}

// ─── Subject line logic ───────────────────────────────────────────
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

  // HEALTHY
  if (m.nrr !== null && m.nrr >= 110)
    return `Your SaaS is compounding — NRR at ${m.nrr.toFixed(0)}%`;
  return "Your SaaS is healthy — here's this week's picture";
}
