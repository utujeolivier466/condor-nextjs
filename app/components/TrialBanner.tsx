"use client";

// ─── components/TrialBanner.tsx ───────────────────────────────────
// Shown at top of /home when trial is expired.
// No countdown. No urgency theater. The silence is the pressure.
// Import and render at top of home-page.tsx.

import { useState } from "react";

const T = {
  black: "#0B0A08",
  bone:  "#F2EEE7",
  red:   "#C0392B",
  ash:   "#3D3A36",
};

type Props = {
  expired: boolean;
};

export default function TrialBanner({ expired }: Props) {
  const [loading, setLoading] = useState(false);

  if (!expired) return null;

  const handleContinue = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ billing: "monthly" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: T.black,
      borderBottom: "1px solid rgba(192,57,43,0.4)",
      padding: "14px 40px",
      display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 24,
      flexWrap: "wrap",
    }}>
      <p style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 14, color: T.bone, lineHeight: 1.4,
      }}>
        Your access to reality has expired.
      </p>
      <button
        onClick={handleContinue}
        disabled={loading}
        style={{
          background: "transparent",
          border: "1px solid rgba(192,57,43,0.6)",
          color: T.bone,
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
          padding: "9px 20px", cursor: "pointer", whiteSpace: "nowrap",
          transition: "border-color 0.15s, color 0.15s",
          flexShrink: 0,
        }}
      >
        {loading ? "…" : "Continue receiving the weekly email — $99/month"}
      </button>
    </div>
  );
}
