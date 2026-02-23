"use client";

import { useState, useEffect, useRef, ReactNode, CSSProperties, RefObject, JSX } from "react";

// ─── TYPES ───────────────────────────────────────────────────────
interface BrandTokens {
  black: string;
  bone: string;
  red: string;
  ash: string;
  fog: string;
  amber: string;
  line: string;
}

interface NumberItem {
  n: string;
  name: string;
  abbr: string;
  color: string;
  verdict: string;
  body: string;
}

interface StepItem {
  n: string;
  title: string;
  body: string;
}

interface InViewHookReturn {
  ref: RefObject<HTMLDivElement>;
  visible: boolean;
}

interface RevealProps {
  children?: ReactNode;
  style?: CSSProperties;
  delay?: number;
}

interface LabelProps {
  children?: ReactNode;
  color?: string;
}

// ─── BRAND TOKENS (synced with candor-brand-board.jsx) ───────────
const T: BrandTokens = {
  black:  "#0B0A08",
  bone:   "#F2EEE7",
  red:    "#C0392B",
  ash:    "#3D3A36",
  fog:    "#8C8882",
  amber:  "#D4A843",
  line:   "rgba(242,238,231,0.1)",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=Syne:wght@400;500;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black:  ${T.black};
    --bone:   ${T.bone};
    --red:    ${T.red};
    --ash:    ${T.ash};
    --fog:    ${T.fog};
    --amber:  ${T.amber};
    --line:   ${T.line};
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--black);
    color: var(--bone);
    font-family: 'Syne', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  ::selection { background: var(--red); color: var(--bone); }

  .mono  { font-family: 'DM Mono', monospace; }
  .serif { font-family: 'DM Serif Display', serif; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade-up {
    opacity: 0;
    animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: var(--bone);
    color: var(--black);
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 18px 36px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s, color 0.15s, transform 0.15s;
    white-space: nowrap;
  }
  .btn-primary:hover {
    background: var(--red);
    color: var(--bone);
    transform: translateY(-1px);
  }
  .btn-nav {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--red);
    color: var(--bone);
    font-family: 'DM Mono', monospace;
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 11px 22px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.15s;
  }
  .btn-nav:hover { opacity: 0.85; transform: translateY(-1px); }

  .logo-mark {
    width: 28px; height: 28px;
    background: var(--red);
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .logo-mark span {
    font-family: 'DM Serif Display', serif;
    font-style: italic;
    font-size: 17px;
    color: var(--bone);
    line-height: 1;
  }
  .logo-wordmark {
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.22em;
    color: var(--bone);
  }

  hr.rule { border: none; border-top: 1px solid var(--line); margin: 0; }

  .num-row {
    border-top: 1px solid var(--line);
    cursor: pointer;
    transition: background 0.2s;
  }
  .num-row:hover { background: rgba(192,57,43,0.04); }
  .num-row.active { background: rgba(192,57,43,0.07); }

  .reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1);
  }
  .reveal.visible { opacity: 1; transform: none; }

  body::after {
    content: '';
    position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 9999;
    opacity: 0.35;
  }

  @media (max-width: 768px) {
    .two-col  { grid-template-columns: 1fr !important; gap: 48px !important; }
    .four-col { grid-template-columns: 1fr 1fr !important; }
    .two-col-sm { grid-template-columns: 1fr !important; }
    .hide-mob { display: none !important; }
    .pad { padding-left: 20px !important; padding-right: 20px !important; }
  }
`;

// ─── DATA ────────────────────────────────────────────────────────
const NUMBERS: NumberItem[] = [
  {
    n: "01", name: "Net Revenue Retention", abbr: "NRR", color: T.amber,
    verdict: "If this isn't compounding, growth is fake.",
    body: "The single most honest number in SaaS. It tells you whether existing customers are expanding or quietly leaving. A business with strong NRR survives almost any mistake. One with weak NRR is decaying — even when the top line looks fine.",
  },
  {
    n: "02", name: "New Net ARR (Last 30 Days)", abbr: "ARR", color: T.amber,
    verdict: "Momentum right now — not last quarter's story.",
    body: "New revenue minus revenue lost in the last 30 days. Not cumulative. Not trailing. Right now. This tells you whether the engine is actually moving — or whether you're coasting on old wins while the business quietly stalls.",
  },
  {
    n: "03", name: "Burn Multiple", abbr: "BRN", color: T.red,
    verdict: "How much cash you're burning to buy growth.",
    body: "Every dollar of new ARR — what did it cost you? Below 1x is exceptional. Above 2x is a problem. Most founders have never calculated this correctly. This number makes the cost of growth impossible to ignore.",
  },
  {
    n: "04", name: "Core Action Conversion", abbr: "CAC", color: T.red,
    verdict: "The percentage of new customers who actually reach value.",
    body: "Most customers churn because they never experienced the core benefit. This metric exposes whether onboarding actually works — not whether you're acquiring users.",
  },
  {
    n: "05", name: "Forward Signal", abbr: "FWD", color: T.amber,
    verdict: "The earliest warning that revenue is about to feel pain.",
    body: "Revenue doesn't drop suddenly. It disappears slowly, starting with invisible damage upstream. This catches the warning signs weeks before they show up in your numbers.",
  },
];

const STEPS: StepItem[] = [
  {
    n: "1",
    title: "Connect Stripe",
    body: "Read-only. No setup. No configuration. Takes minutes.",
  },
  {
    n: "2",
    title: "We compute the numbers automatically",
    body: "Using strict definitions founders don't like — but investors trust.",
  },
  {
    n: "3",
    title: "You get a single health score",
    body: "Healthy. Fragile. At Risk. No ambiguity about where you stand.",
  },
  {
    n: "4",
    title: "You receive a weekly CEO brief",
    body: "What changed. Why it matters. What needs attention now. No noise when nothing matters.",
  },
];

const TRUST: string[] = [
  "Read-only access",
  "No data selling",
  "Cancel anytime",
  "If the numbers don't match reality, you don't pay",
];

// ─── HOOKS ───────────────────────────────────────────────────────
function useInView(threshold: number = 0.12): InViewHookReturn {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<boolean>(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ─── PRIMITIVES ──────────────────────────────────────────────────
function Reveal({ children, style, delay = 0 }: RevealProps): JSX.Element {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`reveal${visible ? " visible" : ""}`}
      style={{ transitionDelay: `${delay}s`, ...style }}
    >
      {children}
    </div>
  );
}

function Label({ children, color = T.red }: LabelProps): JSX.Element {
  return (
    <p className="mono" style={{
      fontSize: 10, letterSpacing: "0.25em",
      color, marginBottom: 28, textTransform: "uppercase",
    }}>{children}</p>
  );
}

function Logo(): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="logo-mark"><span>C</span></div>
      <span className="logo-wordmark">CANDOR</span>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────
export default function CandorLanding(): JSX.Element {
  const [activeNum, setActiveNum] = useState<number>(0);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{styles}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 40px", height: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: scrolled ? `1px solid ${T.line}` : "1px solid transparent",
        background: scrolled ? "rgba(11,10,8,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        transition: "all 0.3s ease",
      }}>
        <Logo />
        <a href="#connect" className="btn-nav">Connect Stripe →</a>
      </nav>

      {/* ── HERO ── */}
      <div style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "140px 40px 80px",
        maxWidth: 1100, margin: "0 auto",
        position: "relative",
      }} className="pad">
        <div className="hide-mob" style={{
          position: "absolute", left: 0, top: "15%", bottom: "15%",
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${T.red}, transparent)`,
          opacity: 0.35,
        }} />

        <p className="mono fade-up" style={{
          fontSize: 10, letterSpacing: "0.28em", color: T.red,
          marginBottom: 40, animationDelay: "0.05s",
        }}>
          FIVE NUMBERS. ONE WEEKLY BRIEF. ZERO NOISE.
        </p>

        <h1 className="serif fade-up" style={{
          fontSize: "clamp(46px, 8vw, 100px)",
          lineHeight: 0.95, fontWeight: 400,
          marginBottom: 36, animationDelay: "0.18s",
          maxWidth: 860,
        }}>
          You are either{" "}
          <em style={{ color: T.amber }}>compounding</em>{" "}—<br />
          or you just haven't noticed<br />
          <em style={{ color: T.red }}>the decay yet.</em>
        </h1>

        <p className="fade-up" style={{
          fontFamily: "'Syne'", fontSize: "clamp(16px, 2vw, 20px)",
          color: T.fog, maxWidth: 540, lineHeight: 1.75,
          marginBottom: 14, animationDelay: "0.32s",
        }}>
          One screen. Five numbers. No setup. No interpretation.
        </p>
        <p className="fade-up" style={{
          fontFamily: "'Syne'", fontSize: "clamp(16px, 2vw, 20px)",
          color: T.fog, maxWidth: 540, lineHeight: 1.75,
          marginBottom: 52, animationDelay: "0.38s",
        }}>
          This shows you — honestly — whether your SaaS is getting stronger
          or quietly bleeding underneath the surface.
        </p>

        <div className="fade-up" style={{ animationDelay: "0.5s", display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
          <a href="#connect" className="btn-primary">→ Connect Stripe</a>
          <p className="mono" style={{ fontSize: 10, color: T.ash, letterSpacing: "0.2em" }}>
            READ-ONLY. NO SETUP. NO CONFIGURATION.
          </p>
        </div>

        <div className="fade-up hide-mob" style={{
          position: "absolute", bottom: 48, left: 40,
          display: "flex", alignItems: "center", gap: 12,
          animationDelay: "0.9s",
        }}>
          <div style={{ width: 24, height: 1, background: T.ash }} />
          <p className="mono" style={{ fontSize: 9, color: T.ash, letterSpacing: "0.2em" }}>SCROLL</p>
        </div>
      </div>

      <hr className="rule" />

      {/* ── PROBLEM ── */}
      <div style={{ padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }} className="pad">
        <Reveal>
          <Label>The Problem</Label>
          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
            <div>
              <h2 className="serif" style={{
                fontSize: "clamp(32px, 4.5vw, 58px)",
                lineHeight: 1.0, fontWeight: 400, marginBottom: 24,
              }}>
                You probably check revenue.<br />
                You probably check cash.
              </h2>
              <p style={{
                fontFamily: "'Syne'", fontSize: 19,
                color: T.red, fontWeight: 700, lineHeight: 1.5,
              }}>
                That's not the same as knowing<br />if the business is healthy.
              </p>
            </div>
            <div style={{ paddingTop: 4 }}>
              <p style={{ fontFamily: "'Syne'", fontSize: 17, color: T.fog, lineHeight: 1.8, marginBottom: 28 }}>
                Most founders miss the early damage:
              </p>
              {[
                "Expansion slows before churn appears",
                'Burn drifts up while growth "looks fine"',
                "Onboarding breaks quietly, then shows up months later",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
                  <span style={{ color: T.red, marginTop: 6, fontSize: 10, flexShrink: 0 }}>—</span>
                  <p style={{ fontFamily: "'Syne'", fontSize: 17, color: T.fog, lineHeight: 1.7 }}>{t}</p>
                </div>
              ))}
              <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${T.line}` }}>
                <p style={{ fontFamily: "'Syne'", fontSize: 17, color: T.bone, lineHeight: 1.8, marginBottom: 16 }}>
                  By the time it's obvious, the options are worse and more expensive.
                </p>
                <p style={{ fontFamily: "'DM Serif Display'", fontStyle: "italic", fontSize: 21, color: T.fog, lineHeight: 1.5 }}>
                  If you don't see the signal early, you don't get to fix it cheaply.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── REFRAME ── */}
      <div style={{ background: T.bone, color: T.black }}>
        <div style={{ padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }} className="pad">
          <Reveal>
            <Label color={T.red}>The Reframe</Label>
            <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
              <h2 className="serif" style={{
                fontSize: "clamp(32px, 4.5vw, 58px)",
                lineHeight: 1.0, fontWeight: 400,
              }}>
                Clarity doesn't come from more dashboards.
              </h2>
              <div style={{ paddingTop: 4 }}>
                <p style={{ fontFamily: "'Syne'", fontSize: 18, color: "#5a5652", lineHeight: 1.8, marginBottom: 20 }}>
                  It comes from less tolerance for noise.
                </p>
                <p style={{ fontFamily: "'Syne'", fontSize: 18, color: "#5a5652", lineHeight: 1.8, marginBottom: 20 }}>
                  Strong companies are not built by watching everything. They're built by watching{" "}
                  <span style={{ color: T.black, fontWeight: 700 }}>what decides survival.</span>
                </p>
                <div style={{ borderLeft: `2px solid ${T.red}`, paddingLeft: 24, marginTop: 40 }}>
                  <p style={{
                    fontFamily: "'DM Serif Display'", fontStyle: "italic",
                    fontSize: 22, color: T.black, lineHeight: 1.5, marginBottom: 14,
                  }}>
                    If these numbers are healthy, mistakes are survivable.
                  </p>
                  <p style={{
                    fontFamily: "'DM Serif Display'", fontStyle: "italic",
                    fontSize: 22, color: T.red, lineHeight: 1.5,
                  }}>
                    If they're not, optimism doesn't matter.
                  </p>
                </div>
                <p style={{ fontFamily: "'Syne'", fontSize: 14, color: "#8C8882", lineHeight: 1.7, marginTop: 28 }}>
                  This product removes everything else.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── 5 NUMBERS ── */}
      <div style={{ padding: "100px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }} className="pad">
          <Reveal>
            <Label>The Only 5 Numbers That Matter</Label>
            <h2 className="serif" style={{
              fontSize: "clamp(32px, 4.5vw, 58px)",
              lineHeight: 1.0, fontWeight: 400, marginBottom: 16,
            }}>
              If you can't answer these immediately,<br />
              <em style={{ color: T.red }}>you're guessing.</em>
            </h2>
            <p style={{ fontFamily: "'Syne'", fontSize: 15, color: T.fog, marginBottom: 64 }}>
              Click each to understand what it exposes.
            </p>
          </Reveal>
        </div>

        {NUMBERS.map((item, i) => (
          <div
            key={i}
            className={`num-row${activeNum === i ? " active" : ""}`}
            onClick={() => setActiveNum(activeNum === i ? -1 : i)}
          >
            <div style={{
              maxWidth: 1100, margin: "0 auto", padding: "26px 40px",
              display: "grid",
              gridTemplateColumns: "64px 1fr auto",
              gap: 32, alignItems: "center",
            }}>
              <span className="mono" style={{ fontSize: 10, color: item.color, letterSpacing: "0.18em" }}>
                {item.n}
              </span>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <h3 className="serif" style={{
                    fontSize: "clamp(20px, 2.8vw, 34px)",
                    fontWeight: 400, lineHeight: 1.1,
                  }}>{item.name}</h3>
                  <span className="mono" style={{ fontSize: 10, color: T.ash, letterSpacing: "0.18em" }}>
                    {item.abbr}
                  </span>
                </div>
                <p style={{
                  fontFamily: "'Syne'", fontSize: 14, color: T.fog,
                  marginTop: 6, lineHeight: 1.5,
                }}>{item.verdict}</p>
                {activeNum === i && (
                  <p style={{
                    marginTop: 18, fontSize: 16, color: T.fog,
                    lineHeight: 1.8, maxWidth: 580,
                    fontFamily: "'Syne'",
                    animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
                  }}>
                    {item.body}
                  </p>
                )}
              </div>
              <span style={{
                fontSize: 20, color: activeNum === i ? T.red : T.ash,
                transition: "transform 0.25s, color 0.25s",
                transform: activeNum === i ? "rotate(45deg)" : "none",
                display: "block", flexShrink: 0,
              }}>+</span>
            </div>
          </div>
        ))}
        <hr className="rule" />
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ background: T.bone, color: T.black }}>
        <div style={{ padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }} className="pad">
          <Reveal>
            <Label color={T.red}>How It Works</Label>
            <h2 className="serif" style={{
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.0, fontWeight: 400, marginBottom: 60,
            }}>
              Four steps.<br /><em>Then it runs itself.</em>
            </h2>
            <div className="four-col" style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1, background: "#c8c4bc",
            }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ background: T.bone, padding: "40px 28px" }}>
                  <span className="mono" style={{
                    fontSize: 9, letterSpacing: "0.25em",
                    color: T.red, display: "block", marginBottom: 20,
                  }}>STEP {s.n}</span>
                  <p style={{
                    fontFamily: "'Syne'", fontSize: 15,
                    fontWeight: 700, color: T.black, lineHeight: 1.5, marginBottom: 10,
                  }}>{s.title}</p>
                  <p style={{
                    fontFamily: "'Syne'", fontSize: 13,
                    color: "#8C8882", lineHeight: 1.65,
                  }}>{s.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── QUALIFICATION ── */}
      <div style={{ padding: "100px 40px", maxWidth: 1100, margin: "0 auto" }} className="pad">
        <Reveal>
          <Label>Who This Is For</Label>
          <h2 className="serif" style={{
            fontSize: "clamp(32px, 4.5vw, 56px)",
            lineHeight: 1.0, fontWeight: 400, marginBottom: 60,
          }}>
            If you're not ready for the truth,<br />
            <em style={{ color: T.red }}>don't connect.</em>
          </h2>
          <div className="two-col" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 1, background: T.line,
          }}>
            <div style={{ background: "rgba(192,57,43,0.06)", padding: "52px 44px" }}>
              <p className="mono" style={{
                fontSize: 9, letterSpacing: "0.25em",
                color: T.red, marginBottom: 28,
              }}>DO NOT USE THIS IF</p>
              {[
                "You want customizable dashboards",
                "You enjoy tweaking metrics",
                "You need charts to feel in control",
                "You're not running a real SaaS business yet",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
                  <span style={{ color: T.ash, marginTop: 4, flexShrink: 0 }}>✗</span>
                  <p style={{ fontFamily: "'Syne'", fontSize: 17, color: T.fog, lineHeight: 1.5 }}>{t}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(242,238,231,0.03)", padding: "52px 44px" }}>
              <p className="mono" style={{
                fontSize: 9, letterSpacing: "0.25em",
                color: T.amber, marginBottom: 28,
              }}>THIS IS FOR FOUNDERS WHO</p>
              {[
                "Run a B2B SaaS with live revenue",
                "Make decisions themselves",
                "Prefer uncomfortable truth over comforting ambiguity",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
                  <span style={{ color: T.amber, marginTop: 4, flexShrink: 0 }}>✓</span>
                  <p style={{ fontFamily: "'Syne'", fontSize: 17, color: T.bone, lineHeight: 1.5 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <hr className="rule" />

      {/* ── TRUST ── */}
      <div style={{ background: T.bone, color: T.black }}>
        <div style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }} className="pad">
          <Reveal>
            <Label color={T.red}>Trust</Label>
            <p style={{
              fontFamily: "'DM Serif Display'", fontStyle: "italic",
              fontSize: "clamp(22px, 3.5vw, 40px)",
              color: T.black, lineHeight: 1.2, marginBottom: 48, maxWidth: 560,
            }}>
              The product only works if you trust it.
            </p>
            <div className="two-col-sm" style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
              gap: 1, background: "#c8c4bc",
            }}>
              {TRUST.map((t, i) => (
                <div key={i} style={{ background: T.bone, padding: "28px 32px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ color: T.red, fontWeight: 800, fontSize: 14, marginTop: 3, flexShrink: 0 }}>→</span>
                  <p style={{
                    fontFamily: "'Syne'", fontSize: 17,
                    color: i === 3 ? T.black : "#5a5652",
                    fontWeight: i === 3 ? 700 : 400,
                    lineHeight: 1.5,
                  }}>{t}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div
        id="connect"
        style={{
          padding: "128px 40px",
          textAlign: "center",
          borderTop: `1px solid ${T.line}`,
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 700,
          background: `radial-gradient(circle, rgba(192,57,43,0.05) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <Reveal>
          <p className="mono" style={{
            fontSize: 10, letterSpacing: "0.25em", color: T.red, marginBottom: 36,
          }}>THE DECISION</p>

          <h2 className="serif" style={{
            fontSize: "clamp(38px, 7vw, 84px)",
            lineHeight: 1.0, fontWeight: 400,
            maxWidth: 720, margin: "0 auto 28px",
          }}>
            Most founders don't fail suddenly.
          </h2>

          <p style={{
            fontFamily: "'DM Serif Display'", fontStyle: "italic",
            fontSize: "clamp(22px, 4vw, 48px)",
            color: T.red, lineHeight: 1.1,
            marginBottom: 60,
          }}>
            They fail by not noticing what changed.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <a href="#" className="btn-primary" style={{ fontSize: 15, padding: "22px 52px" }}>
              → Connect Stripe
            </a>
            <p className="mono" style={{ fontSize: 10, color: T.ash, letterSpacing: "0.2em" }}>
              READ-ONLY ACCESS. DISCONNECT ANYTIME.
            </p>
          </div>
        </Reveal>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: `1px solid ${T.line}`,
        padding: "28px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 16,
      }}>
        <Logo />
        <p className="mono" style={{ fontSize: 10, color: T.ash, letterSpacing: "0.18em" }}>
          REVENUE IS TRUTH.
        </p>
        <p className="mono" style={{ fontSize: 10, color: T.ash, letterSpacing: "0.12em" }}>
          © 2025 CANDOR
        </p>
      </footer>
    </>
  );
}
