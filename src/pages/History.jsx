import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where,
  getDocs, deleteDoc, doc
} from "firebase/firestore";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* ─────────────────────────────────────────────────────────────
   NOTE: sorting is done CLIENT-SIDE so no composite index is
   needed in Firestore. Just enable Firestore in test mode.
───────────────────────────────────────────────────────────── */

const css = `

*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html, body { background:var(--bg); color:var(--text); font-family:var(--font-body); height:100%; }
::-webkit-scrollbar { width:3px; }
::-webkit-scrollbar-track { background:var(--bg); }
::-webkit-scrollbar-thumb { background:var(--accent2); border-radius:2px; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
@keyframes slideUp  { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
@keyframes toastIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulseDot { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
@keyframes spin     { to { transform:rotate(360deg); } }

/* ── Session cards ── */
.s-card {
  position:relative; border-radius:10px; padding:13px 40px 13px 14px;
  margin-bottom:7px; cursor:pointer;
  border:1px solid transparent; background:transparent;
  transition:all 0.18s;
}
.s-card:hover  { background:rgba(0,168,232,0.05); border-color:rgba(0,168,232,0.22); }
.s-card.active { background:rgba(0,168,232,0.09); border-color:rgba(0,168,232,0.38); }

/* per-card ✕ — hidden until hover */
.card-x {
  position:absolute; right:10px; top:50%; transform:translateY(-50%);
  background:none; border:none; cursor:pointer;
  width:24px; height:24px; border-radius:5px;
  display:flex; align-items:center; justify-content:center;
  font-size:17px; line-height:1;
  color:transparent; transition:all 0.15s;
}
.s-card:hover .card-x           { color:rgba(232,64,64,0.5); }
.card-x:hover                   { color:#e84040!important; background:rgba(232,64,64,0.12)!important; }

/* ── Search ── */
.srch {
  width:100%; padding:9px 32px 9px 32px;
  background:rgba(255,255,255,0.04); border:1px solid var(--border);
  border-radius:8px; color:var(--text); font-size:13px;
  font-family:var(--font-body); outline:none; transition:all 0.2s;
  box-sizing:border-box;
}
.srch:focus { border-color:rgba(0,168,232,0.35); box-shadow:0 0 0 3px rgba(0,168,232,0.07); }
.srch::placeholder { color:var(--muted); }

/* ── Buttons ── */
.btn-danger {
  padding:8px 14px; background:rgba(232,64,64,0.08);
  border:1px solid rgba(232,64,64,0.25); border-radius:8px;
  color:#e84040; font-size:12px; cursor:pointer;
  font-family:var(--font-body); font-weight:500; transition:all 0.2s;
}
.btn-danger:hover { background:#e84040; color:#fff; box-shadow:0 0 14px rgba(232,64,64,0.3); }

.btn-ghost {
  padding:8px 14px; background:var(--accent-dim);
  border:1px solid rgba(0,168,232,0.2); border-radius:8px;
  color:var(--accent); font-size:12px; cursor:pointer;
  font-family:var(--font-body); font-weight:500; transition:all 0.2s;
}
.btn-ghost:hover { box-shadow:0 0 14px var(--accent-glow); }

.btn-del-all {
  background:none; border:none; color:rgba(232,64,64,0.35);
  cursor:pointer; font-size:16px; padding:4px 5px;
  border-radius:5px; transition:color 0.2s; line-height:1;
}
.btn-del-all:hover { color:#e84040; }

/* ── Confirm modal ── */
.overlay {
  position:fixed; inset:0; background:rgba(3,16,13,0.82);
  backdrop-filter:blur(7px); z-index:200;
  display:flex; align-items:center; justify-content:center;
  animation:fadeIn 0.2s ease both;
}
.modal {
  background:var(--surface); border:1px solid rgba(232,64,64,0.3);
  border-radius:18px; padding:36px 30px; max-width:400px; width:92%;
  animation:slideUp 0.25s ease both;
  box-shadow:0 24px 80px rgba(0,0,0,0.5);
}

/* ── Toast ── */
.toast {
  position:fixed; bottom:26px; right:26px; z-index:300;
  padding:11px 18px; border-radius:10px; font-size:13px;
  font-family:var(--font-mono); display:flex; align-items:center; gap:8px;
  box-shadow:0 8px 32px rgba(0,0,0,0.35);
  animation:toastIn 0.3s ease both;
}
.toast.ok  { background:var(--surface); border:1px solid rgba(0,168,232,0.3); color:var(--accent); }
.toast.err { background:var(--surface); border:1px solid rgba(232,64,64,0.3);  color:#e84040; }

/* ── Sidebar Desktop ── */
.sidebar-desktop {
  transition:all 0.4s cubic-bezier(.22, 1, .36, 1);
}

@media (max-width: 768px) {
  .sidebar-desktop {
    position:fixed!important;
    left:-320px; top:0; bottom:0;
    z-index:999;
    box-shadow:24px 0 60px rgba(0,0,0,0.5);
  }
  .sidebar-desktop.mobile-open {
    left:0;
  }
}

/* ── Hamburger ── */
.hamburger-btn {
  display:none; transition:all 0.2s;
}
@media (max-width: 768px) {
  .hamburger-btn { display:flex; }
  .sidebar-desktop { width:280px!important; }
}

/* ── Markdown ── */
.ai-md p  { margin-bottom:10px; line-height:1.65; }
.ai-md ul, .ai-md ol { padding-left:20px; margin-bottom:10px; }
.ai-md li { margin-bottom:5px; }
.ai-md strong { color:var(--accent); }
.ai-md h1,.ai-md h2,.ai-md h3 { margin:14px 0 8px; color:var(--accent); font-family:var(--font-display); }
.ai-md table { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:13px; }
.ai-md th,.ai-md td { padding:9px 13px; border-bottom:1px solid var(--border); text-align:left; }
.ai-md th { background:rgba(0,168,232,0.08); color:var(--accent); font-size:11px;
            letter-spacing:0.05em; text-transform:uppercase; font-family:var(--font-mono); }
.ai-md tr:last-child td { border-bottom:none; }
.ai-md tr:hover td { background:rgba(0,168,232,0.04); }
`;

/* ── helpers ───────────────────────────────────────────────── */
const fmt = d =>
  d ? new Date(d).toLocaleString("en-IN", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "";

const fmtFull = d =>
  d ? new Date(d).toLocaleString("en-IN", { weekday:"short", year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "";

/* ── Confirm Modal ─────────────────────────────────────────── */
function ConfirmModal({ title, body, onConfirm, onCancel, loading }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:36, textAlign:"center", marginBottom:14 }}>🗑️</div>
        <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, textAlign:"center", color:"var(--text)", marginBottom:10 }}>{title}</h3>
        <p  style={{ fontSize:13, color:"var(--muted)", textAlign:"center", fontFamily:"var(--font-body)", lineHeight:1.65, marginBottom:28 }}>{body}</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex:1, padding:11, background:"transparent", border:"1px solid var(--border)", borderRadius:9, color:"var(--muted)", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"var(--font-body)" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex:1, padding:11, background:"rgba(232,64,64,0.12)", border:"1px solid rgba(232,64,64,0.35)", borderRadius:9, color:"#e84040", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
            onMouseEnter={e=>{ if(!loading){e.currentTarget.style.background="#e84040"; e.currentTarget.style.color="#fff"; }}}
            onMouseLeave={e=>{ e.currentTarget.style.background="rgba(232,64,64,0.12)"; e.currentTarget.style.color="#e84040"; }}>
            {loading
              ? <span style={{ width:14, height:14, border:"2px solid #e84040", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
              : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
export default function History() {
  const navigate = useNavigate();

  const [user,    setUser]    = useState(null);
  const [sessions,setSessions]= useState([]);
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState(null);
  const [search,  setSearch]  = useState("");

  // modal: null | { type:"one"|"all", id? }
  const [modal,    setModal]    = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast,    setToast]    = useState(null); // { msg, kind }
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* ── Load sessions ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { navigate("/login"); return; }
      setUser(u);
      try {
        // Simple query — no composite index needed, sort client-side
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

  /* ── Toast helper ── */
  const showToast = (msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Delete one ── */
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

  /* ── Delete all ── */
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

  /* ── Filtered list ── */
  const filtered = sessions.filter(s =>
    !search ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.messages?.some(m => m.text?.toLowerCase().includes(search.toLowerCase()))
  );

  /* ── Render ── */
  return (
    <>
      <style>{css}</style>
      <div style={{ display:"flex", height:"100vh", background:"var(--bg)", overflow:"hidden" }}>
        
        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div 
            onClick={() => setMobileSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998, backdropFilter: "blur(4px)" }}
          />
        )}

        {/* ── SIDEBAR ─────────────────────────────────────── */}
        <aside className={`sidebar-desktop${mobileSidebarOpen ? ' mobile-open' : ''}`} style={{ width:320, background:"var(--bg2)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", flexShrink:0 }}>

          {/* Header */}
          <div style={{ padding:"16px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>navigate("/dashboard")}
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--muted)", cursor:"pointer", fontSize:15, padding:"5px 10px", borderRadius:7, transition:"all 0.2s" }}
              onMouseEnter={e=>{e.currentTarget.style.color="var(--text)"; e.currentTarget.style.borderColor="rgba(0,168,232,0.25)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="var(--muted)"; e.currentTarget.style.borderColor="var(--border)";}}>
              ←
            </button>
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#0078d4,#00a8e8)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"var(--btn-text)", fontSize:13, boxShadow:"0 0 14px rgba(0,168,232,0.2)", flexShrink:0 }}>AQ</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:14, fontFamily:"var(--font-display)" }}>Chat History</div>
              <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>
                {loading ? "Loading…" : `${sessions.length} session${sessions.length!==1?"s":""}`}
              </div>
            </div>
            {!loading && sessions.length > 0 && (
              <button className="btn-del-all" title="Delete all" onClick={()=>setModal({type:"all"})}>🗑</button>
            )}
          </div>

          {/* Search */}
          <div style={{ padding:"12px 13px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ position:"relative" }}>
              <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input className="srch" type="text" placeholder="Search chats…"
                value={search} onChange={e=>setSearch(e.target.value)} />
              {search && (
                <button onClick={()=>setSearch("")}
                  style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:16, lineHeight:1, padding:2 }}>
                  ×
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ flex:1, overflowY:"auto", padding:"10px 10px" }}>
            {loading ? (
              /* skeleton */
              Array(4).fill(0).map((_,i)=>(
                <div key={i} style={{ borderRadius:10, padding:"13px 14px", marginBottom:7, background:"var(--surface)", border:"1px solid var(--border)" }}>
                  <div style={{ height:13, width:"65%", background:"rgba(0,168,232,0.07)", borderRadius:4, marginBottom:9 }} />
                  <div style={{ height:10, width:"40%", background:"rgba(0,168,232,0.04)", borderRadius:4 }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 16px" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>💬</div>
                <div style={{ color:"var(--text)", fontSize:13, fontWeight:600, marginBottom:6 }}>
                  {search ? "No results" : "No history yet"}
                </div>
                <div style={{ color:"var(--muted)", fontSize:12, fontFamily:"var(--font-mono)", lineHeight:1.6 }}>
                  {search ? `Nothing matching "${search}"` : "Your chats will appear here after you start a conversation."}
                </div>
                {!search && (
                  <button onClick={()=>navigate("/chatbot")}
                    style={{ marginTop:14, padding:"8px 18px", background:"var(--accent-dim)", border:"1px solid rgba(0,168,232,0.2)", borderRadius:8, color:"var(--accent)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-body)" }}>
                    Open Chatbot →
                  </button>
                )}
              </div>
            ) : (
              filtered.map((s, idx) => {
                const isActive  = selected?.id === s.id;
                const userMsgs  = s.messages?.filter(m=>m.role==="user") || [];
                const lastQuery = userMsgs[userMsgs.length-1]?.text || "";
                return (
                  <div key={s.id} className={`s-card${isActive?" active":""}`}
                    onClick={()=>setSelected(s)}
                    style={{ animation:`fadeUp 0.3s ease ${idx*0.04}s both` }}>

                    <div style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:700, color:isActive?"var(--accent)":"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>
                      {s.title || "Untitled Chat"}
                    </div>

                    {lastQuery && (
                      <div style={{ fontSize:11, color:"var(--muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"var(--font-body)", marginBottom:5 }}>
                        {lastQuery}
                      </div>
                    )}

                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>{fmt(s.updatedAt)}</span>
                      <span style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>{s.messages?.length||0} msgs</span>
                    </div>

                    {/* Per-card delete ✕ */}
                    <button className="card-x"
                      onClick={e=>{ e.stopPropagation(); setModal({type:"one", id:s.id}); }}
                      title="Delete session">
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {!loading && (
            <div style={{ padding:"12px 13px", borderTop:"1px solid var(--border)" }}>
              <button onClick={()=>navigate("/chatbot")}
                style={{ width:"100%", padding:"10px", background:"var(--accent-dim)", border:"1px solid rgba(0,168,232,0.2)", borderRadius:8, color:"var(--accent)", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"var(--font-body)", transition:"box-shadow 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 0 14px var(--accent-glow)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                + New Chat
              </button>
            </div>
          )}
        </aside>

        {/* ── TRANSCRIPT VIEW ──────────────────────────────── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:"var(--bg)", minWidth:0 }}>
          {selected ? (
            <>
              {/* Transcript header */}
              <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", background:"var(--bg2)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:14, flexShrink:0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                  <button 
                    className="hamburger-btn" 
                    onClick={() => setMobileSidebarOpen(true)}
                    style={{ background: "none", border: "none", color: "var(--text)", fontSize: 20, cursor: "pointer", padding: 0 }}
                  >
                    ☰
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontFamily:"var(--font-display)", margin:0, fontSize:17, color:"var(--accent)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {selected.title || "Untitled Chat"}
                    </h2>
                    <div style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", marginTop:4, display:"flex", gap:14 }}>
                      <span>🕐 {fmtFull(selected.updatedAt)}</span>
                      <span>💬 {selected.messages?.length||0} messages</span>
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <button className="btn-ghost" onClick={()=>navigate("/chatbot")}>💬 Continue</button>
                  <button className="btn-danger" onClick={e=>{ e.stopPropagation(); setModal({type:"one",id:selected.id}); }}>🗑 Delete</button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:"auto", padding:"26px 30px", display:"flex", flexDirection:"column", gap:18 }}>
                {selected.messages?.map((m, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>

                    {m.role==="ai" && (
                      <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#0078d4,#00a8e8)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"var(--btn-text)", fontSize:12, marginRight:12, flexShrink:0, boxShadow:"0 0 12px rgba(0,168,232,0.2)", alignSelf:"flex-start", marginTop:18 }}>
                        AQ
                      </div>
                    )}

                    <div style={{ maxWidth:"76%" }}>
                      <div style={{ fontSize:10, color:"var(--muted)", fontFamily:"var(--font-mono)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5, textAlign:m.role==="user"?"right":"left" }}>
                        {m.role==="user" ? "You" : "AquaGuide AI"} · {fmt(m.ts)}
                      </div>
                      <div style={{ padding:"13px 17px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"rgba(0,168,232,0.08)":"var(--surface)", border:m.role==="user"?"1px solid rgba(0,168,232,0.22)":"1px solid var(--border)", color:"var(--text)", fontSize:14, lineHeight:1.65 }}>
                        {m.role==="user" ? (
                          <div style={{ fontWeight:500 }}>{m.text}</div>
                        ) : (
                          <div className="ai-md">
                            <ReactMarkdown
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                code({ inline, className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  if (!inline && match && match[1] === "chart") {
                                    try {
                                      // Clean up common quirks in LLM-generated JSON
                                      const jsonStr = String(children).trim().replace(/\n/g, "").replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
                                      const chartConfig = JSON.parse(jsonStr);
                                      const chartData = {
                                        labels: chartConfig.labels,
                                        datasets: [{
                                          label: chartConfig.title || "Data",
                                          data: chartConfig.data,
                                          backgroundColor: [
                                            "rgba(0,168,232,0.85)",
                                            "rgba(240,220,58,0.85)",
                                            "rgba(245,166,35,0.85)",
                                            "rgba(232,64,64,0.85)",
                                            "rgba(0,120,212,0.85)",
                                            "rgba(90,119,138,0.85)",
                                          ],
                                          hoverBackgroundColor: ["var(--accent)","#f0dc3a","#f5a623","#e84040","var(--accent2)","#7888a8"],
                                          borderColor: "var(--surface)",
                                          borderWidth: 2,
                                          hoverOffset:   chartConfig.type === "pie" ? 12 : 0,
                                          borderRadius:  chartConfig.type === "bar" ? 6  : 0,
                                        }],
                                      };
                                      const options = {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        animation: { animateScale:true, animateRotate:true, duration:800 },
                                        plugins: {
                                          legend: {
                                            position: "bottom",
                                            labels: { color:"var(--text)", padding:16, font:{ family:"'DM Sans',sans-serif", size:12 }, usePointStyle:true, pointStyle:"circle" },
                                          },
                                          title: {
                                            display: !!chartConfig.title,
                                            text: chartConfig.title,
                                            color: "var(--accent)",
                                            font: { family:"'Playfair Display',serif", size:16, weight:"bold" },
                                            padding: { bottom:20 },
                                          },
                                          tooltip: {
                                            backgroundColor: "var(--surface-glass)",
                                            titleColor: "var(--accent)",
                                            bodyColor:  "var(--text)",
                                            borderColor:"var(--border)",
                                            borderWidth:1,
                                            padding:12,
                                            cornerRadius:8,
                                            displayColors:true,
                                            boxPadding:6,
                                            callbacks: {
                                              label(context) {
                                                return ` ${context.label || ""}: ${context.raw || 0}`;
                                              },
                                            },
                                          },
                                        },
                                        scales: chartConfig.type === "bar" ? {
                                          y: { ticks:{ color:"var(--muted)", font:{ family:"'DM Mono',monospace" } }, grid:{ color:"rgba(0,168,232,0.05)", tickLength:0 }, border:{ dash:[4,4], display:false } },
                                          x: { ticks:{ color:"var(--text)", font:{ family:"'DM Sans',sans-serif" } }, grid:{ display:false } },
                                        } : {},
                                      };
                                      return (
                                        <div style={{ background:"var(--bg2)", borderRadius:16, padding:"20px", marginTop:24, marginBottom:24, border:"1px solid var(--border)", width:"100%", height: chartConfig.type==="pie" ? "380px" : "320px", boxShadow:"0 8px 32px rgba(0,0,0,0.15)", transition:"transform 0.3s" }}
                                          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.01)"}
                                          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                                          {chartConfig.type === "pie"
                                            ? <Pie  data={chartData} options={options} />
                                            : <Bar  data={chartData} options={options} />}
                                        </div>
                                      );
                                    } catch {
                                      return <code>{children}</code>;
                                    }
                                  }
                                  return <code className={className} {...props}>{children}</code>;
                                },
                              }}
                            >
                              {m.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>

                    {m.role==="user" && (
                      <div style={{ width:32, height:32, borderRadius:9, background:"rgba(0,168,232,0.12)", border:"1px solid rgba(0,168,232,0.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)", fontSize:14, marginLeft:12, flexShrink:0, alignSelf:"flex-start", marginTop:18 }}>
                        {(user?.displayName||user?.email||"U")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Empty state */
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--muted)", animation:"fadeUp 0.4s ease both" }}>
              <div style={{ width:66, height:66, borderRadius:16, background:"var(--surface)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18, boxShadow:"0 0 32px rgba(0,168,232,0.06)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:20, margin:0, color:"var(--text)" }}>
                {loading ? "Loading…" : sessions.length===0 ? "No history yet" : "Select a session"}
              </h3>
              <p style={{ fontSize:13, marginTop:8, fontFamily:"var(--font-mono)", textAlign:"center", lineHeight:1.7, maxWidth:300 }}>
                {sessions.length===0
                  ? "Your AquaGuide AI conversations will appear here."
                  : "Pick a session from the sidebar to read the transcript."}
              </p>
              {sessions.length===0 && !loading && (
                <button onClick={()=>navigate("/chatbot")}
                  style={{ marginTop:18, padding:"10px 22px", background:"var(--accent)", border:"none", borderRadius:10, color:"var(--btn-text)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", boxShadow:"0 0 24px rgba(0,168,232,0.3)", transition:"all 0.25s" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(0,168,232,0.35)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 0 24px rgba(0,168,232,0.3)";}}>
                  💬 Start Chatting
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── CONFIRM MODAL ────────────────────────────────── */}
        {modal?.type==="one" && (
          <ConfirmModal
            title="Delete this session?"
            body="This will permanently remove the conversation and all its messages. This cannot be undone."
            onConfirm={doDeleteOne}
            onCancel={()=>!deleting && setModal(null)}
            loading={deleting}
          />
        )}
        {modal?.type==="all" && (
          <ConfirmModal
            title={`Delete all ${sessions.length} sessions?`}
            body="This will permanently erase your entire chat history. There is no way to recover these conversations."
            onConfirm={doDeleteAll}
            onCancel={()=>!deleting && setModal(null)}
            loading={deleting}
          />
        )}

        {/* ── TOAST ────────────────────────────────────────── */}
        {toast && (
          <div className={`toast ${toast.kind}`}>
            {toast.kind==="ok" ? "✓" : "✕"} {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}