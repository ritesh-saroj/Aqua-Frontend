import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      if (u) setUser(u);
      else setUser(null);
    });
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard", path: "/dashboard" },
    { id: "chatbot",   icon: "💬", label: "AI Chatbot", path: "/chatbot" },
    { id: "maps",      icon: "🗺️", label: "Map View", path: "/maps" },
    { id: "data",      icon: "📊", label: "Data Explorer", path: "/data" },
    { id: "history",   icon: "🕐", label: "Chat History", path: "/history" },
  ];

  const currentPath = location.pathname;

  return (
    <>
      <style>{`
        .sidebar-nav-item:hover { background: var(--accent-dim)!important; color: var(--accent)!important; }
        .sidebar-nav-item.active { background: var(--accent-dim)!important; color: var(--accent)!important; border-right: 2px solid var(--accent)!important; }
        .sidebar-btn-logout:hover { background: rgba(232,64,64,0.15)!important; }
        .sidebar-container { width: 260px; flex-shrink: 0; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; height: 100vh; z-index: 1000; transition: background 0.35s, border-color 0.35s; }
      `}</style>

      {/* Hamburger button (visible on mobile via CSS) */}
      <button
        className="hamburger-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{ display: mobileOpen ? 'none' : '' }}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={() => setMobileOpen(false)}
        style={{ display: mobileOpen ? 'block' : 'none' }}
      />

      <aside className={`sidebar-container sidebar-desktop${mobileOpen ? ' mobile-open' : ''}`}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, transition: "border-color 0.35s", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 900, color: "var(--btn-text)", fontSize: 14, boxShadow: "0 0 16px var(--accent-glow)", cursor: "pointer", transition: "all 0.3s" }} onClick={() => navigate("/")}>
              <img src="/ingres.svg" alt="" />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text)", lineHeight: 1.2, transition: "color 0.35s" }}>AquaGuide</div>
              <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginTop: 2 }}>AI ASSISTANT</div>
            </div>
          </div>
          
          {/* Mobile close button */}
          <button 
            className="resp-hide-desktop"
            onClick={() => setMobileOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer', display: window.innerWidth <= 768 ? 'block' : 'none' }}
          >✕</button>
        </div>
        
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {navItems.map(n => {
            const isActive = currentPath.startsWith(n.path);
            return (
              <button key={n.id} onClick={() => navigate(n.path)} className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                  border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)", textAlign: "left",
                  transition: "all 0.2s", width: "100%", borderRight: "2px solid transparent"
                }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              </button>
            );
          })}
        </nav>
        
        <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)", flexShrink: 0, transition: "border-color 0.35s" }}>
          {/* Theme Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "8px 12px", background: "var(--accent-dim)", borderRadius: 8, border: "1px solid var(--border)", transition: "all 0.35s" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>Theme</span>
            <ThemeToggle />
          </div>

          {user && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--accent-dim)", borderRadius: 8, border: "1px solid var(--glass-border)", transition: "all 0.35s" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || "User"}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          )}
          <button onClick={handleLogout} className="sidebar-btn-logout"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "none",
              background: "rgba(232,64,64,0.08)", color: "#fca5a5", cursor: "pointer", fontSize: 12, fontWeight: 500,
              fontFamily: "var(--font-body)", width: "100%", transition: "all 0.2s"
            }}>
            ⎋ Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
