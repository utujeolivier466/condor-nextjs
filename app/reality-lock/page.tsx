"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const T = {
  black: "#0B0A08",
  bone:  "#F2EEE7",
  red:   "#C0392B",
  ash:   "#3D3A36",
  fog:   "#8C8882",
  line:  "rgba(242,238,231,0.08)",
};

// ─── /reality-lock ────────────────────────────────────────────────
// Shown exactly once, immediately after onboarding.
// No back button. No skip.
// Flips them from user → owner.

export default function RealityLockPage() {
  const router = useRouter();

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
      ::selection { background: ${T.red}; color: ${T.bone}; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
      .fu { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .enter-btn {
        width: 100%; background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 14px; letter-spacing: 0.07em; text-transform: uppercase;
        padding: 22px 40px; border: none; cursor: pointer;
        transition: background 0.15s, color 0.15s, transform 0.12s;
      }
      .enter-btn:hover { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative",
    }}>

      {/* No logo. No nav. No exit. */}

      {/* Single vertical red line — you are being watched */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        width: 2, background: T.red, opacity: 0.5,
      }} />

      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>

        <h1 className="fu" style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(36px, 7vw, 64px)",
          lineHeight: 1.0, fontWeight: 400,
          marginBottom: 48, animationDelay: "0s",
        }}>
          Your business is now<br />
          <em style={{ color: T.red }}>observable.</em>
        </h1>

        <div className="fu" style={{ marginBottom: 56, animationDelay: "0.2s" }}>
          {[
            "We will not hide bad numbers.",
            "We will not soften conclusions.",
          ].map((line, i) => (
            <p key={i} style={{
              fontFamily: "'DM Serif Display', serif",
              fontStyle: "italic",
              fontSize: "clamp(18px, 3vw, 22px)",
              color: T.fog, lineHeight: 1.6,
              paddingBottom: 16,
              borderBottom: i === 0 ? `1px solid ${T.line}` : "none",
              marginBottom: i === 0 ? 16 : 0,
            }}>{line}</p>
          ))}
        </div>

        <p className="fu" style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 15, color: T.ash, lineHeight: 1.7,
          marginBottom: 48, animationDelay: "0.35s",
        }}>
          If that becomes uncomfortable, cancel —<br />the numbers stop.
        </p>

        <div className="fu" style={{ animationDelay: "0.5s" }}>
          <button className="enter-btn" onClick={() => router.push("/snapshot")}>
            Enter Snapshot →
          </button>
        </div>

      </div>
    </div>
  );
}
