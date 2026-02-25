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

type HomeData = {
  last_email_at:   string | null;
  next_email_at:   string;
  emails_sent:     number;
  last_subject:    string | null;
  last_constraint: string | null;
  health_score:    "HEALTHY" | "FRAGILE" | "AT_RISK" | null;
};

export default function HomePage() {
  const router = useRouter();
  const [data, setData]     = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: ${T.black}; min-height: 100%; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: ${T.bone}; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      .fu { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      .pulse { animation: pulse 2s ease infinite; }
    `;
    document.head.appendChild(style);

    fetch("/api/home")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  };

  const healthColor = (score: string | null) => {
    if (score === "HEALTHY")  return T.amber;
    if (score === "FRAGILE")  return "#E8A838";
    if (score === "AT_RISK")  return T.red;
    return T.fog;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.black, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="pulse" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.ash, letterSpacing: "0.25em" }}>
          LOADING…
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      maxWidth: 640, margin: "0 auto",
      padding: "80px 40px",
    }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 80 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      {/* Health score */}
      {data?.health_score && (
        <div className="fu" style={{ marginBottom: 64, animationDelay: "0s" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: T.ash, marginBottom: 12 }}>
            CURRENT STATUS
          </p>
          <p style={{
            fontFamily: "'DM Serif Display', serif",
            fontStyle: "italic",
            fontSize: "clamp(40px, 8vw, 72px)",
            lineHeight: 1,
            color: healthColor(data.health_score),
          }}>
            {data.health_score.replace("_", " ")}
          </p>
        </div>
      )}

      {/* Last email sent */}
      <div className="fu" style={{
        borderTop: `1px solid ${T.line}`,
        paddingTop: 40, marginBottom: 40,
        animationDelay: "0.15s",
      }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: T.ash, marginBottom: 20 }}>
          LAST EMAIL
        </p>

        {data?.last_email_at ? (
          <>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.bone, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
              {data.last_subject || "Weekly CEO brief"}
            </p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.fog, letterSpacing: "0.1em", marginBottom: 16 }}>
              {formatDate(data.last_email_at)}
            </p>
            {data.last_constraint && (
              <p style={{
                fontFamily: "'DM Serif Display', serif",
                fontStyle: "italic",
                fontSize: 16, color: T.fog, lineHeight: 1.6,
                borderLeft: `2px solid ${T.ash}`,
                paddingLeft: 16,
              }}>
                "{data.last_constraint}"
              </p>
            )}
          </>
        ) : (
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.ash, lineHeight: 1.6 }}>
            Your first email hasn't been sent yet.
          </p>
        )}
      </div>

      {/* Next email */}
      <div className="fu" style={{
        borderTop: `1px solid ${T.line}`,
        paddingTop: 40,
        animationDelay: "0.28s",
      }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.25em", color: T.ash, marginBottom: 20 }}>
          NEXT EMAIL
        </p>

        {data?.next_email_at ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "clamp(24px, 5vw, 40px)",
                fontWeight: 300,
                color: T.bone,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}>
                {formatDate(data.next_email_at)}
              </p>
            </div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.fog, letterSpacing: "0.1em" }}>
              {formatTime(data.next_email_at)}
            </p>

            {/* Countdown indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
              <div className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: T.amber }} />
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.fog, letterSpacing: "0.15em" }}>
                ACTIVE — {data.emails_sent} EMAIL{data.emails_sent !== 1 ? "S" : ""} SENT
              </p>
            </div>
          </>
        ) : (
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.ash }}>Not scheduled.</p>
        )}
      </div>

    </div>
  );
}
