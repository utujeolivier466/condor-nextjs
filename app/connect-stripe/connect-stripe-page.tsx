"use client";

import { useEffect, useState } from "react";

// ─── BRAND TOKENS ────────────────────────────────────────────────
const T = {
  black: "#0B0A08",
  bone:  "#F2EEE7",
  red:   "#C0392B",
  ash:   "#3D3A36",
  fog:   "#8C8882",
  line:  "rgba(242,238,231,0.1)",
};

export default function ConnectStripePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Syne:wght@400;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; }
      body { background: ${T.black}; color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: ${T.bone}; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      .fu { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .connect-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 12px;
        background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase;
        padding: 22px 52px; border: none; cursor: pointer; width: 100%;
        transition: background 0.15s, color 0.15s, transform 0.12s;
      }
      .connect-btn:hover:not(:disabled) { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }
      .connect-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .spinner { width: 18px; height: 18px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      // Redirect to Stripe OAuth
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(192,57,43,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div className="fu" style={{ position: "absolute", top: 32, left: 40, animationDelay: "0s", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      {/* Main card */}
      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>

        {/* Step indicator */}
        <p className="fu" style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: "0.25em", color: T.red,
          marginBottom: 32, animationDelay: "0.05s",
        }}>STEP 1 OF 1</p>

        {/* Headline */}
        <h1 className="fu" style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(40px, 7vw, 64px)",
          lineHeight: 0.95, fontWeight: 400,
          marginBottom: 20, animationDelay: "0.15s",
        }}>
          Stripe is the only<br />
          <em style={{ color: T.red }}>source of truth.</em>
        </h1>

        {/* Subtext */}
        <p className="fu" style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 17, color: T.fog, lineHeight: 1.7,
          marginBottom: 52, animationDelay: "0.25s",
        }}>
          If it's not in Stripe, it's not real.
        </p>

        {/* Trust signals */}
        <div className="fu" style={{ marginBottom: 32, animationDelay: "0.35s" }}>
          {[
            "Read-only access",
            "No charge permissions",
            "Disconnect anytime",
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 0",
              borderBottom: i < 2 ? `1px solid ${T.line}` : "none",
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke={T.ash} strokeWidth="1"/>
                <path d="M4 7l2 2 4-4" stroke={T.red} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 12, letterSpacing: "0.12em", color: T.fog,
              }}>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="fu" style={{ animationDelay: "0.45s" }}>
          <button
            className="connect-btn"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" />Connecting…</>
            ) : (
              <>
                <StripeIcon />
                Connect Stripe
              </>
            )}
          </button>

          {error && (
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: T.red,
              letterSpacing: "0.1em", marginTop: 16,
              textAlign: "center",
            }}>{error}</p>
          )}
        </div>

      </div>

      {/* Bottom tagline */}
      <p className="fu" style={{
        position: "absolute", bottom: 32,
        fontFamily: "'DM Mono', monospace",
        fontSize: 10, color: T.ash, letterSpacing: "0.2em",
        animationDelay: "0.6s",
      }}>
        REVENUE IS TRUTH.
      </p>
    </div>
  );
}

function StripeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
    </svg>
  );
}
