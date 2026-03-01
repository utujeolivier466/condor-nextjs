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
  green: "#4A7A4A",
  line:  "rgba(242,238,231,0.08)",
};

type Step = "prefilter" | "connect" | "validate" | "reality" | "charge" | "done";

type AccountStatus = {
  charges_enabled: boolean;
  details_submitted: boolean;
  country: string;
  default_currency: string;
  livemode: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]           = useState<Step>("prefilter");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [checked, setChecked]     = useState(false);
  const [account, setAccount]     = useState<AccountStatus | null>(null);
  const [chargeOk, setChargeOk]   = useState(false);
  const [visible, setVisible]     = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;500;700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: ${T.black}; min-height: 100%; }
      body { color: ${T.bone}; font-family: 'Syne', sans-serif; -webkit-font-smoothing: antialiased; }
      ::selection { background: ${T.red}; color: ${T.bone}; }

      @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes spin   { to { transform: rotate(360deg); } }
      @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

      .fu  { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) forwards; opacity:0; }
      .fi  { animation: fadeIn 0.5s ease forwards; opacity:0; }
      .pulse { animation: pulse 1.5s ease infinite; }

      .primary-btn {
        width: 100%; background: ${T.bone}; color: ${T.black};
        font-family: 'Syne', sans-serif; font-weight: 800;
        font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase;
        padding: 20px 40px; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        transition: background 0.15s, color 0.15s, transform 0.12s;
      }
      .primary-btn:hover:not(:disabled) { background: ${T.red}; color: ${T.bone}; transform: translateY(-1px); }
      .primary-btn:disabled { opacity: 0.35; cursor: not-allowed; }

      .ghost-btn {
        width: 100%; background: transparent; color: ${T.ash};
        font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
        padding: 14px 24px; border: 1px solid ${T.ash}; cursor: pointer;
        transition: border-color 0.15s, color 0.15s;
      }
      .ghost-btn:hover { border-color: ${T.fog}; color: ${T.fog}; }

      .spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }

      .checkbox-row {
        display: flex; align-items: flex-start; gap: 14px; cursor: pointer;
        padding: 18px 20px; border: 1px solid ${T.ash};
        transition: border-color 0.2s;
      }
      .checkbox-row:hover { border-color: ${T.fog}; }
      .checkbox-row.checked { border-color: ${T.bone}; }

      .custom-check {
        width: 18px; height: 18px; border: 1px solid ${T.ash};
        flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, border-color 0.15s;
      }
      .custom-check.checked { background: ${T.bone}; border-color: ${T.bone}; }

      .step-indicator {
        display: flex; gap: 6px; align-items: center;
      }
      .step-dot {
        width: 5px; height: 5px; border-radius: 50%; background: ${T.ash};
        transition: background 0.3s, transform 0.3s;
      }
      .step-dot.active  { background: ${T.bone}; transform: scale(1.4); }
      .step-dot.done    { background: ${T.red}; }

      .success-ring {
        width: 64px; height: 64px; border-radius: 50%;
        border: 1px solid ${T.green};
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.5s ease forwards;
      }

      .divider { height: 1px; background: ${T.line}; }
    `;
    document.head.appendChild(style);

    setTimeout(() => setVisible(true), 50);

    // Check if we're returning from Stripe OAuth (has ?code= in URL)
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");
    const err    = params.get("error");

    if (err) {
      setStep("connect");
      setError("Stripe connection denied. You'll need to connect to continue.");
    } else if (code) {
      // Came back from Stripe OAuth — validate the account
      handleOAuthCallback(code);
    }
  }, []);

  // ── Handle Stripe OAuth callback ─────────────────────────────
  const handleOAuthCallback = async (code: string) => {
    setStep("validate");
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/onboarding/validate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Hard block: test mode
      if (!data.livemode) {
        setError("Test mode account detected. Connect your live Stripe account.");
        setStep("connect");
        setLoading(false);
        return;
      }

      // Account incomplete
      if (!data.details_submitted) {
        setError("Your Stripe account isn't complete enough to reflect reality. Finish Stripe setup, then return.");
        setStep("connect");
        setLoading(false);
        return;
      }

      setAccount(data);
      setLoading(false);
      setStep("reality");
    } catch (err: any) {
      setError(err.message);
      setStep("connect");
      setLoading(false);
    }
  };

  // ── Initiate Stripe OAuth ──────────────────────────────────────
  const handleStripeConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Run $1 verification charge ────────────────────────────────
  const handleVerificationCharge = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/onboarding/verify-charge", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChargeOk(true);
      setLoading(false);
      // Brief pause so they see the success, then advance
      setTimeout(() => setStep("done"), 1200);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Proceed to product ────────────────────────────────────────
  const handleEnter = () => {
    router.push("/setup");
  };

  const steps: Step[] = ["prefilter", "connect", "validate", "reality", "charge", "done"];
  const stepIndex = steps.indexOf(step);

  return (
    <div style={{
      minHeight: "100vh", background: T.black,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "80px 24px",
      position: "relative", overflow: "hidden",
    }}>

      {/* Background glow */}
      <div style={{
        position: "fixed", top: "40%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(192,57,43,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ position: "fixed", top: 32, left: 40, zIndex: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 26, height: 26, background: T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 15, color: T.bone }}>C</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", color: T.bone }}>CANDOR</span>
      </div>

      {/* Step indicators */}
      {step !== "prefilter" && (
        <div style={{ position: "fixed", top: 40, right: 40 }}>
          <div className="step-indicator">
            {["connect","validate","reality","charge","done"].map((s, i) => (
              <div key={s} className={`step-dot ${
                steps.indexOf(step) > i + 1 ? "done" :
                steps.indexOf(step) === i + 1 ? "active" : ""
              }`} />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 0: PRE-FILTER ───────────────────────────────────── */}
      {step === "prefilter" && (
        <div className="fu" style={{ width: "100%", maxWidth: 480, zIndex: 1 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.28em", color: T.red, marginBottom: 32 }}>
            BEFORE YOU PROCEED
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.0, fontWeight: 400, marginBottom: 28,
          }}>
            This only works with<br />
            <em style={{ color: T.red }}>a real Stripe account.</em>
          </h1>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.fog, lineHeight: 1.75, marginBottom: 48 }}>
            Test mode, fake data, or "just exploring" will not work.<br />
            This product is built for founders who want to know the truth — not practice knowing it.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button className="primary-btn" onClick={() => setStep("connect")}>
              Continue with real Stripe →
            </button>
            <button className="ghost-btn" onClick={() => router.push("/")}>
              Leave
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: STRIPE CONNECT ───────────────────────────────── */}
      {step === "connect" && (
        <div key="connect" className="fu" style={{ width: "100%", maxWidth: 480, zIndex: 1 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.28em", color: T.red, marginBottom: 32 }}>
            STEP 1 OF 4
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.0, fontWeight: 400, marginBottom: 28,
          }}>
            Connect your<br />
            <em style={{ color: T.red }}>live Stripe account.</em>
          </h1>

          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.fog, lineHeight: 1.75, marginBottom: 16 }}>
            Read-only. We cannot move money.
          </p>

          {/* Trust signals */}
          <div style={{ marginBottom: 40 }}>
            {["Read-only access only", "No charge permissions ever", "Disconnect in Stripe anytime"].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 2 ? `1px solid ${T.line}` : "none" }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5.5" stroke={T.ash} strokeWidth="1"/>
                  <path d="M3.5 6.5l2 2 4-4" stroke={T.red} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.fog, letterSpacing: "0.1em" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* No Stripe yet */}
          <div style={{ background: "rgba(242,238,231,0.03)", border: `1px solid ${T.line}`, padding: "20px 24px", marginBottom: 32 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: T.ash, marginBottom: 12 }}>
              DON'T HAVE STRIPE YET?
            </p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, color: T.fog, lineHeight: 1.6, marginBottom: 16 }}>
              You'll create one in ~5 minutes. You don't need revenue yet. You do need to be serious.
            </p>
            <a
              href="https://dashboard.stripe.com/register"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11,
                color: T.bone, letterSpacing: "0.15em", textDecoration: "none",
                borderBottom: `1px solid ${T.ash}`, paddingBottom: 2,
              }}
            >
              CREATE STRIPE ACCOUNT →
            </a>
          </div>

          {error && (
            <div style={{ border: `1px solid rgba(192,57,43,0.4)`, padding: "14px 18px", marginBottom: 24 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.red, letterSpacing: "0.08em", lineHeight: 1.6 }}>{error}</p>
            </div>
          )}

          <button className="primary-btn" onClick={handleStripeConnect} disabled={loading}>
            {loading
              ? <><div className="spinner" /> Connecting…</>
              : <><StripeIcon /> Connect live Stripe account</>
            }
          </button>
        </div>
      )}

      {/* ── STEP 2: VALIDATING (shown during OAuth callback) ──────── */}
      {step === "validate" && (
        <div key="validate" className="fi" style={{ width: "100%", maxWidth: 480, zIndex: 1, textAlign: "center" }}>
          <p className="pulse" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.ash, letterSpacing: "0.25em", marginBottom: 24 }}>
            VERIFYING ACCOUNT…
          </p>
          {[
            "Live mode confirmed",
            "Charges enabled",
            "Account details complete",
            "Currency set",
          ].map((check, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 12, opacity: loading ? 0.4 : 1, transition: `opacity ${0.3 + i * 0.15}s` }}>
              <div className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: T.amber }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.fog, letterSpacing: "0.1em" }}>{check}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 3: REALITY CHECK ───────────────────────────────── */}
      {step === "reality" && (
        <div key="reality" className="fu" style={{ width: "100%", maxWidth: 480, zIndex: 1 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.28em", color: T.red, marginBottom: 32 }}>
            STEP 2 OF 4
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.0, fontWeight: 400, marginBottom: 28,
          }}>
            This will<br />
            <em style={{ color: T.red }}>expose things.</em>
          </h1>

          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.fog, lineHeight: 1.6, marginBottom: 8 }}>
            Specifically:
          </p>
          {["Churn", "Failed growth", "Expensive sales"].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.ash, marginTop: 2 }}>—</span>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.fog }}>{item}</p>
            </div>
          ))}

          <p style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic", fontSize: 17, color: T.fog, lineHeight: 1.6, margin: "28px 0 40px" }}>
            If you don't want that, stop now.
          </p>

          {/* The checkbox that matters */}
          <div
            className={`checkbox-row ${checked ? "checked" : ""}`}
            onClick={() => setChecked(!checked)}
            style={{ marginBottom: 28 }}
          >
            <div className={`custom-check ${checked ? "checked" : ""}`}>
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke={T.black} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: checked ? T.bone : T.fog, lineHeight: 1.5, transition: "color 0.2s" }}>
              I want the real numbers, not comfort
            </p>
          </div>

          <button className="primary-btn" onClick={() => setStep("charge")} disabled={!checked}>
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 4: $1 VERIFICATION CHARGE ──────────────────────── */}
      {step === "charge" && (
        <div key="charge" className="fu" style={{ width: "100%", maxWidth: 480, zIndex: 1 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.28em", color: T.red, marginBottom: 32 }}>
            STEP 3 OF 4
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.0, fontWeight: 400, marginBottom: 28,
          }}>
            Prove your Stripe<br />
            <em style={{ color: T.red }}>actually works.</em>
          </h1>

          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.fog, lineHeight: 1.75, marginBottom: 20 }}>
            We'll run a $1 verification charge.
          </p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: T.fog, lineHeight: 1.75, marginBottom: 40 }}>
            This proves your Stripe is operational. It is not a fee.
          </p>

          {/* $1 breakdown */}
          <div style={{ background: "rgba(242,238,231,0.03)", border: `1px solid ${T.line}`, padding: "20px 24px", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.fog, letterSpacing: "0.1em" }}>VERIFICATION CHARGE</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.bone }}>$1.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.fog, letterSpacing: "0.1em" }}>LABEL</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.fog }}>Candor account verification</span>
            </div>
          </div>

          {error && (
            <div style={{ border: `1px solid rgba(192,57,43,0.4)`, padding: "14px 18px", marginBottom: 24 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.red, letterSpacing: "0.08em", lineHeight: 1.6 }}>
                {error}<br />
                <span style={{ color: T.ash, marginTop: 8, display: "block" }}>Fix your Stripe account, then try again.</span>
              </p>
            </div>
          )}

          {chargeOk ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="success-ring">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L19 7" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: T.green, letterSpacing: "0.12em" }}>
                VERIFIED. ENTERING CANDOR…
              </p>
            </div>
          ) : (
            <button className="primary-btn" onClick={handleVerificationCharge} disabled={loading}>
              {loading
                ? <><div className="spinner" /> Processing $1 charge…</>
                : <>Run $1 verification →</>
              }
            </button>
          )}
        </div>
      )}

      {/* ── STEP 5: DONE → TRANSITION ───────────────────────────── */}
      {step === "done" && (
        <div key="done" className="fu" style={{ width: "100%", maxWidth: 480, zIndex: 1, textAlign: "center" }}>
          <div style={{ marginBottom: 40, display: "flex", justifyContent: "center" }}>
            <div className="success-ring" style={{ width: 80, height: 80 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16l7 7L26 9" stroke={T.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.28em", color: T.green, marginBottom: 24 }}>
            ACCOUNT VERIFIED
          </p>
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 6vw, 48px)",
            lineHeight: 1.05, fontWeight: 400, marginBottom: 24,
          }}>
            Stripe is live.<br />
            <em style={{ color: T.bone }}>Let's see your numbers.</em>
          </h1>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: T.fog, lineHeight: 1.7, marginBottom: 48 }}>
            Your Stripe account is connected and verified.<br />
            One more thing before we pull your data.
          </p>
          <button className="primary-btn" onClick={handleEnter}>
            Enter Candor →
          </button>
        </div>
      )}

    </div>
  );
}

function StripeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
    </svg>
  );
}
