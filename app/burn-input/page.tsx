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

export default function BurnInputPage() {
  const router = useRouter();
  const [burn, setBurn]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

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
      @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
      .fu { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .burn-input {
        width: 100%;
        background: transparent;
        border: none;
        border-bottom: 1px solid ${T.ash};
        outline: none;
        font-family: 'DM Mono', monospace;
        font-size: clamp(32px, 7vw, 64px);
        font-weight: 300;
        color: ${T.bone};
        padding: 16px 0;
        text-align: center;
        letter-spacing: -0.01em;
        transition: border-color 0.2s;
        caret-color: ${T.red};
      }
      .burn-input:focus { border-color: ${T.bone}; }
      .burn-input::placeholder { color: ${T.ash}; }
      .submit-btn {
        background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 18px 48px; border: none; cursor: pointer; width: 100%;
        transition: background 0.15s, transform 0.12s;
      }
      .submit-btn:hover:not(:disabled) { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }
      .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
  }, []);

  const handleSubmit = async () => {
    const value = parseFloat(burn.replace(/[^0-9.]/g, ""));
    if (!value || value <= 0) {
      setError("Enter your monthly burn. Approximate is fine.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/burn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_burn: value }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      // TODO: Create dashboard page - redirecting to home for now
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  // Format input as currency as user types
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setBurn(raw ? `$${Number(raw).toLocaleString()}` : "");
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative",
    }}>
      {/* Logo */}
      <div style={{ position: "absolute", top: 32, left: 40, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      {/* Step */}
      <div style={{ position: "absolute", top: 36, right: 40 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.ash, letterSpacing: "0.2em" }}>
          1 INPUT REMAINING
        </span>
      </div>

      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>

        <p className="fu" style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, letterSpacing: "0.28em", color: T.red,
          marginBottom: 32, animationDelay: "0s",
        }}>ONE QUESTION</p>

        <h1 className="fu" style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(36px, 6vw, 56px)",
          lineHeight: 1.0, fontWeight: 400,
          marginBottom: 16, animationDelay: "0.12s",
        }}>
          What do you spend<br />
          <em style={{ color: T.red }}>each month?</em>
        </h1>

        <p className="fu" style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 16, color: T.fog, lineHeight: 1.7,
          marginBottom: 52, animationDelay: "0.22s",
        }}>
          Salaries, tools, infrastructure. Everything.
          Approximate is fine — directional truth is enough.
        </p>

        <div className="fu" style={{ animationDelay: "0.32s", marginBottom: 32 }}>
          <input
            className="burn-input"
            type="text"
            placeholder="$0"
            value={burn}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="fu" style={{ animationDelay: "0.42s", display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="submit-btn" onClick={handleSubmit} disabled={loading || !burn}>
            {loading ? "Computing…" : "Compute My Numbers →"}
          </button>

          {error && (
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11, color: T.red, letterSpacing: "0.1em",
              textAlign: "center",
            }}>{error}</p>
          )}

          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: T.ash, letterSpacing: "0.15em",
            textAlign: "center",
          }}>
            THIS IS THE ONLY MANUAL INPUT. EVER.
          </p>
        </div>
      </div>
    </div>
  );
}
