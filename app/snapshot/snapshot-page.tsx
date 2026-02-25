"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const T = {
  black: "#0B0A08",
  bone:  "#F2EEE7",
  red:   "#C0392B",
  ash:   "#3D3A36",
  fog:   "#8C8882",
  amber: "#D4A843",
  line:  "rgba(242,238,231,0.1)",
};

type SnapshotData = {
  current_30d:   number;
  previous_30d:  number;
  pct_change:    number;
  is_demo:       boolean;
};

export default function SnapshotPage() {
  const router = useRouter();
  const [data, setData]       = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [countdown, setCountdown] = useState(7);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; background: ${T.black}; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: ${T.bone}; }

      @keyframes fadeUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
      @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
      @keyframes countDown {
        from { stroke-dashoffset: 0; }
        to   { stroke-dashoffset: 138; }
      }
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

      .fu  { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .fi  { animation: fadeIn 0.6s ease forwards; opacity:0; }

      .continue-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 12px;
        background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 18px 48px; border: none; cursor: pointer;
        transition: background 0.15s, color 0.15s, transform 0.12s;
        width: 100%;
      }
      .continue-btn:hover { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }

      .progress-ring {
        animation: countDown 7s linear forwards;
        stroke-dasharray: 138;
        stroke-dashoffset: 0;
        transform-origin: center;
        transform: rotate(-90deg);
      }

      .loading-pulse { animation: pulse 1.2s ease infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  // ── Fetch snapshot data ───────────────────────────────────────
  useEffect(() => {
    async function fetchSnapshot() {
      try {
        const res  = await fetch("/api/snapshot");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load snapshot.");
        setData(json);
        setLoading(false);
        // Trigger animations after data loads
        setTimeout(() => setVisible(true), 50);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    fetchSnapshot();
  }, []);

  // ── Auto-redirect countdown ───────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          router.push("/burn-input");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [data, router]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  const isUp = data && data.pct_change >= 0;

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.black, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <Logo />
        <p className="loading-pulse" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.ash, letterSpacing: "0.25em" }}>
          PULLING FROM STRIPE…
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: T.black, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "40px" }}>
        <Logo />
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.red, letterSpacing: "0.15em", textAlign: "center" }}>{error}</p>
        <button onClick={() => window.location.href = "/connect-stripe"} style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
          letterSpacing: "0.1em", textTransform: "uppercase",
          background: "transparent", color: T.fog, border: `1px solid ${T.ash}`,
          padding: "12px 28px", cursor: "pointer",
        }}>← Reconnect Stripe</button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative", overflow: "hidden",
    }}>
      {/* Radial glow behind number */}
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 500, height: 500,
        background: `radial-gradient(circle, ${isUp ? "rgba(212,168,67,0.07)" : "rgba(192,57,43,0.07)"} 0%, transparent 70%)`,
        pointerEvents: "none", transition: "background 1s ease",
      }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: 32, left: 40, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      {/* Demo badge */}
      {data?.is_demo && (
        <div style={{ position: "absolute", top: 32, right: 40 }}>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em",
            color: T.amber, border: `1px solid rgba(212,168,67,0.3)`,
            padding: "5px 12px", background: "rgba(212,168,67,0.08)",
          }}>⚡ DEMO</span>
        </div>
      )}

      {/* Countdown ring — top right if no demo badge */}
      {data && (
        <div style={{
          position: "absolute", top: 28, right: data?.is_demo ? "auto" : 40,
          left: data?.is_demo ? 40 : "auto",
          opacity: data?.is_demo ? 0 : 1, // hide if demo mode showing badge
        }}>
          <svg width="40" height="40" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke={T.ash} strokeWidth="1.5" />
            <circle cx="24" cy="24" r="22" fill="none" stroke={T.red} strokeWidth="1.5"
              className="progress-ring" />
            <text x="24" y="28" textAnchor="middle"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", fill: T.fog }}>
              {countdown}
            </text>
          </svg>
        </div>
      )}

      {/* Main content */}
      <div style={{ width: "100%", maxWidth: 560, textAlign: "center", position: "relative", zIndex: 1 }}>

        {/* Label */}
        <p className="fu" style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: "0.28em", color: T.red,
          marginBottom: 48, animationDelay: "0s",
        }}>LAST 30 DAYS</p>

        {/* Primary number — the punch */}
        <div className="fu" style={{ animationDelay: "0.1s", marginBottom: 24 }}>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "clamp(64px, 14vw, 120px)",
            fontWeight: 300,
            color: T.bone,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}>
            {data && fmt(data.current_30d)}
          </p>
        </div>

        {/* Comparison row */}
        <div className="fu" style={{
          animationDelay: "0.25s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
          marginBottom: 64,
        }}>
          {/* Previous period */}
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 14, color: T.fog, letterSpacing: "0.08em",
          }}>
            {data && fmt(data.previous_30d)}
          </p>

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: T.ash }} />

          {/* % change */}
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 18, fontWeight: 500,
            color: isUp ? T.amber : T.red,
            letterSpacing: "0.04em",
          }}>
            {data && (
              <>
                {isUp ? "↑" : "↓"}{" "}
                {Math.abs(data.pct_change).toFixed(1)}%
              </>
            )}
          </p>
        </div>

        {/* THE LINE */}
        <p className="fu" style={{
          animationDelay: "0.45s",
          fontFamily: "'DM Serif Display', serif",
          fontStyle: "italic",
          fontSize: "clamp(18px, 3vw, 24px)",
          color: T.fog,
          lineHeight: 1.5,
          marginBottom: 64,
          maxWidth: 400,
          margin: "0 auto 64px",
        }}>
          This is your Net Revenue retention.<br />
          We'll explain it later.
        </p>

        {/* Continue button + countdown */}
        <div className="fu" style={{ animationDelay: "0.6s", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <button className="continue-btn" onClick={() => router.push("/burn-input")}>
            Continue →
          </button>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: T.ash, letterSpacing: "0.2em",
          }}>
            AUTO-CONTINUING IN {countdown}s
          </p>
        </div>

      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
    </div>
  );
}
