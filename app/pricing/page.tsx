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

export default function PricingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: ${T.black}; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: ${T.bone}; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      .fu { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .cta-btn {
        width: 100%; background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase;
        padding: 22px 40px; border: none; cursor: pointer;
        transition: background 0.15s, transform 0.12s;
        display: flex; align-items: center; justify-content: center; gap: 10px;
      }
      .cta-btn:hover:not(:disabled) { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }
      .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .toggle-btn {
        font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.18em;
        padding: 8px 20px; border: 1px solid ${T.ash}; background: transparent;
        color: ${T.fog}; cursor: pointer; transition: all 0.15s; text-transform: uppercase;
      }
      .toggle-btn.active { background: ${T.bone}; color: ${T.black}; border-color: ${T.bone}; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url; // Stripe Checkout
    } catch (err: any) {
      console.error(err);
      setLoading(false);
    }
  };

  const GETS = [
    "Weekly CEO email",
    "5 non-negotiable metrics",
    "Auto-detected Core Action",
    "Forward Signal",
    "Zero setup",
    "Zero dashboards",
  ];

  const NOTS = [
    "Custom metrics",
    "Exports for arguing",
    "Vanity dashboards",
    "\"Insights\" fluff",
  ];

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "100px 24px 80px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(192,57,43,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: 32, left: 40, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>

        {/* Headline */}
        <div className="fu" style={{ textAlign: "center", marginBottom: 56, animationDelay: "0s" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.28em", color: T.red, marginBottom: 24 }}>
            ONE PLAN. NO TIERS.
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.0, fontWeight: 400, marginBottom: 20,
          }}>
            If this saves one bad decision,<br />
            <em style={{ color: T.red }}>it pays for itself.</em>
          </h1>
        </div>

        {/* Billing toggle */}
        <div className="fu" style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 40, animationDelay: "0.1s" }}>
          <button
            type="button"
            className={`toggle-btn${billing === "monthly" ? " active" : ""}`}
            onClick={(e) => { e.preventDefault(); setBilling("monthly"); }}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`toggle-btn${billing === "annual" ? " active" : ""}`}
            onClick={(e) => { e.preventDefault(); setBilling("annual"); }}
          >
            Annual
          </button>
        </div>

        {/* Price */}
        <div key={billing} className="fu" style={{ textAlign: "center", marginBottom: 48, animationDelay: "0.18s" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 4 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, color: T.fog, marginTop: 12 }}>$</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(72px, 14vw, 96px)", fontWeight: 300, color: T.bone, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {billing === "monthly" ? "99" : "999"}
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: T.fog, alignSelf: "flex-end", marginBottom: 8 }}>
              /{billing === "monthly" ? "mo" : "yr"}
            </span>
          </div>
          {billing === "annual" && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.amber, letterSpacing: "0.15em", marginTop: 8 }}>
              TWO MONTHS FREE
            </p>
          )}
        </div>

        {/* What you get / don't get */}
        <div className="fu" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 1, background: T.line, marginBottom: 36,
          animationDelay: "0.26s",
        }}>
          <div style={{ background: T.black, padding: "28px 24px" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.25em", color: T.amber, marginBottom: 20 }}>
              YOU GET
            </p>
            {GETS.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ color: T.amber, fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: T.fog, lineHeight: 1.4 }}>{item}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(192,57,43,0.04)", padding: "28px 24px" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.25em", color: T.ash, marginBottom: 20 }}>
              YOU DON'T GET
            </p>
            {NOTS.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ color: T.ash, fontSize: 12, marginTop: 2, flexShrink: 0 }}>✗</span>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: T.ash, lineHeight: 1.4 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="fu" style={{ animationDelay: "0.34s", display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="cta-btn" onClick={handleCheckout} disabled={loading}>
            {loading
              ? <><div className="spinner" /> Redirecting…</>
              : <>Start for ${billing === "monthly" ? "99/month" : "$999/year"} →</>
            }
          </button>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.ash,
            letterSpacing: "0.15em", textAlign: "center",
          }}>
            CANCEL ANYTIME. EMAILS STOP IMMEDIATELY.
          </p>
        </div>

      </div>
    </div>
  );
}
