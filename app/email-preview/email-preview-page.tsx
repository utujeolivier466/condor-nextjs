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

// ── Mock email data (replaced with real data post-MVP) ────────────
const EMAIL = {
  subject: "Your SaaS is growing — but it's fragile",
  metrics: [
    { label: "Net Revenue Retention", value: "97%",     status: "warn" },
    { label: "New Net ARR",           value: "+$12,400", status: "good" },
    { label: "Burn Multiple",         value: "2.6",      status: "warn" },
    { label: "Core Action Conversion",value: "28%",      status: "bad"  },
    { label: "Forward Signal",        value: "At Risk",  status: "bad"  },
  ],
  constraint: "Too few users reach the moment where your product is worth paying for.",
  consequence: "If this doesn't change, revenue will stall within 60 days.",
};

export default function EmailPreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: ${T.black}; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: ${T.bone}; }

      @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

      .fu { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }

      .trial-btn {
        width: 100%;
        background: ${T.bone};
        color: ${T.black};
        font-family: 'Syne', sans-serif;
        font-weight: 800;
        font-size: 15px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 22px 40px;
        border: none;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, transform 0.12s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .trial-btn:hover:not(:disabled) {
        background: ${T.red};
        color: ${T.bone};
        transform: translateY(-1px);
      }
      .trial-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      @keyframes spin { to { transform: rotate(360deg); } }
      .spinner {
        width: 16px; height: 16px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      /* Email client simulation */
      .email-client {
        background: #1C1A18;
        border: 1px solid rgba(242,238,231,0.08);
        overflow: hidden;
      }
      .email-header {
        background: #141210;
        border-bottom: 1px solid rgba(242,238,231,0.06);
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .email-dot {
        width: 10px; height: 10px; border-radius: 50%;
      }
      .email-body {
        padding: 32px 28px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        line-height: 1.8;
        color: #c8c4be;
      }
      .metric-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 6px 0;
        border-bottom: 1px solid rgba(242,238,231,0.04);
      }
      .metric-row:last-child { border-bottom: none; }
    `;
    document.head.appendChild(style);

    setTimeout(() => setVisible(true), 100);
  }, []);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trial/start", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      router.push("/home");
    } catch {
      // Still redirect — don't block on API failure
      router.push("/home");
    }
  };

  const statusColor = (s: string) => {
    if (s === "good") return T.amber;
    if (s === "warn") return "#E8A838";
    return T.red;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: T.black,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "100px 24px 80px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background glow */}
      <div style={{
        position: "fixed", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 600,
        background: "radial-gradient(ellipse, rgba(192,57,43,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ position: "fixed", top: 32, left: 40, display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      <div style={{ width: "100%", maxWidth: 600, position: "relative", zIndex: 1 }}>

        {/* Headline */}
        <div className="fu" style={{ textAlign: "center", marginBottom: 64, animationDelay: "0s" }}>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, letterSpacing: "0.28em", color: T.red,
            marginBottom: 24,
          }}>EVERY MONDAY. 6AM.</p>

          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(36px, 6vw, 60px)",
            lineHeight: 1.0, fontWeight: 400,
            marginBottom: 20,
          }}>
            This is what you'll see<br />
            <em style={{ color: T.red }}>every Monday.</em>
          </h1>

          <p style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 17, color: T.fog, lineHeight: 1.6,
          }}>
            No dashboards. No excuses. Just reality.
          </p>
        </div>

        {/* Email simulation */}
        <div className="fu email-client" style={{ marginBottom: 52, animationDelay: "0.2s" }}>

          {/* Fake email client chrome */}
          <div className="email-header">
            <div className="email-dot" style={{ background: "#FF5F56" }} />
            <div className="email-dot" style={{ background: "#FFBD2E" }} />
            <div className="email-dot" style={{ background: "#27C93F" }} />
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: T.ash,
              marginLeft: 12, letterSpacing: "0.08em",
            }}>inbox</span>
          </div>

          {/* Email subject line */}
          <div style={{
            padding: "20px 28px",
            borderBottom: "1px solid rgba(242,238,231,0.06)",
            background: "#181614",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.fog, letterSpacing: "0.1em" }}>
                FROM: weekly@candor.so
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.ash }}>
                MON 6:00 AM
              </span>
            </div>
            <p style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700, fontSize: 15,
              color: T.bone,
            }}>{EMAIL.subject}</p>
          </div>

          {/* Email body — plain text simulation */}
          <div className="email-body">
            <p style={{ marginBottom: 20, color: T.fog }}>
              Here's what your business looks like this week:
            </p>

            {/* Metrics block */}
            <div style={{ marginBottom: 28 }}>
              {EMAIL.metrics.map((m, i) => (
                <div key={i} className="metric-row">
                  <span style={{ color: "#8C8882" }}>{m.label}:</span>
                  <span style={{
                    fontWeight: 600,
                    color: statusColor(m.status),
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                  }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Constraint */}
            <div style={{
              borderLeft: `2px solid ${T.red}`,
              paddingLeft: 16,
              marginBottom: 20,
            }}>
              <p style={{ color: T.bone, marginBottom: 8 }}>
                The constraint right now: <span style={{ color: T.bone, fontWeight: 600 }}>{EMAIL.constraint}</span>
              </p>
            </div>

            {/* Consequence */}
            <p style={{ color: T.red, fontWeight: 600 }}>
              {EMAIL.consequence}
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="fu" style={{ animationDelay: "0.4s" }}>
          <button
            className="trial-btn"
            onClick={handleStartTrial}
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" /> Starting…</>
              : <>Get started →</>
            }
          </button>

          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: T.ash,
            letterSpacing: "0.15em",
            textAlign: "center",
            marginTop: 16,
          }}>
            CANCEL ANYTIME. EMAILS STOP IMMEDIATELY.
          </p>
        </div>

      </div>
    </div>
  );
}
