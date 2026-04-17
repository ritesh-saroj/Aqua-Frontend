import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import { getTopCriticalStates } from "../utils/recommendations";
import { exportToCSV, exportToExcel, exportToPDF } from "../utils/exportUtils";

/* ══════════════════════════════════════════════════════════
   AquaGuide AI – Dashboard (Upgraded v2)
   ─ Recommendations card with top critical states
   ─ Export national summary data (CSV / Excel / PDF)
   ─ Data sources card with reference links
   ══════════════════════════════════════════════════════════ */

const css = `
.stat-card:hover{border-color:rgba(0,168,232,0.3)!important;transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,0.3)!important;}
.quick-action:hover{border-color:rgba(0,168,232,0.35)!important;background:var(--surface-hover)!important;transform:translateY(-4px);}
.chat-chip:hover{border-color:rgba(0,168,232,0.35)!important;color:var(--accent)!important;background:var(--accent-dim)!important;transform:translateX(4px);}
.rec-card:hover{border-color:rgba(0,168,232,0.3)!important;transform:translateY(-2px);}
.export-dash-btn:hover{background:var(--accent-dim)!important;border-color:var(--accent)!important;color:var(--accent)!important;}
.source-link{color:var(--accent);text-decoration:none;font-size:13px;transition:all 0.2s;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;border:1px solid rgba(0,168,232,0.1);background:rgba(0,168,232,0.03);}
.source-link:hover{background:var(--accent-dim);border-color:rgba(0,168,232,0.3);transform:translateX(4px);}
`;

const statusColors = { safe: "var(--accent)", semi: "#f0dc3a", critical: "#f5a623", over: "#e84040" };

const DATA_SOURCES = [
  { name: "INGRES Platform", url: "https://ingres.iith.ac.in/home", desc: "GIS-based groundwater estimation system by IIT Hyderabad", icon: "🌐" },
  { name: "CGWB Official", url: "https://cgwb.gov.in/", desc: "Central Ground Water Board — Ministry of Jal Shakti", icon: "🏛️" },
  { name: "India-WRIS", url: "https://indiawris.gov.in/wris/#/", desc: "Water Resources Information System of India", icon: "💧" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [greeting, setGreeting] = useState("Good morning");
  const [hoveredBar, setHoveredBar] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    const u = onAuthStateChanged(auth, u => { if (!u) navigate("/login"); else setUser(u); });

    fetch('/summaryData.json')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(console.error);

    return u;
  }, []);

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  /* ─── Export Handlers ──────────────────────────────── */
  const getExportData = () => {
    if (!data) return [];
    return Object.entries(data.stateStats).map(([state, stats]) => ({
      State: state,
      "Total Blocks": stats.total,
      Safe: stats.safe,
      "Semi-Critical": stats.semi,
      Critical: stats.critical,
      "Over-Exploited": stats.over,
      "Over-Exploited %": stats.total > 0 ? Math.round((stats.over / stats.total) * 100) + "%" : "0%",
    }));
  };

  const handleExport = (format) => {
    setShowExportMenu(false);
    const rows = getExportData();
    const fn = `aquaguide_national_summary_${Date.now()}`;
    if (format === "csv") exportToCSV(rows, fn + ".csv");
    else if (format === "excel") exportToExcel(rows, fn + ".xlsx", "National Summary");
    else if (format === "pdf") exportToPDF(rows, "National Groundwater Summary — FY 2024-25", fn + ".pdf");
  };

  /* ─── Derived Data ─────────────────────────────────── */
  const stats = data ? [
    { label: "Total Blocks", value: data.national.totalDistricts.toLocaleString(), sub: "Assessed nationally", color: "var(--accent)", icon: "🔷" },
    { label: "Over-Exploited", value: data.national.overExploited.toLocaleString(), sub: "Need urgent action", color: "#e84040", icon: "🔴" },
    { label: "Critical Zones", value: data.national.critical.toLocaleString(), sub: "Under stress", color: "#f5a623", icon: "🟠" },
    { label: "Safe Blocks", value: data.national.safe.toLocaleString(), sub: "Within limits", color: "var(--accent)", icon: "🟢" },
  ] : [];

  const quickActions = [
    { icon: "💬", label: "Ask AI", desc: "Query groundwater data", path: "/chatbot", accent: "var(--accent)" },
    { icon: "🗺️", label: "View Map", desc: "India block-level map", path: "/maps", accent: "#f0dc3a" },
    { icon: "📊", label: "Explore Data", desc: "Filter by state/district", path: "/chatbot", accent: "#f5a623" },
    { icon: "📜", label: "Chat History", desc: "View past sessions", path: "/history", accent: "#60a5fa" },
  ];

  const nationalData = data ? [
    { label: "Safe", pct: Math.round(data.national.safe / data.national.totalDistricts * 100), count: data.national.safe.toLocaleString(), color: "var(--accent)" },
    { label: "Semi-Critical", pct: Math.round(data.national.semiCritical / data.national.totalDistricts * 100), count: data.national.semiCritical.toLocaleString(), color: "#f0dc3a" },
    { label: "Critical", pct: Math.round(data.national.critical / data.national.totalDistricts * 100), count: data.national.critical.toLocaleString(), color: "#f5a623" },
    { label: "Over-Exploited", pct: Math.round(data.national.overExploited / data.national.totalDistricts * 100), count: data.national.overExploited.toLocaleString(), color: "#e84040" },
  ] : [];

  const trendData = [78, 74, 71, 68, 65, 64, 63, 62, 64, 67, 68, 68];
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  // Get top critical states for recommendations
  const criticalStates = data ? getTopCriticalStates(data.stateStats, 5) : [];

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)", transition: "background 0.35s" }}>

        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main className="resp-pad-section" style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
          {!data ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Loading FY 2024-25 Data...</div>
            </div>
          ) : (
            <>

              {/* Header */}
              <div className="resp-flex-col" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, animation: "fadeUp 0.5s ease both", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", marginRight: 6, animation: "pulse-dot 1.5s infinite" }} />
                    FY 2024-25 DATA CONNECTED · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--fluid-h2)", fontWeight: 900, lineHeight: 1.15 }}>
                    {greeting},{" "}
                    <em style={{ color: "var(--accent)" }}>{user?.displayName?.split(" ")[0] || "Explorer"}</em>
                  </h1>
                  <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4, fontWeight: 300 }}>India groundwater intelligence — ask anything.</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", width: window.innerWidth <= 768 ? '100%' : 'auto' }}>
                  {/* Export Button */}
                  <div style={{ position: "relative", flex: 1 }}>
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="export-dash-btn resp-full-btn"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: 'center', gap: 6, padding: "10px 18px",
                        background: "transparent", border: "1px solid var(--border)", borderRadius: 10,
                        color: "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        fontFamily: "var(--font-body)", transition: "all 0.25s", width: '100%'
                      }}
                    >
                      ⬇ Export
                    </button>
                    {showExportMenu && (
                      <div style={{
                        position: "absolute", right: 0, top: "100%", marginTop: 4,
                        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                        padding: 6, minWidth: 150, zIndex: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                        animation: "fadeUp 0.15s ease both"
                      }}>
                        {[["📄", "CSV", "csv"], ["📊", "Excel", "excel"], ["📕", "PDF", "pdf"]].map(([icon, label, fmt]) => (
                          <div key={fmt} onClick={() => handleExport(fmt)} style={{
                            padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "var(--text)",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                            transition: "all 0.15s", fontFamily: "var(--font-body)"
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--accent-dim)"; e.currentTarget.style.color = "var(--accent)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text)"; }}
                          >
                            {icon} {label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="resp-full-btn" onClick={() => navigate("/chatbot")} style={{ display: "flex", alignItems: "center", justifyContent: 'center', gap: 8, padding: "12px 24px", background: "var(--accent)", border: "none", borderRadius: 10, color: "var(--btn-text)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", boxShadow: "0 0 24px rgba(0,168,232,0.3)", transition: "all 0.25s", animation: "fadeUp 0.5s ease 0.1s both", flex: 1.5 }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,168,232,0.35)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 24px rgba(0,168,232,0.3)"; }}>
                    💬 Ask AI
                  </button>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="resp-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
                {stats.map((s, i) => (
                  <div key={s.label} className="stat-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px", transition: "all 0.3s", cursor: "default", animation: `fadeUp 0.5s ease ${i * 0.08}s both` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
                      <div style={{ fontSize: 18 }}>{s.icon}</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Main grid */}
              <div className="resp-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>

                {/* Quick actions */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", animation: "fadeUp 0.5s ease 0.2s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Quick Actions</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>What would you like to do?</div>
                    </div>
                  </div>
                  <div className="dash-actions" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                    {quickActions.map((a, i) => (
                      <div key={a.label} className="quick-action" onClick={() => navigate(a.path)} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", transition: "all 0.3s", animation: `fadeUp 0.5s ease ${0.3 + i * 0.05}s both` }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>{a.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{a.label}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* National Summary */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", animation: "fadeUp 0.5s ease 0.25s both" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>National Summary</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>India · FY 2024-25</div>
                  {nationalData.map((r, i) => (
                    <div key={r.label} style={{ marginBottom: 16, animation: `fadeUp 0.5s ease ${0.35 + i * 0.07}s both` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                        <span style={{ fontWeight: 500, color: "var(--text)" }}>{r.label}</span>
                        <span style={{ color: r.color, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{r.count}</span>
                      </div>
                      <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.pct}%`, background: r.color, borderRadius: 3, animation: `bar-grow 1.2s cubic-bezier(.22,1,.36,1) ${0.5 + i * 0.1}s both`, boxShadow: `0 0 8px ${r.color}55` }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 20, padding: "10px 12px", background: "rgba(0,168,232,0.06)", border: "1px solid rgba(0,168,232,0.15)", borderRadius: 8, fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                    Source: CGWB FY 2024-25 Assessment
                  </div>
                </div>
              </div>

              {/* Recommendations + Trend Row */}
              <div className="resp-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

                {/* 🆕 Recommendations Card */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", animation: "fadeUp 0.5s ease 0.3s both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>💡 AI Recommendations</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>Priority Action Areas</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {criticalStates.map((item, i) => (
                      <div
                        key={item.state}
                        className="rec-card"
                        onClick={() => navigate("/chatbot")}
                        style={{
                          padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                          border: `1px solid ${item.rec.color}22`,
                          background: `${item.rec.color}08`,
                          transition: "all 0.25s",
                          animation: `fadeUp 0.4s ease ${0.35 + i * 0.06}s both`
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{item.rec.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{item.state}</span>
                          </div>
                          <span style={{
                            fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
                            color: item.rec.color, padding: "2px 8px", borderRadius: 4,
                            background: `${item.rec.color}15`, border: `1px solid ${item.rec.color}30`
                          }}>
                            {item.category}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                          {item.rec.title} — {item.overCount} over-exploited, {item.criticalCount} critical out of {item.totalCount} blocks
                        </div>
                        <div style={{ fontSize: 11, color: item.rec.color, marginTop: 6, fontFamily: "var(--font-mono)" }}>
                          → {item.rec.actions[0]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trend chart */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", animation: "fadeUp 0.5s ease 0.35s both", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Trend Analysis</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Safe Blocks % · 2024</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>Monthly distribution across India</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 8, flex: 1, minHeight: 180, alignItems: "end", position: "relative", marginBottom: 12 }}>
                    {trendData.map((v, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 8, position: "relative" }}>
                        <div style={{ width: "100%", height: `${v}%`, background: v >= 70 ? "var(--accent)" : v >= 65 ? "#f0dc3a" : "#f5a623", borderRadius: "4px 4px 0 0", opacity: 0.85, animation: `bar-grow 0.8s cubic-bezier(.22,1,.36,1) ${i * 0.05}s both`, transition: "all 0.2s", cursor: "pointer" }}
                          onMouseEnter={() => setHoveredBar(i)}
                          onMouseLeave={() => setHoveredBar(null)}
                        />
                        {hoveredBar === i && (
                          <div style={{ position: "absolute", bottom: `calc(${v}% + 28px)`, left: "50%", transform: "translateX(-50%)", background: "var(--bg2)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 6, color: "var(--text)", fontSize: 11, fontWeight: 600, zIndex: 10, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                            {months[i]}: {v}%
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{months[i]}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
                    {[["≥70% Safe", "var(--accent)"], ["65–70%", "#f0dc3a"], ["<65%", "#f5a623"]].map(([l, c]) => (
                      <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block" }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 🆕 Data Sources Card */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px", animation: "fadeUp 0.5s ease 0.4s both" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>📚 Data Sources & References</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700 }}>Official Data Sources</div>
                  </div>
                </div>
                <div className="resp-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {DATA_SOURCES.map((src, i) => (
                    <a
                      key={src.name}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                      style={{ animation: `fadeUp 0.4s ease ${0.45 + i * 0.06}s both`, textDecoration: "none" }}
                    >
                      <span style={{ fontSize: 24 }}>{src.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{src.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{src.desc}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
