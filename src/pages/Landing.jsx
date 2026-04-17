import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../components/ThemeContext";

/* ══════════════════════════════════════════════════════════
   AquaGuide AI — Landing Page
   Scroll animations: IntersectionObserver on every section
   Micro-interactions: hover, focus, ripple on buttons
══════════════════════════════════════════════════════════ */

const styles = `
  /* ── Scroll progress bar ── */
  #scroll-bar {
    position: fixed; top: 0; left: 0; height: 2px; z-index: 9999;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
    transition: width 0.1s linear;
    box-shadow: 0 0 8px var(--accent-glow);
  }

  /* ── Scroll-reveal base ── */
  .reveal {
    opacity: 0;
    transform: translateY(40px);
    transition: opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1);
  }
  .reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .reveal-left {
    opacity: 0;
    transform: translateX(-48px);
    transition: opacity 0.75s cubic-bezier(.22,1,.36,1), transform 0.75s cubic-bezier(.22,1,.36,1);
  }
  .reveal-left.visible { opacity: 1; transform: translateX(0); }

  .reveal-right {
    opacity: 0;
    transform: translateX(48px);
    transition: opacity 0.75s cubic-bezier(.22,1,.36,1), transform 0.75s cubic-bezier(.22,1,.36,1);
  }
  .reveal-right.visible { opacity: 1; transform: translateX(0); }

  .reveal-scale {
    opacity: 0;
    transform: scale(0.92);
    transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1);
  }
  .reveal-scale.visible { opacity: 1; transform: scale(1); }

  /* stagger children */
  .stagger > * { opacity: 0; transform: translateY(32px); transition: opacity 0.55s cubic-bezier(.22,1,.36,1), transform 0.55s cubic-bezier(.22,1,.36,1); }
  .stagger.visible > *:nth-child(1) { opacity:1; transform:translateY(0); transition-delay: 0s; }
  .stagger.visible > *:nth-child(2) { opacity:1; transform:translateY(0); transition-delay: 0.08s; }
  .stagger.visible > *:nth-child(3) { opacity:1; transform:translateY(0); transition-delay: 0.16s; }
  .stagger.visible > *:nth-child(4) { opacity:1; transform:translateY(0); transition-delay: 0.24s; }
  .stagger.visible > *:nth-child(5) { opacity:1; transform:translateY(0); transition-delay: 0.32s; }
  .stagger.visible > *:nth-child(6) { opacity:1; transform:translateY(0); transition-delay: 0.40s; }

  /* ── Keyframes ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ripple {
    0%   { transform: scale(0.8); opacity: 0.7; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
  }
  @keyframes blinkCursor {
    0%, 100% { opacity: 1; } 50% { opacity: 0; }
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes float-y {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-12px); }
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.07; } 50% { opacity: 0.14; }
  }
  @keyframes bar-grow {
    from { width: 0; }
  }

  /* Button ripple */
  .btn-ripple {
    position: relative; overflow: hidden;
  }
  .btn-ripple::after {
    content: '';
    position: absolute; border-radius: 50%;
    width: 0; height: 0;
    background: rgba(255,255,255,0.25);
    top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    transition: width 0.5s ease, height 0.5s ease, opacity 0.5s ease;
    opacity: 0;
  }
  .btn-ripple:active::after {
    width: 200px; height: 200px; opacity: 0;
  }

  /* Card hover shimmer */
  .card-shimmer {
    position: relative; overflow: hidden;
  }
  .card-shimmer::before {
    content: '';
    position: absolute; top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0,168,232,0.04), transparent);
    transition: left 0.6s ease;
    pointer-events: none;
  }
  .card-shimmer:hover::before { left: 140%; }

  /* Stat number count-up glow */
  .stat-val { transition: color 0.3s, text-shadow 0.3s; }
  .stat-val:hover {
    color: #fff !important;
    text-shadow: 0 0 20px var(--accent);
  }

  /* Nav frosted glass */
  .nav-active {
    background: var(--surface-glass) !important;
    backdrop-filter: blur(20px) !important;
    border-bottom: 1px solid var(--border) !important;
  }

  @media (max-width: 768px) {
    .hero-h1 { font-size: var(--fluid-h1) !important; }
    .hero-p { font-size: 16px !important; }
    .nav-desktop { display: none !important; }
    .landing-nav { padding: 12px 20px !important; }
  }
`;

/* ── useInView hook ── */
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.12, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

/* ── Animated counter ── */
function CountUp({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const dur = 1200;
    const step = 16;
    const inc  = to / (dur / step);
    const t = setInterval(() => {
      start += inc;
      if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(Math.floor(start));
    }, step);
    return () => clearInterval(t);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function Landing() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  /* ── Scroll progress bar ── */
  const [scrollPct, setScrollPct] = useState(0);

  /* ── Nav frosted glass ── */
  const [scrolled, setScrolled] = useState(false);

  /* ── Hero parallax offset ── */
  const [parallaxY, setParallaxY] = useState(0);

  /* ── Mobile Menu State ── */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const pct = (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100;
      setScrollPct(pct);
      setScrolled(window.scrollY > 40);
      setParallaxY(window.scrollY * 0.25);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Scroll reveal observer ── */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* ── Typewriter ── */
  const typeTexts = [
    "Show over-exploited blocks in Rajasthan",
    "Groundwater trend in Pune 2018–2023",
    "Which districts in Gujarat are critical?",
    "Summarize Maharashtra's water status",
    "Safe zones in Tamil Nadu this year",
  ];
  const [twIdx, setTwIdx]             = useState(0);
  const [twDisplayed, setTwDisplayed] = useState("");
  const [twDeleting, setTwDeleting]   = useState(false);
  useEffect(() => {
    const full  = typeTexts[twIdx];
    const delay = twDeleting ? 36 : 65;
    const t = setTimeout(() => {
      if (!twDeleting && twDisplayed.length < full.length) {
        setTwDisplayed(full.slice(0, twDisplayed.length + 1));
      } else if (!twDeleting && twDisplayed.length === full.length) {
        setTimeout(() => setTwDeleting(true), 1800);
      } else if (twDeleting && twDisplayed.length > 0) {
        setTwDisplayed(twDisplayed.slice(0, -1));
      } else {
        setTwDeleting(false);
        setTwIdx((twIdx + 1) % typeTexts.length);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [twDisplayed, twDeleting, twIdx]);

  /* ── Particle canvas ── */
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      alpha: Math.random() * 0.45 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,168,232,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,168,232,${0.06 * (1 - d / 100)})`;
            ctx.lineWidth   = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  /* ── Hero ref ── */
  const heroRef = useRef(null);

  /* ── Map hover state ── */
  const [hoveredState, setHoveredState] = useState(null);

  /* ── Shared data ── */
  const statusColors = { safe: "var(--accent)", semi: "#f0dc3a", critical: "#f5a623", over: "#e84040" };
  const statusLabels = { safe: "Safe", semi: "Semi-Critical", critical: "Critical", over: "Over-Exploited" };

  const chatMessages = [
    { role: "user", text: "Which districts in Maharashtra have over-exploited groundwater?" },
    { role: "ai",   text: "Found 23 over-exploited districts in Maharashtra. The most critical are Nashik, Aurangabad, and Pune — showing extraction rates 140–180% above sustainable limits.", data: true },
    { role: "user", text: "Show me the trend for Pune from 2018 to 2023" },
    { role: "ai",   text: "Pune's stage of extraction rose from 112% (2018) to 164% (2023), a 46% increase over 5 years. Rabi season irrigation accounts for ~68% of extraction.", chart: true },
  ];

  const mapStates = [
    { name: "Punjab",      status: "over",     x: "28%", y: "18%" },
    { name: "Rajasthan",   status: "critical",  x: "22%", y: "34%" },
    { name: "Gujarat",     status: "semi",      x: "16%", y: "46%" },
    { name: "MP",          status: "safe",      x: "38%", y: "42%" },
    { name: "Maharashtra", status: "critical",  x: "34%", y: "55%" },
    { name: "Karnataka",   status: "semi",      x: "36%", y: "68%" },
    { name: "Tamil Nadu",  status: "safe",      x: "42%", y: "78%" },
    { name: "UP",          status: "over",      x: "46%", y: "28%" },
    { name: "Bihar",       status: "semi",      x: "56%", y: "34%" },
    { name: "West Bengal", status: "safe",      x: "65%", y: "40%" },
    { name: "Odisha",      status: "safe",      x: "58%", y: "52%" },
    { name: "Telangana",   status: "critical",  x: "46%", y: "62%" },
  ];

  const features = [
    { icon: "🧠", title: "Natural Language Queries",  desc: "Type questions exactly as you'd ask a human expert. No SQL, no filters — just plain English." },
    { icon: "🗺️", title: "Interactive Map",            desc: "Color-coded India map with block-level drilling. Green to red — know your region at a glance." },
    { icon: "📊", title: "Trend Analysis",             desc: "Year-over-year extraction charts from 2008 to 2023. Spot the trajectory before it's a crisis." },
    { icon: "📄", title: "Export Reports",             desc: "Download AI-generated summaries as PDF or CSV for presentations and policy briefs." },
    { icon: "🔔", title: "Multi-language",             desc: "Query in English, Hindi, or Marathi via Google Translate API. Accessible to every stakeholder." },
    { icon: "🔒", title: "Secure & User-Scoped",       desc: "JWT authentication with private chat history. Your reports, your data — fully isolated." },
  ];

  const tickerItems  = ["Safe","Semi-Critical","Critical","Over-Exploited","Maharashtra","Rajasthan","Gujarat","Tamil Nadu","Punjab","Uttar Pradesh","Extraction Data","Recharge Rates","Block-Level Analysis","AI-Powered Queries"];
  const tickerColors = { "Safe":"var(--accent)","Semi-Critical":"#f0dc3a","Critical":"#f5a623","Over-Exploited":"#e84040" };

  /* ── Animated progress bars ── */
  const [statsRef, statsInView] = useInView();

  return (
    <>
      <style>{styles}</style>

      {/* ── Scroll progress bar ── */}
      <div id="scroll-bar" style={{ width: `${scrollPct}%` }} />

      {/* ════════════════════════════════════
          NAV
      ════════════════════════════════════ */}
      {/* ════════════════════════════════════
          NAV
      ════════════════════════════════════ */}
      <nav className={`landing-nav ${scrolled ? 'nav-active' : ''}`} style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 56px",
        transition: "all 0.4s cubic-bezier(.22,1,.36,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent2), var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--btn-text)", fontSize: 15,
            boxShadow: "0 0 18px var(--accent-glow)",
            transition: "transform 0.3s, box-shadow 0.3s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "rotate(8deg) scale(1.1)"; e.currentTarget.style.boxShadow = "0 0 28px var(--accent-glow)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 18px var(--accent-glow)"; }}
          ><img src="/ingres.svg" alt="" /></div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "0.03em" }}>
            AquaGuide <span style={{ color: "var(--accent)", fontStyle: "italic" }}>AI</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className="nav-desktop" style={{ display: "flex", gap: 36, fontSize: 14, fontWeight: 500 }}>
          {["Features","Data","Map","About"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="nav-link">{l}</a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="resp-hide-mobile"><ThemeToggle /></div>
          <button className="btn-ripple resp-hide-mobile" style={{
            padding: "9px 22px", borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text)", fontSize: 14, fontWeight: 500,
            cursor: "pointer", transition: "all 0.25s", fontFamily: "var(--font-body)",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "transparent"; }}
            onClick={() => navigate('/login')}
          >Login</button>
          
          <button className="btn-ripple resp-hide-mobile" style={{
            padding: "9px 22px", borderRadius: 8, border: "none",
            background: "var(--accent)", color: "var(--btn-text)", fontSize: 14, fontWeight: 600,
            cursor: "pointer", transition: "all 0.25s", fontFamily: "var(--font-body)",
            boxShadow: "0 0 20px var(--accent-glow)",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 30px var(--accent-glow)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 20px var(--accent-glow)"; }}
            onClick={() => navigate('/register')}
          >Get Started</button>

          {/* Mobile Hamburger */}
          <button 
            className="hamburger-btn" 
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            style={{ position: 'relative', top: 0, left: 0, display: window.innerWidth <= 768 ? 'flex' : 'none' }}
          >
            {mobileNavOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Nav Overlay */}
        <div style={{
          position: "fixed", top: 0, left: mobileNavOpen ? 0 : "100%", width: "100%", height: "100vh",
          background: "var(--bg)", zIndex: 999, transition: "left 0.4s ease",
          padding: "100px 32px", display: "flex", flexDirection: "column", gap: 24
        }}>
          {["Features","Data","Map","About"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMobileNavOpen(false)} style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>{l}</a>
          ))}
          <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             <button className="resp-full-btn" style={{ padding: "14px", borderRadius: 10, background: "var(--accent)", color: "var(--btn-text)", border: "none", fontWeight: 700 }} onClick={() => navigate('/login')}>Login</button>
             <button className="resp-full-btn" style={{ padding: "14px", borderRadius: 10, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", fontWeight: 700 }} onClick={() => navigate('/register')}>Register</button>
             <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}><ThemeToggle /></div>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════
          HERO
      ════════════════════════════════════ */}
      <section ref={heroRef} className="resp-pad-section" style={{
        position: "relative", minHeight: "100vh",
        display: "flex", alignItems: "center",
        padding: "120px 56px 80px",
        overflow: "hidden",
      }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />



        {/* Parallax glow blobs */}
        <div style={{
          position: "absolute", top: `calc(20% - ${parallaxY * 0.3}px)`, right: "10%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,168,232,0.07) 0%, transparent 70%)",
          pointerEvents: "none", transition: "top 0.05s linear",
          animation: "glow-pulse 4s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: `calc(10% + ${parallaxY * 0.15}px)`, left: "5%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,120,212,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Orbiting ring */}
        <div style={{
          position: "absolute", top: "50%", right: "8%", width: 340, height: 340, borderRadius: "50%",
          border: "1px solid rgba(0,168,232,0.08)", transform: "translateY(-50%)",
          animation: "spin-slow 40s linear infinite", pointerEvents: "none",
        }}>
          <div style={{ position: "absolute", top: -1, left: "40%", width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 12px var(--accent)" }} />
        </div>
        <div style={{ position: "absolute", top: "50%", right: "8%", width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(0,168,232,0.05)", transform: "translateY(-50%)", pointerEvents: "none", animation: "spin-slow 28s linear infinite reverse" }} />

        {/* Hero content — staggered fade-up on mount */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700 }}>
          <div style={{ animation: "fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.1s both" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 14px", borderRadius: 20,
              background: "var(--accent-dim)", border: "1px solid rgba(0,168,232,0.25)",
              fontSize: 12, fontWeight: 600, color: "var(--accent)",
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 28,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "pulse-dot 1.5s infinite" }} />
              Ministry of Jal Shakti · CGWB × IIT Hyderabad
            </span>
          </div>

          <h1 className="hero-h1" style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "var(--fluid-h1)", lineHeight: 1.1, marginBottom: 24, animation: "fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.22s both" }}>
            India's Groundwater<br />
            <span style={{ color: "var(--accent)", fontStyle: "italic" }}>Intelligence</span> Layer
          </h1>

          <p style={{ fontSize: 18, color: "var(--muted)", lineHeight: 1.7, maxWidth: 520, marginBottom: 24, animation: "fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.34s both", fontWeight: 300 }}>
            Ask AquaGuide AI anything about India's groundwater — block-level extraction rates, critical zones, aquifer trends — in plain English.
          </p>

          {/* Typewriter */}
          <div style={{ marginBottom: 40, animation: "fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.42s both", background: "var(--accent-dim)", border: "1px solid rgba(0,168,232,0.18)", borderRadius: 10, padding: "12px 16px", display: "inline-block" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)" }}>
              <span style={{ color: "var(--muted)", marginRight: 8 }}>›</span>
              {twDisplayed}
              <span style={{ animation: "blinkCursor 1s step-end infinite", color: "var(--accent)" }}>|</span>
            </span>
          </div>

          {/* CTA row */}
          <div className="resp-stack-mobile" style={{ display: "flex", gap: 14, animation: "fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.52s both" }}>
            <button className="btn-ripple resp-full-btn" style={{
              padding: "14px 32px", borderRadius: 10, border: "none",
              background: "var(--accent)", color: "var(--btn-text)", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "var(--font-body)",
              boxShadow: "0 0 28px var(--accent-glow)", transition: "all 0.3s cubic-bezier(.22,1,.36,1)",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 8px 40px var(--accent-glow)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 28px var(--accent-glow)"; }}
              onClick={() => navigate('/chatbot')}
            >Launch Chatbot →</button>
            <button className="btn-ripple resp-full-btn" style={{
              padding: "14px 32px", borderRadius: 10,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text)", fontSize: 15, fontWeight: 500,
              cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.3s cubic-bezier(.22,1,.36,1)",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = ""; }}
              onClick={() => navigate('/dashboard')}
            >Explore Data</button>
          </div>

          {/* Stats */}
          <div className="resp-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, marginTop: 56, animation: "fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.64s both" }}>
            {[["713", "+", "Districts"], ["36", "", "States & UTs"], ["", "Real-time", "AI Queries"], ["", "CGWB", "Verified Data"]].map(([num, suffix, label], i) => (
              <div key={label} style={{ cursor: "default" }}>
                <div className="stat-val" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "var(--accent)" }}>
                  {num ? <CountUp to={parseInt(num)} suffix={suffix} /> : suffix}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, letterSpacing: "0.04em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          TICKER
      ════════════════════════════════════ */}
      <div style={{ overflow: "hidden", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "13px 0", background: "var(--bg2)" }}>
        <div style={{ display: "flex", gap: 48, animation: "marquee 22s linear infinite", width: "max-content" }}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", color: tickerColors[item] || "var(--muted)", letterSpacing: "0.04em", fontFamily: "var(--font-mono)", transition: "opacity 0.2s", cursor: "default" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.5"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {tickerColors[item] ? "◆ " : "· "}{item}
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════
          CHAT PREVIEW
      ════════════════════════════════════ */}
      <section id="features" className="resp-pad-section" style={{ padding: "100px 56px", background: "var(--bg2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="resp-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

            {/* Left copy — slide in from left */}
            <div className="reveal-left">
              <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>AI Chatbot</span>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, lineHeight: 1.15, margin: "14px 0 20px" }}>
                Ask in plain English.<br /><em style={{ color: "var(--accent)" }}>Get expert answers.</em>
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.7, marginBottom: 32, fontWeight: 300 }}>
                AquaGuide AI converts natural language questions into precise groundwater database queries — returning structured data, visualizations, and CGWB-backed insights instantly.
              </p>
              <div className="stagger">
                {[
                  ["Natural Language",       "Ask in English, Hindi, or Marathi"],
                  ["Structured Responses",   "Tables, charts, and map highlights"],
                  ["Conversational Context", "Follow-up questions remember history"],
                  ["Data Verified",          "Sourced from CGWB annual assessments"],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-dim)", border: "1px solid rgba(0,168,232,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, transition: "background 0.3s, transform 0.3s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,168,232,0.2)"; e.currentTarget.style.transform = "scale(1.15)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--accent-dim)"; e.currentTarget.style.transform = ""; }}
                    >
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat UI — slide in from right */}
            <div className="reveal-right" style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", transition: "box-shadow 0.4s, transform 0.4s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 32px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,168,232,0.1)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 24px 80px rgba(0,0,0,0.4)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, background: "rgba(0,168,232,0.03)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="var(--bg)"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>AquaGuide AI Assistant</div>
                  <div style={{ fontSize: 11, color: "var(--accent)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", animation: "pulse-dot 1.5s infinite", display: "inline-block" }} />
                    Online · CGWB Data Connected
                  </div>
                </div>
              </div>
              <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 14 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: `fadeUp 0.4s ease ${i * 0.12}s both` }}>
                    <div style={{
                      maxWidth: "82%", padding: "10px 14px",
                      borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: m.role === "user" ? "var(--accent)" : "rgba(255,255,255,0.04)",
                      border: m.role === "ai" ? "1px solid var(--border)" : "none",
                      color: m.role === "user" ? "var(--bg)" : "var(--text)",
                      fontSize: 13, lineHeight: 1.55, fontWeight: m.role === "user" ? 500 : 400,
                      transition: "transform 0.2s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.01)"}
                      onMouseLeave={e => e.currentTarget.style.transform = ""}
                    >
                      {m.text}
                      {m.data && (
                        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                          {[["Safe","var(--accent)","12"],["Semi-Crit.","#f0dc3a","8"],["Critical","#f5a623","3"],["Over-Exp.","#e84040","23"]].map(([l, c, n]) => (
                            <div key={l} style={{ flex: 1, background: `${c}16`, border: `1px solid ${c}33`, borderRadius: 6, padding: "5px 4px", textAlign: "center", transition: "background 0.2s, transform 0.2s", cursor: "default" }}
                              onMouseEnter={e => { e.currentTarget.style.background = `${c}28`; e.currentTarget.style.transform = "scale(1.06)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = `${c}16`; e.currentTarget.style.transform = ""; }}
                            >
                              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{n}</div>
                              <div style={{ fontSize: 9, color: c, opacity: 0.8 }}>{l}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {m.chart && (
                        <div style={{ marginTop: 16, background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 8px", display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
                          {[112,118,128,145,158,164].map((v, i) => (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                              <div style={{ width: "100%", height: `${(v - 100) * 1.5}px`, background: v > 150 ? "#e84040" : v > 130 ? "#f5a623" : "var(--accent)", borderRadius: "3px 3px 0 0", opacity: 0.85, animation: `bar-grow 0.8s cubic-bezier(.22,1,.36,1) ${i * 0.1}s both`, transition: "opacity 0.2s", cursor: "default" }}
                                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                onMouseLeave={e => e.currentTarget.style.opacity = "0.85"}
                              />
                              <div style={{ fontSize: 8, color: "var(--muted)" }}>{2018 + i}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 5, padding: "8px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
                  {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: `pulse-dot 1.2s ${d}s infinite` }} />)}
                </div>
              </div>
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: "var(--muted)", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,168,232,0.3)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >Ask about groundwater in any district…</div>
                <button style={{ width: 36, height: 36, borderRadius: 9, background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 0 14px var(--accent-glow)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          MAP
      ════════════════════════════════════ */}
      <section id="map" className="resp-pad-section" style={{ padding: "100px 56px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>Map Visualization</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, margin: "12px 0 16px" }}>
              India's Aquifer Status, <em style={{ color: "var(--accent)" }}>Visualized</em>
            </h2>
            <p style={{ color: "var(--muted)", maxWidth: 480, margin: "0 auto", fontWeight: 300, fontSize: 15 }}>
              Block-level color coding across all 7,000+ assessment units. Drill down from national overview to district-level extraction data.
            </p>
          </div>

          <div className="resp-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 40, alignItems: "start" }}>
            <div className="reveal-left" style={{ position: "relative", background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", height: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.35)", transition: "box-shadow 0.4s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,168,232,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.35)"}
            >
              {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${i * 20}%`, height: 1, background: "rgba(255,255,255,0.03)" }} />)}
              {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${i * 14.28}%`, width: 1, background: "rgba(255,255,255,0.03)" }} />)}
              <div style={{ position: "absolute", left: "10%", right: "15%", top: "10%", bottom: "10%", background: "linear-gradient(135deg, rgba(0,168,232,0.04), rgba(0,100,60,0.06))", borderRadius: "40% 30% 50% 35%", border: "1px solid rgba(0,168,232,0.1)" }} />

              {mapStates.map(s => (
                <div key={s.name} style={{ position: "absolute", left: s.x, top: s.y, transform: "translate(-50%,-50%)", zIndex: 2 }}
                  onMouseEnter={() => setHoveredState(s.name)}
                  onMouseLeave={() => setHoveredState(null)}
                >
                  <div style={{
                    width: hoveredState === s.name ? 16 : 12,
                    height: hoveredState === s.name ? 16 : 12,
                    borderRadius: "50%",
                    background: statusColors[s.status],
                    boxShadow: hoveredState === s.name ? `0 0 22px ${statusColors[s.status]}cc` : `0 0 14px ${statusColors[s.status]}88`,
                    animation: "pulse-dot 2s infinite",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }} />
                  <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: `1px solid ${statusColors[s.status]}44`, animation: "ripple 2s infinite" }} />
                  <div style={{
                    position: "absolute", top: -26, left: "50%",
                    fontSize: 9, fontWeight: 600, color: statusColors[s.status],
                    whiteSpace: "nowrap", fontFamily: "var(--font-mono)",
                    background: "rgba(3,16,13,0.9)", padding: "3px 6px", borderRadius: 4,
                    opacity: hoveredState === s.name ? 1 : 0.7,
                    transition: "opacity 0.2s, transform 0.2s",
                    transform: hoveredState === s.name ? "translateX(-50%) translateY(-2px)" : "translateX(-50%)",
                  }}>{s.name}</div>
                  {/* Tooltip on hover */}
                  {hoveredState === s.name && (
                    <div style={{
                      position: "absolute", top: -58, left: "50%", transform: "translateX(-50%)",
                      background: "var(--surface)", border: `1px solid ${statusColors[s.status]}55`,
                      borderRadius: 8, padding: "6px 10px", whiteSpace: "nowrap", zIndex: 10,
                      fontSize: 10, color: "var(--text)",
                      boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
                      animation: "fadeUp 0.15s ease both",
                    }}>
                      <span style={{ color: statusColors[s.status], fontWeight: 700 }}>{statusLabels[s.status]}</span>
                    </div>
                  )}
                </div>
              ))}

              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(statusColors).map(([k, c]) => (
                  <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 500, color: c, fontFamily: "var(--font-mono)", transition: "opacity 0.2s", cursor: "default" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />{statusLabels[k]}
                  </span>
                ))}
              </div>
              <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,168,232,0.12)", border: "1px solid rgba(0,168,232,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                LIVE · 2023 Data
              </div>
            </div>

            {/* Stats panel */}
            <div className="reveal-right" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div ref={statsRef} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 16, letterSpacing: "0.06em" }}>NATIONAL SUMMARY · 2023</div>
                {[
                  { label: "Safe",           color: "safe",     pct: 69, count: "4,838 blocks" },
                  { label: "Semi-Critical",  color: "semi",     pct: 12, count: "840 blocks"   },
                  { label: "Critical",       color: "critical", pct: 7,  count: "490 blocks"   },
                  { label: "Over-Exploited", color: "over",     pct: 12, count: "840 blocks"   },
                ].map(r => (
                  <div key={r.label} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span style={{ fontWeight: 500 }}>{r.label}</span>
                      <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{r.count}</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: statsInView ? `${r.pct}%` : "0%",
                        background: statusColors[r.color],
                        borderRadius: 3,
                        transition: "width 1.2s cubic-bezier(.22,1,.36,1)",
                        boxShadow: `0 0 8px ${statusColors[r.color]}66`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 14, letterSpacing: "0.06em" }}>QUERY THE MAP</div>
                {["Show all over-exploited zones","Gujarat groundwater status","Trend: 2015 to 2023"].map((q, i) => (
                  <div key={q} style={{ padding: "9px 12px", marginBottom: 8, background: "rgba(0,168,232,0.04)", border: "1px solid rgba(0,168,232,0.12)", borderRadius: 8, fontSize: 12, color: "var(--muted)", cursor: "pointer", transition: "all 0.25s cubic-bezier(.22,1,.36,1)", fontFamily: "var(--font-mono)", animation: `fadeUp 0.4s ease ${i * 0.1}s both` }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(0,168,232,0.35)"; e.currentTarget.style.background = "rgba(0,168,232,0.08)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "rgba(0,168,232,0.12)"; e.currentTarget.style.background = "rgba(0,168,232,0.04)"; e.currentTarget.style.transform = ""; }}
                  >{q} →</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          FEATURES GRID
      ════════════════════════════════════ */}
      <section id="data" style={{ padding: "100px 56px", background: "var(--bg2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>Capabilities</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, margin: "12px 0" }}>
              Built for <em style={{ color: "var(--accent)" }}>Groundwater Experts</em>
            </h2>
          </div>
          <div className="resp-grid-3 stagger" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {features.map((f, i) => (
              <div key={i} className="card-shimmer" style={{ padding: "28px 26px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", transition: "all 0.35s cubic-bezier(.22,1,.36,1)", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,168,232,0.35)"; e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 50px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,168,232,0.06)"; e.currentTarget.style.background = "var(--surface-hover)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "var(--surface)"; }}
              >
                <div style={{ fontSize: 32, marginBottom: 16, display: "inline-block", transition: "transform 0.3s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2) rotate(-5deg)"}
                  onMouseLeave={e => e.currentTarget.style.transform = ""}
                >{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          CTA
      ════════════════════════════════════ */}
      <section style={{ padding: "100px 56px", background: "var(--bg)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,168,232,0.06) 0%, transparent 65%)", pointerEvents: "none", animation: "glow-pulse 5s ease-in-out infinite" }} />
        <div className="reveal-scale" style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            India's water future starts with<br /><em style={{ color: "var(--accent)" }}>better questions.</em>
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.7, marginBottom: 40, fontWeight: 300 }}>
            Ask AquaGuide AI anything about groundwater across India's 7,000+ blocks. Built for researchers, policymakers, and citizens.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button className="btn-ripple" style={{ padding: "15px 38px", borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--btn-text)", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", boxShadow: "0 0 40px var(--accent-glow)", transition: "all 0.3s cubic-bezier(.22,1,.36,1)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 50px var(--accent-glow)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 40px var(--accent-glow)"; }}
            >Start for Free →</button>
            <button className="btn-ripple" style={{ padding: "15px 38px", borderRadius: 12, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.3s cubic-bezier(.22,1,.36,1)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = ""; }}
            >View Documentation</button>
          </div>
          <div className="stagger" style={{ marginTop: 40, display: "flex", justifyContent: "center", gap: 32 }}>
            {["Ministry of Jal Shakti","CGWB","IIT Hyderabad"].map(org => (
              <span key={org} style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", transition: "color 0.2s", cursor: "default" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
              >{org}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────── */}
      <footer className="resp-footer" style={{ padding: "36px 56px", borderTop: "1px solid var(--border)", background: "var(--bg2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--btn-text)", fontSize: 11, transition: "transform 0.3s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "rotate(10deg) scale(1.1)"}
            onMouseLeave={e => e.currentTarget.style.transform = ""}
          >IN</div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>AquaGuide AI</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          © 2024 Central Ground Water Board · Ministry of Jal Shakti · Smart India Hackathon #25066
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--muted)" }}>
          {[["INGRES Portal","https://ingres.iith.ac.in/home"],["Privacy","#"],["Contact","#"]].map(([label, href]) => (
            <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s", position: "relative" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
            >{label}</a>
          ))}
        </div>
      </footer>
    </>
  );
}