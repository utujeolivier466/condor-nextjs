"use client";

import { useEffect, useState } from "react";

const T = {
  black:  "#0B0A08",
  bone:   "#F2EEE7",
  red:    "#C0392B",
  ash:    "#3D3A36",
  fog:    "#8C8882",
  amber:  "#D4A843",
  green:  "#4A7A4A",
  line:   "rgba(242,238,231,0.07)",
};

type Row = {
  stripe_account_id:   string;
  country:             string;
  default_currency:    string;
  connected_at:        string;
  verified_at:         string | null;
  trial_started_at:    string | null;
  trial_expires_at:    string | null;
  trial_state:         "pre_trial" | "active" | "expired";
  emails_sent:         number;
  paid:                boolean;
  subscription_status: string | null;
};

export default function AdminPage() {
  const [rows, setRows]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pass, setPass]       = useState("");
  const [authed, setAuthed]   = useState(false);
  const [stats, setStats]     = useState<any>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: ${T.black}; }
      body { color: ${T.bone}; font-family: 'DM Mono', monospace; font-size: 12px; -webkit-font-smoothing: antialiased; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { text-align: left; padding: 8px 14px; color: ${T.ash}; font-weight: 400; letter-spacing: 0.15em; border-bottom: 1px solid ${T.line}; white-space: nowrap; }
      td { padding: 10px 14px; border-bottom: 1px solid ${T.line}; white-space: nowrap; color: ${T.fog}; }
      tr:hover td { background: rgba(242,238,231,0.02); }
      .badge { display: inline-flex; padding: 2px 8px; font-size: 10px; letter-spacing: 0.1em; }
      input { background: transparent; border: 1px solid ${T.ash}; color: ${T.bone}; font-family: 'DM Mono', monospace; font-size: 13px; padding: 12px 16px; outline: none; width: 240px; }
      input:focus { border-color: ${T.bone}; }
      button { background: ${T.bone}; color: ${T.black}; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.15em; padding: 12px 24px; border: none; cursor: pointer; margin-left: 12px; }
      .stat-box { background: rgba(242,238,231,0.03); border: 1px solid ${T.line}; padding: 20px 24px; }
    `;
    document.head.appendChild(style);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);

  const handleAuth = async () => {
    // Always check server-side for authentication
    const res = await fetch("/api/admin/data", {
      headers: { "x-admin-pass": pass },
    });
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
      setStats(data.stats);
      setAuthed(true);
      setLoading(false);
    } else {
      alert("Invalid password");
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: T.black, display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
        <input
          type="password"
          placeholder="admin password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAuth()}
        />
        <button onClick={handleAuth}>ENTER</button>
      </div>
    );
  }

  const statusColor = (state: string) => {
    if (state === "active")    return T.amber;
    if (state === "expired")   return T.red;
    if (state === "pre_trial") return T.ash;
    return T.fog;
  };

  return (
    <div style={{ padding: "40px 32px", minHeight: "100vh", background: T.black }}>

      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 10, letterSpacing: "0.3em", color: T.ash, marginBottom: 16 }}>CANDOR — INTERNAL</p>
        <p style={{ fontSize: 18, color: T.bone, letterSpacing: "-0.01em" }}>Account Observatory</p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 40 }}>
          {[
            { label: "TOTAL CONNECTED",       value: stats.total,              color: T.bone },
            { label: "VERIFIED ($1)",          value: stats.verified,           color: T.amber },
            { label: "TRIAL ACTIVE",           value: stats.trial_active,       color: T.amber },
            { label: "TRIAL EXPIRED",          value: stats.trial_expired,      color: T.red },
            { label: "PAID",                   value: stats.paid,               color: T.green },
            { label: "COMPLETION RATE",        value: stats.completion_rate,    color: T.bone },
            { label: "VERIFY SUCCESS RATE",    value: stats.verify_rate,        color: T.bone },
            { label: "TRIAL → PAID RATE",      value: stats.conversion_rate,    color: stats.conversion_rate_raw >= 25 ? T.green : T.red },
          ].map((s, i) => (
            <div key={i} className="stat-box">
              <p style={{ fontSize: 9, letterSpacing: "0.2em", color: T.ash, marginBottom: 10 }}>{s.label}</p>
              <p style={{ fontSize: 22, color: s.color, letterSpacing: "-0.01em" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Watch thresholds ─────────────────────────────────────── */}
      {stats && (
        <div style={{ marginBottom: 40, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Onboarding completion",  target: "20–40%", actual: stats.completion_rate, ok: stats.completion_rate_raw >= 20 && stats.completion_rate_raw <= 40 },
            { label: "$1 verify success",      target: ">90%",   actual: stats.verify_rate,     ok: stats.verify_rate_raw >= 90 },
            { label: "Trial → Paid (Day 7)",   target: "≥25%",   actual: stats.conversion_rate, ok: stats.conversion_rate_raw >= 25 },
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.ok ? T.green : T.red, flexShrink: 0 }} />
              <span style={{ color: T.fog }}>{t.label}:</span>
              <span style={{ color: T.bone }}>{t.actual}</span>
              <span style={{ color: T.ash }}>target {t.target}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Account table ─────────────────────────────────────────── */}
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>STRIPE ACCOUNT</th>
              <th>COUNTRY</th>
              <th>CURRENCY</th>
              <th>CONNECTED</th>
              <th>VERIFIED</th>
              <th>TRIAL START</th>
              <th>TRIAL EXPIRY</th>
              <th>STATE</th>
              <th>EMAILS</th>
              <th>PAID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td style={{ color: T.bone, fontFamily: "monospace" }}>{row.stripe_account_id}</td>
                <td>{row.country?.toUpperCase() || "—"}</td>
                <td>{row.default_currency?.toUpperCase() || "—"}</td>
                <td>{row.connected_at ? fmt(row.connected_at) : "—"}</td>
                <td>{row.verified_at
                  ? <span style={{ color: T.amber }}>✓ {fmt(row.verified_at)}</span>
                  : <span style={{ color: T.ash }}>✗</span>}
                </td>
                <td>{row.trial_started_at ? fmt(row.trial_started_at) : "—"}</td>
                <td>{row.trial_expires_at ? fmt(row.trial_expires_at) : "—"}</td>
                <td>
                  <span className="badge" style={{ color: statusColor(row.trial_state), border: `1px solid ${statusColor(row.trial_state)}33` }}>
                    {row.trial_state.replace("_", " ").toUpperCase()}
                  </span>
                </td>
                <td style={{ color: row.emails_sent > 0 ? T.bone : T.ash }}>{row.emails_sent}</td>
                <td>{row.paid
                  ? <span style={{ color: T.green }}>✓ PAID</span>
                  : <span style={{ color: T.ash }}>—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", color: T.ash, padding: "40px" }}>No accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
