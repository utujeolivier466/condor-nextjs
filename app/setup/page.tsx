"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const T = {
  black: "#0B0A08",
  bone:  "#F2EEE7",
  red:   "#C0392B",
  ash:   "#3D3A36",
  fog:   "#8C8882",
  line:  "rgba(242,238,231,0.1)",
};

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Syne:wght@400;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; background: ${T.black}; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: ${T.bone}; }
      @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      .fu { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .email-input {
        width: 100%;
        background: transparent;
        border: none;
        border-bottom: 1px solid ${T.ash};
        outline: none;
        font-family: 'Syne', sans-serif;
        font-size: clamp(20px, 4vw, 32px);
        font-weight: 400;
        color: ${T.bone};
        padding: 14px 0;
        transition: border-color 0.2s;
        caret-color: ${T.red};
      }
      .email-input:focus { border-color: ${T.bone}; }
      .email-input::placeholder { color: ${T.ash}; }
      .submit-btn {
        width: 100%;
        background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 20px 40px; border: none; cursor: pointer;
        transition: background 0.15s, transform 0.12s;
        display: flex; align-items: center; justify-content: center; gap: 10px;
      }
      .submit-btn:hover:not(:disabled) { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }
      .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
    `;
    document.head.appendChild(style);
  }, []);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValid) { setError("Enter a valid email address."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/setup/email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      router.push("/snapshot");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(192,57,43,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: 32, left: 40, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: "#C0392B", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>

        <p className="fu" style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: "0.28em", color: T.red,
          marginBottom: 32, animationDelay: "0s",
        }}>STRIPE CONNECTED ✓</p>

        <h1 className="fu" style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(36px, 6vw, 56px)",
          lineHeight: 1.0, fontWeight: 400,
          marginBottom: 20, animationDelay: "0.12s",
        }}>
          Where do we send<br />
          <em style={{ color: T.red }}>your Monday brief?</em>
        </h1>

        <p className="fu" style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 16, color: T.fog, lineHeight: 1.7,
          marginBottom: 52, animationDelay: "0.22s",
        }}>
          One email. Every Monday. That's all this is.
        </p>

        <div className="fu" style={{ animationDelay: "0.32s", marginBottom: 24 }}>
          <input
            className="email-input"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoFocus
            autoComplete="email"
          />
        </div>

        <div className="fu" style={{ animationDelay: "0.4s", display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading || !email}
          >
            {loading
              ? <><div className="spinner" /> Saving…</>
              : <>Show me the numbers →</>
            }
          </button>

          {error && (
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: T.red,
              letterSpacing: "0.1em", textAlign: "center",
            }}>{error}</p>
          )}

          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: T.ash,
            letterSpacing: "0.15em", textAlign: "center",
          }}>
            NO MARKETING. NO SPAM. REPLY TO CANCEL.
          </p>
        </div>

      </div>
    </div>
  );
}
