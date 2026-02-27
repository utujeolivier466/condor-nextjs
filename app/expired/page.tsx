"use client";

import { useEffect, useState } from "react";

const T = {
  black: "#0B0A08",
  bone:  "#F2EEE7",
  red:   "#C0392B",
  ash:   "#3D3A36",
  fog:   "#8C8882",
  line:  "rgba(242,238,231,0.1)",
};

export default function ExpiredPage() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Syne:wght@400;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; background: ${T.black}; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      .fu { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .continue-btn {
        width: 100%; background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase;
        padding: 22px 40px; border: none; cursor: pointer;
        transition: background 0.15s, transform 0.12s;
        display: flex; align-items: center; justify-content: center; gap: 10px;
      }
      .continue-btn:hover:not(:disabled) { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }
      .continue-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ billing: "monthly" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative", overflow: "hidden",
    }}>

      {/* Subtle red glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(192,57,43,0.07) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: 32, left: 40, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Label */}
        <p className="fu" style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: "0.28em", color: T.ash,
          marginBottom: 36, animationDelay: "0s",
        }}>7-DAY TRIAL ENDED</p>

        {/* Headline */}
        <h1 className="fu" style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(52px, 10vw, 80px)",
          lineHeight: 0.92, fontWeight: 400,
          marginBottom: 40, animationDelay: "0.12s",
          color: T.bone,
        }}>
          Access<br />
          <em style={{ color: T.red }}>closed.</em>
        </h1>

        {/* Body */}
        <p className="fu" style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 18, color: T.fog, lineHeight: 1.75,
          marginBottom: 56, animationDelay: "0.24s",
          maxWidth: 380,
        }}>
          You've seen how your business actually behaves.
          If you want to keep seeing it, continue.
        </p>

        {/* CTA */}
        <div className="fu" style={{ animationDelay: "0.36s", display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="continue-btn" onClick={handleContinue} disabled={loading}>
            {loading
              ? <><div className="spinner" /> One moment…</>
              : <>Continue for $99/month →</>
            }
          </button>

          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: T.ash,
            letterSpacing: "0.15em", textAlign: "center",
          }}>
            CANCEL ANYTIME. EMAILS STOP IMMEDIATELY.
          </p>
        </div>

      </div>
    </div>
  );
}
