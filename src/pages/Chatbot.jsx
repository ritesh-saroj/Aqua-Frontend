import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, RadialLinearScale, Filler
} from 'chart.js';
import { Pie, Bar, Line, Radar, Doughnut } from 'react-chartjs-2';
import {
  AreaChart, Area, LineChart, Line as RechartsLine,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend as RechartsLegend, ResponsiveContainer, ReferenceLine,
  Brush
} from 'recharts';
import { parseSummaryData } from '../utils/dataParser';

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, RadialLinearScale, Filler
);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

// ─── CSS ─────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

  @keyframes fadeUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
  @keyframes shimmer { 0%{background-position:200% center;} 100%{background-position:-200% center;} }
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
  @keyframes avatarPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,168,232,0.35);} 70%{box-shadow:0 0 0 8px rgba(0,168,232,0);} }
  @keyframes chartFadeIn { from{opacity:0;transform:scale(0.97);} to{opacity:1;transform:scale(1);} }
  @keyframes cardPop{ from{opacity:0;transform:translateY(8px) scale(0.98);} to{opacity:1;transform:translateY(0) scale(1);} }

  * { box-sizing: border-box; }

  .chat-avatar-ai { animation: avatarPulse 2.5s infinite; }
  .streaming-cursor::after { content:'▊'; color:var(--accent); animation:blink 0.8s step-end infinite; margin-left:2px; font-size:0.9em; }

  .suggestion-card { transition: all 0.28s cubic-bezier(.22,1,.36,1); }
  .suggestion-card:hover { border-color:rgba(0,168,232,0.6)!important; transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,168,232,0.18)!important; background:rgba(0,168,232,0.05)!important; }

  .input-glass { transition: border-color 0.3s, box-shadow 0.3s; }
  .input-glass:focus-within { border-color:rgba(0,168,232,0.5)!important; box-shadow:0 0 0 3px rgba(0,168,232,0.1),0 8px 32px rgba(0,0,0,0.2)!important; }

  .chart-card { animation: chartFadeIn 0.5s cubic-bezier(.22,1,.36,1) both; transition: all 0.3s cubic-bezier(.22,1,.36,1); }
  .chart-card:hover { transform:translateY(-3px)!important; }

  .chart-type-btn { transition: all 0.2s ease; border:1px solid rgba(255,255,255,0.08); background:transparent; color:var(--muted); cursor:pointer; padding:5px 10px; border-radius:6px; font-size:11px; font-family:var(--font-mono); }
  .chart-type-btn:hover { border-color:rgba(0,168,232,0.4); color:var(--accent); background:rgba(0,168,232,0.07); }
  .chart-type-btn.active { border-color:var(--accent); color:var(--accent); background:rgba(0,168,232,0.12); }

  .metric-card { animation: cardPop 0.4s cubic-bezier(.22,1,.36,1) both; transition: all 0.25s ease; }
  .metric-card:hover { transform: translateY(-2px); }

  .nav-item:hover { background:rgba(0,168,232,0.06)!important; color:var(--text)!important; }

  /* ─── Markdown Styles ─── */
  .ai-markdown { font-family: 'Inter', var(--font-body), sans-serif; }
  .ai-markdown h1 { color:var(--accent); font-size:22px; font-weight:700; margin:28px 0 14px; border-bottom:2px solid rgba(0,168,232,0.2); padding-bottom:10px; }
  .ai-markdown h2 { color:var(--text); font-size:18px; font-weight:700; margin:24px 0 12px; }
  .ai-markdown h3 { color:var(--accent); font-size:16px; font-weight:700; margin:20px 0 10px; border-bottom:1px solid rgba(0,168,232,0.12); padding-bottom:6px; display:flex; align-items:center; gap:6px; }
  .ai-markdown h4 { color:var(--text); font-size:14px; font-weight:600; margin:16px 0 8px; opacity:0.9; }
  .ai-markdown p { margin:0 0 14px; line-height:1.75; color:#c8d9e8; font-size:14px; }
  .ai-markdown ul, .ai-markdown ol { margin:0 0 16px; padding-left:24px; color:#c8d9e8; line-height:1.75; font-size:14px; }
  .ai-markdown li { margin-bottom:6px; }
  .ai-markdown li::marker { color:var(--accent); font-weight:bold; }
  .ai-markdown strong { color:#e8f2ff; font-weight:600; }
  .ai-markdown em { color:#a8c4d8; font-style:italic; }
  .ai-markdown hr { border:none; height:1px; background:linear-gradient(90deg,transparent,rgba(0,168,232,0.3),transparent); margin:24px 0; }
  .ai-markdown blockquote { border-left:3px solid var(--accent); margin:16px 0; padding:10px 16px; background:linear-gradient(90deg,rgba(0,168,232,0.07),transparent); border-radius:0 8px 8px 0; font-size:13px; color:#a0b8d0; }
  .ai-markdown code { background:rgba(0,168,232,0.1); color:var(--accent); padding:2px 6px; border-radius:5px; font-family:'JetBrains Mono', monospace; font-size:12px; border:1px solid rgba(0,168,232,0.2); }
  .ai-markdown pre { background:rgba(10,24,48,0.6); border:1px solid rgba(0,168,232,0.15); border-radius:10px; padding:16px; overflow-x:auto; margin:14px 0; }
  .ai-markdown pre code { background:none; border:none; padding:0; font-size:13px; }

  /* Table */
  .ai-markdown table { width:100%; border-collapse:collapse; margin:16px 0 24px; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.2); border:1px solid rgba(0,168,232,0.15); }
  .ai-markdown th { background:rgba(0,30,60,0.8); color:var(--accent); padding:11px 14px; text-align:left; font-weight:600; border-bottom:1px solid rgba(0,168,232,0.2); font-size:12px; text-transform:uppercase; letter-spacing:0.06em; font-family:var(--font-mono); white-space:nowrap; }
  .ai-markdown td { padding:11px 14px; border-bottom:1px solid rgba(255,255,255,0.04); background:rgba(8,20,44,0.4); font-size:13px; color:#d0e4f0; font-family:var(--font-body); transition:background 0.15s; }
  .ai-markdown tr:last-child td { border-bottom:none; }
  .ai-markdown tr:hover td { background:rgba(0,168,232,0.06); }
  .ai-markdown tr:nth-child(even) td { background:rgba(0,168,232,0.025); }

  /* Scrollbar */
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(0,168,232,0.2); border-radius:10px; }
  ::-webkit-scrollbar-thumb:hover { background:rgba(0,168,232,0.4); }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTION_POOL = [
  "Groundwater status in Maharashtra",
  "Over-exploited blocks in Rajasthan",
  "Which districts in Gujarat are critical?",
  "Compare Punjab and UP extraction rates",
  "Summarize Tamil Nadu groundwater data",
  "Show safe zones in Karnataka",
  "Water quality issues in Bihar",
  "Recharge potential of Madhya Pradesh",
  "Which states have the highest extraction?",
  "Net groundwater availability in Haryana",
  "How is Delhi's groundwater situation?",
  "Critical districts in Uttar Pradesh",
  "Groundwater recharge vs extraction in Telangana",
  "Top 5 over-exploited states in India",
  "Show me Andhra Pradesh district-wise data",
  "Is Jharkhand's groundwater safe?",
  "Environmental flow data for Kerala",
  "Domestic water allocation in Odisha",
  "Compare Gujarat and Rajasthan extraction",
  "Which UTs have safe groundwater?",
  "Irrigation extraction in West Bengal",
  "Stage of extraction in Chhattisgarh",
  "Industrial groundwater use in Maharashtra",
  "Future water availability in Punjab",
];

const SUGGESTION_ICONS = ["💧", "📊", "⚠️", "🔍", "🌊", "📈", "🗺️", "💡", "🏞️", "📉"];

const LOADING_MESSAGES = [
  "Consulting CGWB database...",
  "Analyzing aquifer telemetry...",
  "Mapping groundwater blocks...",
  "Extracting basin parameters...",
  "Cross-checking assessment units...",
  "Diving deep into the data...",
  "Locating recharge zones...",
  "Computing extraction ratios...",
];

const CHART_COLORS = [
  { main: '#00a8e8', dim: 'rgba(0,168,232,0.15)', glow: 'rgba(0,168,232,0.4)' },
  { main: '#f0dc3a', dim: 'rgba(240,220,58,0.15)', glow: 'rgba(240,220,58,0.4)' },
  { main: '#f5a623', dim: 'rgba(245,166,35,0.15)', glow: 'rgba(245,166,35,0.4)' },
  { main: '#e84040', dim: 'rgba(232,64,64,0.15)', glow: 'rgba(232,64,64,0.4)' },
  { main: '#7c3aed', dim: 'rgba(124,58,237,0.15)', glow: 'rgba(124,58,237,0.4)' },
  { main: '#10b981', dim: 'rgba(16,185,129,0.15)', glow: 'rgba(16,185,129,0.4)' },
];

const PIE_COLORS = CHART_COLORS.map(c => c.main);

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function getChatAIResponse(query, chatHistory = []) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        chatHistory: chatHistory.slice(-8).map(m => ({ role: m.role, text: m.text }))
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response from AI');
    }
    const result = await response.json();
    return { text: result.text, data: null };
  } catch (err) {
    console.error(err);
    return { text: `⚠️ **Connection Error**\n\n${err.message}\n\nPlease check your network connection and try again.`, data: null };
  }
}

// ─── Chart Components ─────────────────────────────────────────────────────────

function InteractiveChart({ chartConfig }) {
  const [activeType, setActiveType] = useState(chartConfig.type || 'bar');
  const [showDownload, setShowDownload] = useState(false);
  const chartRef = useRef(null);

  const datasets = useMemo(() =>
    chartConfig.datasets || [{ label: chartConfig.title || 'Data', data: chartConfig.data || [] }],
    [chartConfig]
  );

  const labels = chartConfig.labels || [];
  const isMultiSeries = datasets.length > 1;

  // Compatible type switches
  const compatibleTypes = useMemo(() => {
    const base = isMultiSeries
      ? ['bar', 'line', 'area']
      : ['bar', 'line', 'area', 'pie', 'doughnut'];
    return base;
  }, [isMultiSeries]);

  // Build Chart.js data
  const chartJsData = useMemo(() => ({
    labels,
    datasets: datasets.map((ds, i) => {
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const isPieType = activeType === 'pie' || activeType === 'doughnut';
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: isPieType
          ? PIE_COLORS.map(c => c + 'cc')
          : activeType === 'line'
            ? `${color.main}22`
            : `${color.main}cc`,
        borderColor: isPieType ? PIE_COLORS : color.main,
        borderWidth: isPieType ? 2 : activeType === 'line' ? 3 : 0,
        hoverBackgroundColor: isPieType ? PIE_COLORS : `${color.main}ff`,
        hoverOffset: isPieType ? 14 : 0,
        borderRadius: activeType === 'bar' ? 7 : 0,
        maxBarThickness: 80,
        fill: activeType === 'area',
        tension: 0.4,
        pointBackgroundColor: color.main,
        pointBorderColor: '#0a1830',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      };
    })
  }), [datasets, labels, activeType]);

  const chartJsOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 700,
      easing: 'easeInOutQuart',
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#c8d9e8',
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(8,18,40,0.95)',
        titleColor: '#00a8e8',
        bodyColor: '#c8d9e8',
        borderColor: 'rgba(0,168,232,0.3)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
        caretSize: 6,
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            const formatted = typeof val === 'number' && val > 999
              ? val.toLocaleString('en-IN')
              : val;
            return ` ${ctx.dataset.label || ctx.label}: ${formatted}`;
          }
        }
      }
    },
    scales: (activeType === 'bar' || activeType === 'line' || activeType === 'area') ? {
      y: {
        ticks: {
          color: '#5a7a9e',
          font: { family: "'JetBrains Mono', monospace", size: 11 },
          callback: (val) => val > 999 ? (val / 1000).toFixed(1) + 'k' : val,
        },
        grid: { color: 'rgba(0,168,232,0.06)', tickLength: 0 },
        border: { dash: [4, 4], display: false },
      },
      x: {
        ticks: {
          color: '#8aa4b8',
          font: { family: "'Inter', sans-serif", size: 11 },
          maxRotation: 35,
        },
        grid: { display: false },
        border: { display: false },
      }
    } : {}
  }), [activeType]);

  // Build Recharts data
  const rechartsData = useMemo(() =>
    labels.map((label, idx) => {
      const row = { name: label };
      datasets.forEach((ds, dsIdx) => {
        row[`val${dsIdx}`] = ds.data[idx] ?? 0;
      });
      return row;
    }),
    [labels, datasets]
  );

  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'rgba(8,18,40,0.97)', border: '1px solid rgba(0,168,232,0.3)',
        padding: '12px 16px', borderRadius: 10, backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 160
      }}>
        <p style={{ color: '#e8f2ff', margin: '0 0 10px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, fontFamily: "'Inter', sans-serif" }}>{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#a0b8d0', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block', boxShadow: `0 0 6px ${entry.color}88` }} />
              {entry.name}
            </span>
            <span style={{ color: entry.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
              {typeof entry.value === 'number' && entry.value > 999
                ? entry.value.toLocaleString('en-IN') : entry.value}
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
        const link = document.createElement('a');
        link.download = `${chartConfig.title || 'chart'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  const renderChart = () => {
    if (activeType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rechartsData} margin={{ top: 10, right: 24, left: -10, bottom: 14 }}>
            <defs>
              {datasets.map((_, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length].main;
                return (
                  <linearGradient key={idx} id={`grad${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill: '#6a8aae', fontSize: 11, fontFamily: "'Inter', sans-serif" }} tickLine={false} tickMargin={12} />
            <YAxis stroke="transparent" tick={{ fill: '#4a6a8e', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} tickMargin={8} tickFormatter={(v) => v > 999 ? (v / 1000).toFixed(1) + 'k' : v} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,168,232,0.18)', strokeWidth: 1, strokeDasharray: '5 5' }} />
            <RechartsLegend wrapperStyle={{ paddingTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#8aa4b8' }} iconType="circle" iconSize={8} />
            {datasets.map((ds, idx) => {
              const color = CHART_COLORS[idx % CHART_COLORS.length].main;
              return (
                <Area key={idx} type="monotone" dataKey={`val${idx}`} name={ds.label}
                  stroke={color} strokeWidth={2.5} fillOpacity={1}
                  fill={`url(#grad${idx})`}
                  activeDot={{ r: 7, fill: color, stroke: '#0a1830', strokeWidth: 2 }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (activeType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rechartsData} margin={{ top: 10, right: 24, left: -10, bottom: 14 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill: '#6a8aae', fontSize: 11, fontFamily: "'Inter', sans-serif" }} tickLine={false} tickMargin={12} />
            <YAxis stroke="transparent" tick={{ fill: '#4a6a8e', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} tickLine={false} tickMargin={8} tickFormatter={(v) => v > 999 ? (v / 1000).toFixed(1) + 'k' : v} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,168,232,0.18)', strokeWidth: 1, strokeDasharray: '5 5' }} />
            <RechartsLegend wrapperStyle={{ paddingTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#8aa4b8' }} iconType="circle" iconSize={8} />
            {datasets.map((ds, idx) => {
              const color = CHART_COLORS[idx % CHART_COLORS.length].main;
              return (
                <RechartsLine key={idx} type="monotone" dataKey={`val${idx}`} name={ds.label}
                  stroke={color} strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0a1830', stroke: color, strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: color, stroke: '#0a1830', strokeWidth: 2 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (activeType === 'pie') {
      return <Pie ref={chartRef} data={chartJsData} options={chartJsOptions} />;
    }
    if (activeType === 'doughnut') {
      return <Doughnut ref={chartRef} data={chartJsData} options={chartJsOptions} />;
    }
    if (activeType === 'radar') {
      return <Radar ref={chartRef} data={chartJsData} options={chartJsOptions} />;
    }
    // Default: bar
    return <Bar ref={chartRef} data={chartJsData} options={chartJsOptions} />;
  };

  const isPieOrDoughnut = activeType === 'pie' || activeType === 'doughnut';

  return (
    <div className="chart-card" style={{
      background: 'linear-gradient(145deg, rgba(8,20,44,0.8), rgba(5,14,30,0.95))',
      borderRadius: 16, padding: '20px 20px 16px', marginTop: 20, marginBottom: 8,
      border: '1px solid rgba(0,168,232,0.18)', position: 'relative',
      boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      overflow: 'hidden'
    }}>
      {/* Glow accent */}
      <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,168,232,0.4), transparent)', pointerEvents: 'none' }} />

      {/* Chart header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div style={{ flex: 1 }}>
          {chartConfig.title && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: '#e0eeff', letterSpacing: '0.01em', lineHeight: 1.3 }}>
              {chartConfig.title}
            </div>
          )}
          {chartConfig.subtitle && (
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#5a7a9e', marginTop: 3 }}>
              {chartConfig.subtitle}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Type switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            {compatibleTypes.map(t => (
              <button key={t} className={`chart-type-btn${activeType === t ? ' active' : ''}`}
                onClick={() => setActiveType(t)}
                title={`Switch to ${t} chart`}
                style={{ padding: '4px 8px', fontSize: '10px' }}
              >
                {t === 'bar' ? '▊▊' : t === 'line' ? '╱╲' : t === 'area' ? '▲▲' : t === 'pie' ? '◉' : t === 'doughnut' ? '◎' : '★'}
              </button>
            ))}
          </div>

          {/* Download btn (for chartjs charts) */}
          {(activeType === 'bar' || activeType === 'pie' || activeType === 'doughnut') && (
            <button
              onClick={handleDownload}
              title="Download chart"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#5a7a9e', fontSize: 11, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(0,168,232,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#5a7a9e'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              ↓
            </button>
          )}
        </div>
      </div>

      {/* Chart body */}
      <div style={{ height: isPieOrDoughnut ? 340 : 320, width: '100%' }}>
        {renderChart()}
      </div>

      {/* Dataset legend info */}
      {datasets.length > 1 && !isPieOrDoughnut && (
        <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
          {datasets.map((ds, idx) => {
            const color = CHART_COLORS[idx % CHART_COLORS.length].main;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8aa4b8', fontFamily: "'Inter', sans-serif" }}>
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

// ─── Metric Mini-Card ──────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, color, icon, trend }) {
  const clr = color || '#00a8e8';
  return (
    <div className="metric-card" style={{
      flex: '1 1 130px', background: `linear-gradient(135deg, ${clr}12, ${clr}06)`,
      border: `1px solid ${clr}30`, borderRadius: 12, padding: '14px 16px',
      textAlign: 'center', boxShadow: `0 4px 20px ${clr}10`
    }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>}
      <div style={{ fontSize: 22, fontWeight: 800, color: clr, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, color: `${clr}99`, marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11, color: '#6a8aae', marginTop: 5, fontFamily: "'Inter', sans-serif", lineHeight: 1.3 }}>{label}</div>
      {trend && (
        <div style={{ fontSize: 10, color: trend > 0 ? '#e84040' : '#10b981', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ─── Message Renderer ──────────────────────────────────────────────────────────

function AIMessage({ message, isStreaming, user, fmt }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse inline metric cards from special syntax: [[metric:label|value|unit|color|icon]]
  const MarkdownComponents = useMemo(() => ({
    a({ href, children, ...props }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid rgba(0,168,232,0.3)', transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.target.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.target.style.borderColor = 'rgba(0,168,232,0.3)'}
          {...props}>
          {children}
        </a>
      );
    },

    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const lang = match?.[1];

      // ── Chart block ──
      if (!inline && lang === 'chart') {
        try {
          const chartConfig = JSON.parse(String(children).trim());
          return <InteractiveChart chartConfig={chartConfig} />;
        } catch (e) {
          return (
            <div style={{ background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.2)', borderRadius: 10, padding: 14, margin: '12px 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ color: '#e84040', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Chart Render Error</div>
                <div style={{ color: '#8aa4b8', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{e.message}</div>
              </div>
            </div>
          );
        }
      }

      // ── Metrics block ──
      if (!inline && lang === 'metrics') {
        try {
          const items = JSON.parse(String(children).trim());
          return (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
              {items.map((item, i) => (
                <MetricCard key={i} {...item} />
              ))}
            </div>
          );
        } catch { return null; }
      }

      // ── Regular inline/block code ──
      if (inline) {
        return <code className={className} {...props}>{children}</code>;
      }
      return (
        <pre style={{ background: 'rgba(10,24,48,0.7)', border: '1px solid rgba(0,168,232,0.12)', borderRadius: 10, padding: 16, overflow: 'auto', margin: '12px 0', position: 'relative' }}>
          <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#c8d9e8', lineHeight: 1.6 }}>{children}</code>
        </pre>
      );
    },

    // Custom table with sticky header capability
    table({ children, ...props }) {
      return (
        <div style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.25)', border: '1px solid rgba(0,168,232,0.15)' }} {...props}>
            {children}
          </table>
        </div>
      );
    },

    blockquote({ children, ...props }) {
      return (
        <blockquote style={{ borderLeft: '3px solid var(--accent)', margin: '14px 0', padding: '10px 16px 10px 20px', background: 'linear-gradient(90deg, rgba(0,168,232,0.08), rgba(0,168,232,0.02))', borderRadius: '0 10px 10px 0', fontStyle: 'normal' }} {...props}>
          {children}
        </blockquote>
      );
    },

    h3({ children, ...props }) {
      return <h3 style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 700, margin: '22px 0 10px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(0,168,232,0.12)', paddingBottom: 6 }} {...props}>{children}</h3>;
    },
  }), []);

  return (
    <div style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'fadeUp 0.35s ease both' }}>
      {/* Avatar */}
      <div className="chat-avatar-ai" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,168,232,0.1)', border: '1px solid rgba(0,168,232,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <img src="/ingres.svg" alt="" style={{ width: 18 }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>AquaGuide AI</span>
            <span style={{ fontSize: 9, background: 'rgba(0,168,232,0.15)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 20, fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '0.04em', border: '1px solid rgba(0,168,232,0.2)' }}>CGWB 2024-25</span>
          </div>
          {message.text && (
            <button
              onClick={handleCopy}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: copied ? 'var(--accent)' : 'var(--muted)', fontSize: 10, fontFamily: "'Inter', sans-serif", transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => { if (!copied) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
              onMouseLeave={e => { if (!copied) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; } }}
            >
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`ai-markdown${isStreaming ? ' streaming-cursor' : ''}`}>
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={MarkdownComponents}
          >
            {message.text}
          </ReactMarkdown>
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", marginTop: 8, opacity: 0.6 }}>
          {fmt(message.ts)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Chatbot() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ districts: [], states: [] });

  const [suggestions, setSuggestions] = useState(() => pickRandom(SUGGESTION_POOL, 4));
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [streamingIdx, setStreamingIdx] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const activeSessionRef = useRef(null);

  // Auth + data load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { navigate("/login"); return; }
      setUser(u);
      try {
        const q = query(collection(db, "chat_sessions"), where("userId", "==", u.uid));
        const snapshot = await getDocs(q);
        const loaded = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setSessions(loaded);
      } catch (err) { console.error("Error loading sessions:", err); }
    });

    fetch(`${BACKEND_URL}/api/data`)
      .then(r => r.json())
      .then(d => setData(parseSummaryData(d)))
      .catch(console.error);

    return unsub;
  }, [navigate]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  // Loading text cycle
  useEffect(() => {
    if (!typing) return;
    const interval = setInterval(() => {
      setLoadingStep(s => {
        const next = (s + 1) % LOADING_MESSAGES.length;
        setLoadingText(LOADING_MESSAGES[next]);
        return next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [typing]);

  // Save sessions
  useEffect(() => {
    if (messages.length === 0 || !user) return;
    const serialized = messages.map(m => ({
      role: m.role, text: m.text, data: m.data || null,
      ts: m.ts instanceof Date ? m.ts.toISOString() : m.ts
    }));
    const title = (messages.find(m => m.role === "user")?.text || "New Chat").slice(0, 32);
    const sessionData = { userId: user.uid, title, messages: serialized, updatedAt: new Date().toISOString() };
    const currentId = activeSessionRef.current;

    if (currentId) {
      setSessions(prev => prev.map(s => s.id === currentId ? { ...s, ...sessionData } : s));
      setDoc(doc(db, "chat_sessions", currentId), sessionData, { merge: true }).catch(console.error);
    } else {
      const newId = Date.now().toString();
      activeSessionRef.current = newId;
      setActiveSessionId(newId);
      setSessions(prev => [{ id: newId, ...sessionData }, ...prev]);
      setDoc(doc(db, "chat_sessions", newId), sessionData).catch(console.error);
    }
  }, [messages]);

  const startNewChat = () => {
    activeSessionRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
    setSuggestions(pickRandom(SUGGESTION_POOL, 4));
  };

  const loadSession = (id) => {
    const s = sessions.find(s => s.id === id);
    if (s) {
      activeSessionRef.current = id;
      setActiveSessionId(id);
      setMessages(s.messages.map(m => ({ ...m, ts: new Date(m.ts) })));
    }
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) startNewChat();
    try { await deleteDoc(doc(db, "chat_sessions", id)); }
    catch (err) { console.error("Delete error:", err); }
  };

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || typing) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q, ts: new Date() }]);
    setLoadingText(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    setTyping(true);

    await new Promise(r => setTimeout(r, 700));
    const res = await getChatAIResponse(q, messages);
    setTyping(false);

    const fullText = res.text;
    const aiMsg = { role: "ai", text: "", data: res.data, ts: new Date() };
    setMessages(m => [...m, aiMsg]);
    setStreamingIdx(messages.length + 1);

    // Stream token-by-token
    const lines = fullText.split("\n");
    let accumulated = "";
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Flush table rows instantly
      if (line.trimStart().startsWith("|")) {
        let block = "";
        while (i < lines.length && lines[i].trimStart().startsWith("|")) {
          block += (block ? "\n" : "") + lines[i];
          i++;
        }
        accumulated += (accumulated ? "\n" : "") + block;
        setMessages(m => { const u = [...m]; u[u.length - 1] = { ...u[u.length - 1], text: accumulated }; return u; });
        await new Promise(r => setTimeout(r, 40));
        continue;
      }

      // Flush code blocks instantly
      if (line.trimStart().startsWith("```")) {
        let block = line;
        i++;
        while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
          block += "\n" + lines[i];
          i++;
        }
        if (i < lines.length) { block += "\n" + lines[i]; i++; }
        accumulated += (accumulated ? "\n" : "") + block;
        setMessages(m => { const u = [...m]; u[u.length - 1] = { ...u[u.length - 1], text: accumulated }; return u; });
        await new Promise(r => setTimeout(r, 80));
        continue;
      }

      // Word-by-word for normal text
      const words = line.split(/( )/);
      const prefix = accumulated ? accumulated + "\n" : "";
      let lineAccum = "";
      for (const word of words) {
        lineAccum += word;
        setMessages(m => { const u = [...m]; u[u.length - 1] = { ...u[u.length - 1], text: prefix + lineAccum }; return u; });
        const delay = /[.!?]$/.test(word) ? 38 : word === " " ? 8 : 15;
        await new Promise(r => setTimeout(r, delay));
      }
      accumulated = prefix + lineAccum;
      i++;
    }

    setStreamingIdx(-1);
  };

  const fmt = (d) => d instanceof Date ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden", fontFamily: "'Inter', var(--font-body), sans-serif" }}>

        {/* ═══ Sidebar ═══ */}
        <aside style={{ width: 260, background: "var(--bg2)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Logo header */}
          <div style={{ padding: "18px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/dashboard")}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: '0 4px', borderRadius: 6, transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              title="Back to dashboard"
            >←</button>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #0078d4, #00a8e8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(0,168,232,0.3)", cursor: "pointer", flexShrink: 0 }} onClick={() => navigate('/')}>
              <img src="/ingres.svg" alt="" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}>AquaGuide AI</div>
              <div style={{ fontSize: 9, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1.8s infinite" }} />
                ONLINE · CGWB 2024-25
              </div>
            </div>
            {/* Mobile close */}
            <button className="resp-hide-desktop" onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20 }}>✕</button>
          </div>

          {/* New chat button */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <button onClick={startNewChat}
              style={{ width: "100%", padding: "9px 14px", background: "linear-gradient(135deg, rgba(0,168,232,0.12), rgba(0,120,212,0.08))", border: "1px solid rgba(0,168,232,0.25)", borderRadius: 9, color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif", transition: "all 0.2s", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = "0 0 16px rgba(0,168,232,0.2)"; e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,168,232,0.18), rgba(0,120,212,0.12))"; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,168,232,0.12), rgba(0,120,212,0.08))"; }}
            >
              <span style={{ fontSize: 14 }}>+</span> New Chat
            </button>
          </div>

          {/* Session list */}
          <div style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
            {sessions.length > 0 ? (
              <>
                <div style={{ fontSize: 9, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, padding: '0 6px' }}>Recent Chats</div>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)}
                    className="nav-item"
                    style={{
                      padding: "9px 10px", marginBottom: 3,
                      background: activeSessionId === s.id ? "rgba(0,168,232,0.1)" : "transparent",
                      border: activeSessionId === s.id ? "1px solid rgba(0,168,232,0.25)" : "1px solid transparent",
                      borderRadius: 8, fontSize: 12,
                      color: activeSessionId === s.id ? "var(--text)" : "var(--muted)",
                      cursor: "pointer", transition: "all 0.2s",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Inter', sans-serif" }}>💬 {s.title}</span>
                    <button onClick={(e) => deleteSession(e, s.id)}
                      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: '2px 5px', borderRadius: 4, transition: 'color 0.15s, background 0.15s', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#e84040'; e.currentTarget.style.background = 'rgba(232,64,64,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'none'; }}
                    >×</button>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: "center", marginTop: 48, color: "var(--muted)", fontSize: 12, fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>💬</div>
                No chats yet.<br />Start a conversation!
              </div>
            )}
          </div>
        </aside>

        {/* ═══ Main Area ═══ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Groundwater Intelligence</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                CGWB FY 2024-25 · 713 assessment units · 36 States/UTs
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: 'center' }}>
              {[
                ["Safe", "#10b981"],
                ["Semi-Critical", "#f0dc3a"],
                ["Critical", "#f5a623"],
                ["Over-Exploited", "#e84040"]
              ].map(([s, c]) => (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: c, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block", boxShadow: `0 0 6px ${c}88` }} />
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {messages.length === 0 ? (
              /* ─ Welcome State ─ */
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", animation: "fadeUp 0.6s ease both" }}>
                <div style={{ position: "relative", marginBottom: 28 }}>
                  <div style={{ position: "absolute", inset: -16, background: "radial-gradient(circle, rgba(0,168,232,0.15) 0%, transparent 70%)", borderRadius: "50%", animation: "pulse 3s infinite" }} />
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(0,168,232,0.1)", border: "1px solid rgba(0,168,232,0.25)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
                    <img src="/ingres.svg" alt="" style={{ width: 36 }} />
                  </div>
                </div>

                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 12, color: "var(--text)", textAlign: "center", letterSpacing: '-0.03em' }}>
                  How can I help you today?
                </h2>
                <p style={{ color: "var(--muted)", maxWidth: 520, textAlign: "center", lineHeight: 1.7, marginBottom: 40, fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
                  Ask about groundwater status, extraction rates, critical zones, or water quality across{" "}
                  <strong style={{ color: 'var(--text)' }}>713+ districts</strong> and{" "}
                  <strong style={{ color: 'var(--text)' }}>36 states/UTs</strong> — powered by CGWB FY 2024-25 data.
                  I'll generate <strong style={{ color: 'var(--accent)' }}>interactive charts</strong> to visualize insights!
                </p>

                <div style={{ width: "100%", maxWidth: 740, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {suggestions.map((s, i) => (
                    <div key={s} className="suggestion-card" onClick={() => send(s)}
                      style={{ padding: "15px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
                      <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 17, marginTop: 1 }}>
                        {SUGGESTION_ICONS[i % SUGGESTION_ICONS.length]}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ─ Conversation ─ */
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 6, maxWidth: 960, margin: "0 auto", width: "100%" }}>
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  const isLastAI = !isUser && i === messages.length - 1;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginTop: i === 0 ? 0 : (isUser ? 18 : 6) }}>
                      {isUser ? (
                        /* User bubble */
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
                        /* AI message */
                        <AIMessage
                          message={m}
                          isStreaming={isLastAI && streamingIdx !== -1}
                          user={user}
                          fmt={fmt}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typing && (
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", animation: "fadeUp 0.3s ease both", marginTop: 8 }}>
                    <div className="chat-avatar-ai" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,168,232,0.1)", border: "1px solid rgba(0,168,232,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <img src="/ingres.svg" alt="" style={{ width: 18 }} />
                    </div>
                    <div style={{ paddingTop: 2 }}>
                      <div style={{ padding: "12px 20px", borderRadius: 14, background: "rgba(8,20,44,0.6)", border: "1px solid rgba(0,168,232,0.15)", display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(12px)" }}>
                        {/* Spinning loader */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1.2s linear infinite", flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="9" stroke="rgba(0,168,232,0.2)" strokeWidth="3" />
                          <path d="M12 3a9 9 0 019 9" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: "var(--muted)", backgroundImage: "linear-gradient(90deg, var(--muted) 0%, var(--accent) 50%, var(--muted) 100%)", backgroundSize: "300% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 2.5s linear infinite" }}>
                          {loadingText}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} style={{ height: 1 }} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{ padding: "0 20px 18px", background: "var(--bg)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            <div className="input-glass" style={{
              display: "flex", gap: 10, alignItems: "flex-end",
              background: "rgba(8,20,44,0.6)", border: "1px solid rgba(0,168,232,0.18)",
              borderRadius: 16, padding: "10px 10px 10px 18px",
              backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              marginTop: 14
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about groundwater in any state, district, or block…"
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", color: "var(--text)",
                  fontSize: 14, fontFamily: "'Inter', sans-serif", resize: "none", outline: "none",
                  lineHeight: 1.6, padding: "7px 0", maxHeight: 140, overflowY: "auto"
                }}
              />

              {/* Send button */}
              <button
                onClick={() => send()}
                disabled={!input.trim() || typing}
                style={{
                  width: 42, height: 42, borderRadius: 11,
                  background: input.trim() && !typing
                    ? "linear-gradient(135deg, #0057a0, #00a8e8)"
                    : "rgba(255,255,255,0.05)",
                  border: "none",
                  cursor: input.trim() && !typing ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.25s cubic-bezier(.22,1,.36,1)",
                  boxShadow: input.trim() && !typing ? "0 4px 18px rgba(0,168,232,0.3)" : "none",
                  color: input.trim() && !typing ? "#fff" : "var(--muted)",
                  flexShrink: 0
                }}
                onMouseEnter={e => { if (input.trim() && !typing) e.currentTarget.style.transform = "scale(1.08)"; }}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", textAlign: "center", marginTop: 9, opacity: 0.55, letterSpacing: '0.02em' }}>
              Powered by CGWB FY 2024-25 · Enter to send · Shift+Enter for new line · Charts auto-generated from data
            </div>
          </div>
        </div>
      </div>
    </>
  );
}