import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where,
  getDocs, deleteDoc, doc
} from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, RadialLinearScale, Filler
} from "chart.js";
import { Pie, Bar, Line, Radar, Doughnut } from "react-chartjs-2";
import {
  AreaChart, Area, LineChart, Line as RechartsLine,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend as RechartsLegend, ResponsiveContainer
} from "recharts";

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, RadialLinearScale, Filler
);

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes fadeIn  { from{opacity:0;} to{opacity:1;} }
  @keyframes slideUp { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }
  @keyframes toastIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
  @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes spin    { to{transform:rotate(360deg);} }
  @keyframes shimmer { 0%{background-position:200% center;} 100%{background-position:-200% center;} }
  @keyframes avatarPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,168,232,0.35);} 70%{box-shadow:0 0 0 8px rgba(0,168,232,0);} }
  @keyframes chartFadeIn { from{opacity:0;transform:scale(0.97);} to{opacity:1;transform:scale(1);} }
  @keyframes cardPop { from{opacity:0;transform:translateY(8px) scale(0.98);} to{opacity:1;transform:translateY(0) scale(1);} }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: var(--bg); color: var(--text); font-family: 'Inter', var(--font-body), sans-serif; height: 100%; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,168,232,0.2); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,168,232,0.4); }

  .chat-avatar-ai { animation: avatarPulse 2.5s infinite; }
  .chart-card { animation: chartFadeIn 0.5s cubic-bezier(.22,1,.36,1) both; transition: all 0.3s cubic-bezier(.22,1,.36,1); }
  .chart-card:hover { transform: translateY(-3px) !important; }
  .chart-type-btn { transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: var(--muted); cursor: pointer; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-family: var(--font-mono); }
  .chart-type-btn:hover { border-color: rgba(0,168,232,0.4); color: var(--accent); background: rgba(0,168,232,0.07); }
  .chart-type-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(0,168,232,0.12); }
  .metric-card { animation: cardPop 0.4s cubic-bezier(.22,1,.36,1) both; transition: all 0.25s ease; }
  .metric-card:hover { transform: translateY(-2px); }

  /* ── Session cards ── */
  .s-card { position:relative; border-radius:10px; padding:12px 40px 12px 14px; margin-bottom:6px; cursor:pointer; border:1px solid transparent; background:transparent; transition:all 0.18s; }
  .s-card:hover  { background:rgba(0,168,232,0.05); border-color:rgba(0,168,232,0.22); }
  .s-card.active { background:rgba(0,168,232,0.09); border-color:rgba(0,168,232,0.38); }
  .card-x { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; width:24px; height:24px; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:17px; line-height:1; color:transparent; transition:all 0.15s; }
  .s-card:hover .card-x { color:rgba(232,64,64,0.5); }
  .card-x:hover { color:#e84040!important; background:rgba(232,64,64,0.12)!important; }

  /* ── Search ── */
  .srch { width:100%; padding:9px 32px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:13px; font-family:'Inter',var(--font-body),sans-serif; outline:none; transition:all 0.2s; }
  .srch:focus { border-color:rgba(0,168,232,0.35); box-shadow:0 0 0 3px rgba(0,168,232,0.07); }
  .srch::placeholder { color:var(--muted); }

  /* ── Buttons ── */
  .btn-danger { padding:8px 14px; background:rgba(232,64,64,0.08); border:1px solid rgba(232,64,64,0.25); border-radius:8px; color:#e84040; font-size:12px; cursor:pointer; font-family:'Inter',var(--font-body),sans-serif; font-weight:500; transition:all 0.2s; }
  .btn-danger:hover { background:#e84040; color:#fff; box-shadow:0 0 14px rgba(232,64,64,0.3); }
  .btn-ghost { padding:8px 14px; background:var(--accent-dim); border:1px solid rgba(0,168,232,0.2); border-radius:8px; color:var(--accent); font-size:12px; cursor:pointer; font-family:'Inter',var(--font-body),sans-serif; font-weight:500; transition:all 0.2s; }
  .btn-ghost:hover { box-shadow:0 0 14px var(--accent-glow); }
  .btn-del-all { background:none; border:none; color:rgba(232,64,64,0.35); cursor:pointer; font-size:16px; padding:4px 5px; border-radius:5px; transition:color 0.2s; line-height:1; }
  .btn-del-all:hover { color:#e84040; }

  /* ── Confirm modal ── */
  .overlay { position:fixed; inset:0; background:rgba(3,16,13,0.82); backdrop-filter:blur(7px); z-index:200; display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease both; }
  .modal { background:var(--surface); border:1px solid rgba(232,64,64,0.3); border-radius:18px; padding:36px 30px; max-width:400px; width:92%; animation:slideUp 0.25s ease both; box-shadow:0 24px 80px rgba(0,0,0,0.5); }

  /* ── Toast ── */
  .toast { position:fixed; bottom:26px; right:26px; z-index:300; padding:11px 18px; border-radius:10px; font-size:13px; font-family:'JetBrains Mono',monospace; display:flex; align-items:center; gap:8px; box-shadow:0 8px 32px rgba(0,0,0,0.35); animation:toastIn 0.3s ease both; }
  .toast.ok  { background:var(--surface); border:1px solid rgba(0,168,232,0.3); color:var(--accent); }
  .toast.err { background:var(--surface); border:1px solid rgba(232,64,64,0.3); color:#e84040; }

  /* ── Sidebar mobile ── */
  .sidebar-desktop { transition:all 0.4s cubic-bezier(.22,1,.36,1); }
  @media (max-width:768px) {
    .sidebar-desktop { position:fixed!important; left:-320px; top:0; bottom:0; z-index:999; box-shadow:24px 0 60px rgba(0,0,0,0.5); }
    .sidebar-desktop.mobile-open { left:0; }
  }
  .hamburger-btn { display:none; transition:all 0.2s; }
  @media (max-width:768px) { .hamburger-btn { display:flex; } .sidebar-desktop { width:280px!important; } }

  /* ── Markdown ── */
  .ai-markdown { font-family:'Inter', var(--font-body), sans-serif; }
  .ai-markdown h1 { color:var(--accent); font-size:22px; font-weight:700; margin:28px 0 14px; border-bottom:2px solid rgba(0,168,232,0.2); padding-bottom:10px; }
  .ai-markdown h2 { color:var(--text); font-size:18px; font-weight:700; margin:24px 0 12px; }
  .ai-markdown h3 { color:var(--accent); font-size:16px; font-weight:700; margin:20px 0 10px; border-bottom:1px solid rgba(0,168,232,0.12); padding-bottom:6px; display:flex; align-items:center; gap:6px; }
  .ai-markdown h4 { color:var(--text); font-size:14px; font-weight:600; margin:16px 0 8px; opacity:0.9; }
  .ai-markdown p { margin:0 0 14px; line-height:1.75; color:#c8d9e8; font-size:14px; }
  .ai-markdown ul,.ai-markdown ol { margin:0 0 16px; padding-left:24px; color:#c8d9e8; line-height:1.75; font-size:14px; }
  .ai-markdown li { margin-bottom:6px; }
  .ai-markdown li::marker { color:var(--accent); font-weight:bold; }
  .ai-markdown strong { color:#e8f2ff; font-weight:600; }
  .ai-markdown em { color:#a8c4d8; font-style:italic; }
  .ai-markdown hr { border:none; height:1px; background:linear-gradient(90deg,transparent,rgba(0,168,232,0.3),transparent); margin:24px 0; }
  .ai-markdown blockquote { border-left:3px solid var(--accent); margin:16px 0; padding:10px 16px; background:linear-gradient(90deg,rgba(0,168,232,0.07),transparent); border-radius:0 8px 8px 0; font-size:13px; color:#a0b8d0; }
  .ai-markdown code { background:rgba(0,168,232,0.1); color:var(--accent); padding:2px 6px; border-radius:5px; font-family:'JetBrains Mono',monospace; font-size:12px; border:1px solid rgba(0,168,232,0.2); }
  .ai-markdown pre { background:rgba(10,24,48,0.6); border:1px solid rgba(0,168,232,0.15); border-radius:10px; padding:16px; overflow-x:auto; margin:14px 0; }
  .ai-markdown pre code { background:none; border:none; padding:0; font-size:13px; }
  .ai-markdown table { width:100%; border-collapse:collapse; margin:16px 0 24px; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.2); border:1px solid rgba(0,168,232,0.15); }
  .ai-markdown th { background:rgba(0,30,60,0.8); color:var(--accent); padding:11px 14px; text-align:left; font-weight:600; border-bottom:1px solid rgba(0,168,232,0.2); font-size:12px; text-transform:uppercase; letter-spacing:0.06em; font-family:var(--font-mono); white-space:nowrap; }
  .ai-markdown td { padding:11px 14px; border-bottom:1px solid rgba(255,255,255,0.04); background:rgba(8,20,44,0.4); font-size:13px; color:#d0e4f0; font-family:var(--font-body); transition:background 0.15s; }
  .ai-markdown tr:last-child td { border-bottom:none; }
  .ai-markdown tr:hover td { background:rgba(0,168,232,0.06); }
  .ai-markdown tr:nth-child(even) td { background:rgba(0,168,232,0.025); }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  { main: '#00a8e8', dim: 'rgba(0,168,232,0.15)', glow: 'rgba(0,168,232,0.4)' },
  { main: '#f0dc3a', dim: 'rgba(240,220,58,0.15)', glow: 'rgba(240,220,58,0.4)' },
  { main: '#f5a623', dim: 'rgba(245,166,35,0.15)', glow: 'rgba(245,166,35,0.4)' },
  { main: '#e84040', dim: 'rgba(232,64,64,0.15)',  glow: 'rgba(232,64,64,0.4)' },
  { main: '#7c3aed', dim: 'rgba(124,58,237,0.15)', glow: 'rgba(124,58,237,0.4)' },
  { main: '#10b981', dim: 'rgba(16,185,129,0.15)', glow: 'rgba(16,185,129,0.4)' },
];
const PIE_COLORS = CHART_COLORS.map(c => c.main);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = d =>
  d ? new Date(d).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

const fmtFull = d =>
  d ? new Date(d).toLocaleString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

// ─── InteractiveChart ─────────────────────────────────────────────────────────

function InteractiveChart({ chartConfig }) {
  const [activeType, setActiveType] = useState(chartConfig.type || "bar");
  const chartRef = useRef(null);

  const datasets = useMemo(() =>
    chartConfig.datasets || [{ label: chartConfig.title || "Data", data: chartConfig.data || [] }],
    [chartConfig]
  );

  const labels = chartConfig.labels || [];
  const isMultiSeries = datasets.length > 1;

  const compatibleTypes = useMemo(() => {
    return isMultiSeries ? ["bar", "line", "area"] : ["bar", "line", "area", "pie", "doughnut"];
  }, [isMultiSeries]);

  const chartJsData = useMemo(() => ({
    labels,
    datasets: datasets.map((ds, i) => {
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const isPieType = activeType === "pie" || activeType === "doughnut";
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: isPieType
          ? PIE_COLORS.map(c => c + "cc")
          : activeType === "line" ? `${color.main}22` : `${color.main}cc`,
        borderColor: isPieType ? PIE_COLORS : color.main,
        borderWidth: isPieType ? 2 : activeType === "line" ? 3 : 0,
        hoverBackgroundColor: isPieType ? PIE_COLORS : `${color.main}ff`,
        hoverOffset: isPieType ? 14 : 0,
        borderRadius: activeType === "bar" ? 7 : 0,
        maxBarThickness: 80,
        fill: activeType === "area",
        tension: 0.4,
        pointBackgroundColor: color.main,
        pointBorderColor: "#0a1830",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      };
    })
  }), [datasets, labels, activeType]);

  const chartJsOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: "easeInOutQuart" },
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#c8d9e8", padding: 20, font: { family: "'Inter', sans-serif", size: 12 }, usePointStyle: true, pointStyle: "circle", boxWidth: 8 }
      },
      title: { display: false },
      tooltip: {
        backgroundColor: "rgba(8,18,40,0.95)", titleColor: "#00a8e8", bodyColor: "#c8d9e8",
        borderColor: "rgba(0,168,232,0.3)", borderWidth: 1, padding: 14, cornerRadius: 10,
        displayColors: true, boxPadding: 6, caretSize: 6,
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            const formatted = typeof val === "number" && val > 999 ? val.toLocaleString("en-IN") : val;
            return ` ${ctx.dataset.label || ctx.label}: ${formatted}`;
          }
        }
      }
    },
    scales: (activeType === "bar" || activeType === "line" || activeType === "area") ? {
      y: {
        ticks: { color: "#5a7a9e", font: { family: "'JetBrains Mono', monospace", size: 11 }, callback: (val) => val > 999 ? (val / 1000).toFixed(1) + "k" : val },
        grid: { color: "rgba(0,168,232,0.06)", tickLength: 0 }, border: { dash: [4, 4], display: false }
      },
      x: {
        ticks: { color: "#8aa4b8", font: { family: "'Inter', sans-serif", size: 11 }, maxRotation: 35 },
        grid: { display: false }, border: { display: false }
      }
    } : {}
  }), [activeType]);

  const rechartsData = useMemo(() =>
    labels.map((label, idx) => {
      const row = { name: label };
      datasets.forEach((ds, dsIdx) => { row[`val${dsIdx}`] = ds.data[idx] ?? 0; });
      return row;
    }),
    [labels, datasets]
  );

  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "rgba(8,18,40,0.97)", border: "1px solid rgba(0,168,232,0.3)", padding: "12px 16px", borderRadius: 10, backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 160 }}>
        <p style={{ color: "#e8f2ff", margin: "0 0 10px", fontWeight: 600, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 8, fontFamily: "'Inter', sans-serif" }}>{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, color: "#a0b8d0", fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color, display: "inline-block", boxShadow: `0 0 6px ${entry.color}88` }} />
              {entry.name}
            </span>
            <span style={{ color: entry.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
              {typeof entry.value === "number" && entry.value > 999 ? entry.value.toLocaleString("en-IN") : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }, []);

  const handleDownload = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      if (canvas) {
        const link = document.createElement("a");
        link.download = `${chartConfig.title || "chart"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    }
  };

  const renderChart = () => {
    if (activeType === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rechartsData} margin={{ top: 10, right: 24, left: -10, bottom: 14 }}>
            <defs>
              {datasets.map((_, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length].main;
                return (
                  <linearGradient key={idx} id={`histgrad${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill: "#6a8aae", fontSize: 11, fontFamily: "'Inter', sans-serif" }} tickLine={false} tickMargin={12} />
            <YAxis stroke="transparent" tick={{ fill: "#4a6a8e", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} tickMargin={8} tickFormatter={(v) => v > 999 ? (v / 1000).toFixed(1) + "k" : v} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,168,232,0.18)", strokeWidth: 1, strokeDasharray: "5 5" }} />
            <RechartsLegend wrapperStyle={{ paddingTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#8aa4b8" }} iconType="circle" iconSize={8} />
            {datasets.map((ds, idx) => {
              const color = CHART_COLORS[idx % CHART_COLORS.length].main;
              return (
                <Area key={idx} type="monotone" dataKey={`val${idx}`} name={ds.label}
                  stroke={color} strokeWidth={2.5} fillOpacity={1}
                  fill={`url(#histgrad${idx})`}
                  activeDot={{ r: 7, fill: color, stroke: "#0a1830", strokeWidth: 2 }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    if (activeType === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rechartsData} margin={{ top: 10, right: 24, left: -10, bottom: 14 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill: "#6a8aae", fontSize: 11, fontFamily: "'Inter', sans-serif" }} tickLine={false} tickMargin={12} />
            <YAxis stroke="transparent" tick={{ fill: "#4a6a8e", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} tickMargin={8} tickFormatter={(v) => v > 999 ? (v / 1000).toFixed(1) + "k" : v} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,168,232,0.18)", strokeWidth: 1, strokeDasharray: "5 5" }} />
            <RechartsLegend wrapperStyle={{ paddingTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#8aa4b8" }} iconType="circle" iconSize={8} />
            {datasets.map((ds, idx) => {
              const color = CHART_COLORS[idx % CHART_COLORS.length].main;
              return (
                <RechartsLine key={idx} type="monotone" dataKey={`val${idx}`} name={ds.label}
                  stroke={color} strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0a1830", stroke: color, strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: color, stroke: "#0a1830", strokeWidth: 2 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (activeType === "pie")      return <Pie      ref={chartRef} data={chartJsData} options={chartJsOptions} />;
    if (activeType === "doughnut") return <Doughnut ref={chartRef} data={chartJsData} options={chartJsOptions} />;
    if (activeType === "radar")    return <Radar    ref={chartRef} data={chartJsData} options={chartJsOptions} />;
    return <Bar ref={chartRef} data={chartJsData} options={chartJsOptions} />;
  };

  const isPieOrDoughnut = activeType === "pie" || activeType === "doughnut";

  return (
    <div className="chart-card" style={{
      background: "linear-gradient(145deg, rgba(8,20,44,0.8), rgba(5,14,30,0.95))",
      borderRadius: 16, padding: "20px 20px 16px", marginTop: 20, marginBottom: 8,
      border: "1px solid rgba(0,168,232,0.18)", position: "relative",
      boxShadow: "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
      overflow: "hidden"
    }}>
      <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,168,232,0.4), transparent)", pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div style={{ flex: 1 }}>
          {chartConfig.title && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: "#e0eeff", letterSpacing: "0.01em", lineHeight: 1.3 }}>
              {chartConfig.title}
            </div>
          )}
          {chartConfig.subtitle && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#5a7a9e", marginTop: 3 }}>
              {chartConfig.subtitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", padding: "3px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
            {compatibleTypes.map(t => (
              <button key={t} className={`chart-type-btn${activeType === t ? " active" : ""}`}
                onClick={() => setActiveType(t)} title={`Switch to ${t} chart`}
                style={{ padding: "4px 8px", fontSize: "10px" }}>
                {t === "bar" ? "▊▊" : t === "line" ? "╱╲" : t === "area" ? "▲▲" : t === "pie" ? "◉" : t === "doughnut" ? "◎" : "★"}
              </button>
            ))}
          </div>
          {(activeType === "bar" || activeType === "pie" || activeType === "doughnut") && (
            <button onClick={handleDownload} title="Download chart"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "#5a7a9e", fontSize: 11, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "rgba(0,168,232,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#5a7a9e"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
              ↓
            </button>
          )}
        </div>
      </div>

      <div style={{ height: isPieOrDoughnut ? 340 : 320, width: "100%" }}>
        {renderChart()}
      </div>

      {datasets.length > 1 && !isPieOrDoughnut && (
        <div style={{ display: "flex", gap: 16, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
          {datasets.map((ds, idx) => {
            const color = CHART_COLORS[idx % CHART_COLORS.length].main;
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8aa4b8", fontFamily: "'Inter', sans-serif" }}>
                <div style={{ width: 24, height: 3, borderRadius: 2, background: color }} />
                {ds.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, color, icon, trend }) {
  const clr = color || "#00a8e8";
  return (
    <div className="metric-card" style={{
      flex: "1 1 130px", background: `linear-gradient(135deg, ${clr}12, ${clr}06)`,
      border: `1px solid ${clr}30`, borderRadius: 12, padding: "14px 16px",
      textAlign: "center", boxShadow: `0 4px 20px ${clr}10`
    }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>}
      <div style={{ fontSize: 22, fontWeight: 800, color: clr, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, color: `${clr}99`, marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11, color: "#6a8aae", marginTop: 5, fontFamily: "'Inter', sans-serif", lineHeight: 1.3 }}>{label}</div>
      {trend && (
        <div style={{ fontSize: 10, color: trend > 0 ? "#e84040" : "#10b981", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ─── AIMessage ────────────────────────────────────────────────────────────────

function AIMessage({ message, user }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const MarkdownComponents = useMemo(() => ({
    a({ href, children, ...props }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid rgba(0,168,232,0.3)", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.target.style.borderColor = "var(--accent)"}
          onMouseLeave={e => e.target.style.borderColor = "rgba(0,168,232,0.3)"}
          {...props}>
          {children}
        </a>
      );
    },

    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match?.[1];

      // ── Chart block ──
      if (!inline && lang === "chart") {
        try {
          const chartConfig = JSON.parse(String(children).trim());
          return <InteractiveChart chartConfig={chartConfig} />;
        } catch (e) {
          return (
            <div style={{ background: "rgba(232,64,64,0.08)", border: "1px solid rgba(232,64,64,0.2)", borderRadius: 10, padding: 14, margin: "12px 0", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ color: "#e84040", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Chart Render Error</div>
                <div style={{ color: "#8aa4b8", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{e.message}</div>
              </div>
            </div>
          );
        }
      }

      // ── Metrics block ──
      if (!inline && lang === "metrics") {
        try {
          const items = JSON.parse(String(children).trim());
          return (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
              {items.map((item, i) => <MetricCard key={i} {...item} />)}
            </div>
          );
        } catch { return null; }
      }

      if (inline) return <code className={className} {...props}>{children}</code>;
      return (
        <pre style={{ background: "rgba(10,24,48,0.7)", border: "1px solid rgba(0,168,232,0.12)", borderRadius: 10, padding: 16, overflow: "auto", margin: "12px 0", position: "relative" }}>
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#c8d9e8", lineHeight: 1.6 }}>{children}</code>
        </pre>
      );
    },

    table({ children, ...props }) {
      return (
        <div style={{ overflowX: "auto", margin: "16px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.25)", border: "1px solid rgba(0,168,232,0.15)" }} {...props}>
            {children}
          </table>
        </div>
      );
    },

    blockquote({ children, ...props }) {
      return (
        <blockquote style={{ borderLeft: "3px solid var(--accent)", margin: "14px 0", padding: "10px 16px 10px 20px", background: "linear-gradient(90deg, rgba(0,168,232,0.08), rgba(0,168,232,0.02))", borderRadius: "0 10px 10px 0", fontStyle: "normal" }} {...props}>
          {children}
        </blockquote>
      );
    },

    h3({ children, ...props }) {
      return <h3 style={{ color: "var(--accent)", fontSize: 15, fontWeight: 700, margin: "22px 0 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(0,168,232,0.12)", paddingBottom: 6 }} {...props}>{children}</h3>;
    },
  }), []);

  return (
    <div style={{ width: "100%", display: "flex", gap: 12, alignItems: "flex-start", animation: "fadeUp 0.35s ease both" }}>
      {/* Avatar */}
      <div className="chat-avatar-ai" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,168,232,0.1)", border: "1px solid rgba(0,168,232,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
        <img src="/ingres.svg" alt="" style={{ width: 18 }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>AquaGuide AI</span>
            <span style={{ fontSize: 9, background: "rgba(0,168,232,0.15)", color: "var(--accent)", padding: "2px 7px", borderRadius: 20, fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: "0.04em", border: "1px solid rgba(0,168,232,0.2)" }}>CGWB 2024-25</span>
          </div>
          {message.text && (
            <button onClick={handleCopy}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 10px", cursor: "pointer", color: copied ? "var(--accent)" : "var(--muted)", fontSize: 10, fontFamily: "'Inter', sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 5 }}
              onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; } }}
              onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; } }}>
              {copied ? "✓ Copied" : "⎘ Copy"}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="ai-markdown">
          <ReactMarkdown rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
            {message.text}
          </ReactMarkdown>
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", marginTop: 8, opacity: 0.6 }}>
          {fmt(message.ts)}
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, body, onConfirm, onCancel, loading }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 14 }}>🗑️</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, textAlign: "center", color: "var(--text)", marginBottom: 10 }}>{title}</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", fontFamily: "var(--font-body)", lineHeight: 1.65, marginBottom: 28 }}>{body}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, padding: 11, background: "transparent", border: "1px solid var(--border)", borderRadius: 9, color: "var(--muted)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 1, padding: 11, background: "rgba(232,64,64,0.12)", border: "1px solid rgba(232,64,64,0.35)", borderRadius: 9, color: "#e84040", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "#e84040"; e.currentTarget.style.color = "#fff"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(232,64,64,0.12)"; e.currentTarget.style.color = "#e84040"; }}>
            {loading
              ? <span style={{ width: 14, height: 14, border: "2px solid #e84040", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function History() {
  const navigate = useNavigate();

  const [user,     setUser]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState("");

  const [modal,             setModal]             = useState(null);
  const [deleting,          setDeleting]          = useState(false);
  const [toast,             setToast]             = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* ── Load sessions ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { navigate("/login"); return; }
      setUser(u);
      try {
        const q    = query(collection(db, "chat_sessions"), where("userId", "==", u.uid));
        const snap = await getDocs(q);
        const rows = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setSessions(rows);
      } catch (err) {
        console.error("Firestore load error:", err);
        showToast("Could not load history — check Firestore is enabled", "err");
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [navigate]);

  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  const doDeleteOne = async () => {
    const id = modal.id;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "chat_sessions", id));
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast("Session deleted");
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "err");
    } finally {
      setDeleting(false);
      setModal(null);
    }
  };

  const doDeleteAll = async () => {
    setDeleting(true);
    try {
      await Promise.all(sessions.map(s => deleteDoc(doc(db, "chat_sessions", s.id))));
      setSessions([]);
      setSelected(null);
      showToast(`All ${sessions.length} sessions deleted`);
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "err");
    } finally {
      setDeleting(false);
      setModal(null);
    }
  };

  const filtered = sessions.filter(s =>
    !search ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.messages?.some(m => m.text?.toLowerCase().includes(search.toLowerCase()))
  );

  /* ── Render ── */
  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>

        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998, backdropFilter: "blur(4px)" }}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`sidebar-desktop${mobileSidebarOpen ? " mobile-open" : ""}`}
          style={{ width: 300, background: "var(--bg2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>

          {/* Header */}
          <div style={{ padding: "16px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/dashboard")}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer", fontSize: 15, padding: "5px 10px", borderRadius: 7, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "rgba(0,168,232,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              ←
            </button>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#0078d4,#00a8e8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(0,168,232,0.2)", flexShrink: 0 }}>
              <img src="/ingres.svg" alt="" style={{ width: 18 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--font-display)" }}>Chat History</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                {loading ? "Loading…" : `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
              </div>
            </div>
            {!loading && sessions.length > 0 && (
              <button className="btn-del-all" title="Delete all" onClick={() => setModal({ type: "all" })}>🗑</button>
            )}
          </div>

          {/* Search */}
          <div style={{ padding: "12px 13px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input className="srch" type="text" placeholder="Search chats…" value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>
                  ×
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ borderRadius: 10, padding: "13px 14px", marginBottom: 7, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ height: 13, width: "65%", background: "rgba(0,168,232,0.07)", borderRadius: 4, marginBottom: 9 }} />
                  <div style={{ height: 10, width: "40%", background: "rgba(0,168,232,0.04)", borderRadius: 4 }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
                <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {search ? "No results" : "No history yet"}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                  {search ? `Nothing matching "${search}"` : "Your chats will appear here after you start a conversation."}
                </div>
                {!search && (
                  <button onClick={() => navigate("/chatbot")}
                    style={{ marginTop: 14, padding: "8px 18px", background: "var(--accent-dim)", border: "1px solid rgba(0,168,232,0.2)", borderRadius: 8, color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                    Open Chatbot →
                  </button>
                )}
              </div>
            ) : (
              filtered.map((s, idx) => {
                const isActive  = selected?.id === s.id;
                const userMsgs  = s.messages?.filter(m => m.role === "user") || [];
                const lastQuery = userMsgs[userMsgs.length - 1]?.text || "";
                return (
                  <div key={s.id} className={`s-card${isActive ? " active" : ""}`}
                    onClick={() => { setSelected(s); setMobileSidebarOpen(false); }}
                    style={{ animation: `fadeUp 0.3s ease ${idx * 0.04}s both` }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: isActive ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                      {s.title || "Untitled Chat"}
                    </div>
                    {lastQuery && (
                      <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-body)", marginBottom: 5 }}>
                        {lastQuery}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(s.updatedAt)}</span>
                      <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{s.messages?.length || 0} msgs</span>
                    </div>
                    <button className="card-x" onClick={e => { e.stopPropagation(); setModal({ type: "one", id: s.id }); }} title="Delete session">×</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {!loading && (
            <div style={{ padding: "12px 13px", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => navigate("/chatbot")}
                style={{ width: "100%", padding: "10px", background: "var(--accent-dim)", border: "1px solid rgba(0,168,232,0.2)", borderRadius: 8, color: "var(--accent)", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body)", transition: "box-shadow 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px var(--accent-glow)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                + New Chat
              </button>
            </div>
          )}
        </aside>

        {/* ── TRANSCRIPT VIEW ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)", minWidth: 0 }}>
          {selected ? (
            <>
              {/* Transcript header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                  <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)}
                    style={{ background: "none", border: "none", color: "var(--text)", fontSize: 20, cursor: "pointer", padding: 0 }}>
                    ☰
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontFamily: "var(--font-display)", margin: 0, fontSize: 17, color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selected.title || "Untitled Chat"}
                    </h2>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", marginTop: 4, display: "flex", gap: 14 }}>
                      <span>🕐 {fmtFull(selected.updatedAt)}</span>
                      <span>💬 {selected.messages?.length || 0} messages</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn-ghost" onClick={() => navigate("/chatbot")}>💬 Continue</button>
                  <button className="btn-danger" onClick={e => { e.stopPropagation(); setModal({ type: "one", id: selected.id }); }}>🗑 Delete</button>
                </div>
              </div>

              {/* Messages — same layout as Chatbot */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 6, maxWidth: 960, margin: "0 auto", width: "100%" }}>
                  {selected.messages?.map((m, i) => {
                    const isUser = m.role === "user";
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginTop: i === 0 ? 0 : (isUser ? 18 : 6) }}>
                        {isUser ? (
                          /* User bubble — identical to Chatbot */
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexDirection: "row-reverse", maxWidth: "72%" }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,168,232,0.15)", border: "1px solid rgba(0,168,232,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                              {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ padding: "11px 16px", borderRadius: "18px 18px 4px 18px", background: "linear-gradient(135deg, #0057a0, #0088cc, #00a8e8)", color: "#fff", fontSize: 14, lineHeight: 1.6, fontFamily: "'Inter', sans-serif", fontWeight: 500, boxShadow: "0 4px 20px rgba(0,168,232,0.2)" }}>
                                {m.text}
                              </div>
                              <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", marginTop: 4, textAlign: "right", opacity: 0.6 }}>{fmt(m.ts)}</div>
                            </div>
                          </div>
                        ) : (
                          /* AI message — full rich renderer */
                          <AIMessage message={m} user={user} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg)", minWidth: 0 }}>
              {/* Mobile-only header for opening history when nothing is selected */}
              <div className="resp-hide-desktop" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)}
                  style={{ background: "none", border: "none", color: "var(--text)", fontSize: 20, cursor: "pointer", padding: 0 }}>
                  ☰
                </button>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>Select Chat</div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", animation: "fadeUp 0.4s ease both", padding: 24 }}>
                <div style={{ width: 66, height: 66, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, boxShadow: "0 0 32px rgba(0,168,232,0.06)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, margin: 0, color: "var(--text)" }}>
                {loading ? "Loading…" : sessions.length === 0 ? "No history yet" : "Select a session"}
              </h3>
              <p style={{ fontSize: 13, marginTop: 8, fontFamily: "'JetBrains Mono', monospace", textAlign: "center", lineHeight: 1.7, maxWidth: 300 }}>
                {sessions.length === 0
                  ? "Your AquaGuide AI conversations will appear here."
                  : "Pick a session from the sidebar to read the transcript."}
              </p>
              {sessions.length === 0 && !loading && (
                <button onClick={() => navigate("/chatbot")}
                  style={{ marginTop: 18, padding: "10px 22px", background: "var(--accent)", border: "none", borderRadius: 10, color: "var(--btn-text)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)", boxShadow: "0 0 24px rgba(0,168,232,0.3)", transition: "all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,168,232,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 0 24px rgba(0,168,232,0.3)"; }}>
                  💬 Start Chatting
                </button>
              )}
              </div>
            </div>
          )}
        </div>

        {/* ── CONFIRM MODAL ── */}
        {modal?.type === "one" && (
          <ConfirmModal
            title="Delete this session?"
            body="This will permanently remove the conversation and all its messages. This cannot be undone."
            onConfirm={doDeleteOne}
            onCancel={() => !deleting && setModal(null)}
            loading={deleting}
          />
        )}
        {modal?.type === "all" && (
          <ConfirmModal
            title={`Delete all ${sessions.length} sessions?`}
            body="This will permanently erase your entire chat history. There is no way to recover these conversations."
            onConfirm={doDeleteAll}
            onCancel={() => !deleting && setModal(null)}
            loading={deleting}
          />
        )}

        {/* ── TOAST ── */}
        {toast && (
          <div className={`toast ${toast.kind}`}>
            {toast.kind === "ok" ? "✓" : "✕"} {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}