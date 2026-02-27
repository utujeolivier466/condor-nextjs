"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const T = { black: "#0B0A08", bone: "#F2EEE7", red: "#C0392B", fog: "#8C8882", amber: "#D4A843" };

// ─── /billing/success ─────────────────────────────────────────────
// Stripe redirects here after successful checkout.
// No celebration. No confetti. Straight to /home.
// The product IS the reward.

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; background: ${T.black}; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      .fi { animation: fadeIn 0.5s ease forwards; opacity:0; }
      @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      .pulse { animation: pulse 1.5s ease infinite; }
    `;
    document.head.appendChild(style);

    // Redirect to /home after 2 seconds — no lingering
    const t = setTimeout(() => router.push("/home"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 24,
    }}>
      <div className="fi" style={{ textAlign: "center" }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: "0.28em", color: T.amber,
          marginBottom: 20,
        }}>PAYMENT CONFIRMED</p>
        <p style={{
          fontFamily: "'DM Serif Display', serif",
          fontStyle: "italic",
          fontSize: "clamp(28px, 5vw, 44px)",
          color: T.bone, lineHeight: 1.1,
        }}>
          You'll hear from us<br />on Monday.
        </p>
      </div>
      <p className="pulse" style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10, color: T.fog, letterSpacing: "0.2em",
        marginTop: 16,
      }}>LOADING YOUR DASHBOARD…</p>
    </div>
  );
}
