import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const googleProvider = new GoogleAuthProvider();
function getErrorMessage(code) {
  const map = { "auth/invalid-email":"Invalid email address.","auth/wrong-password":"Incorrect password.","auth/user-not-found":"No account found with this email.","auth/too-many-requests":"Too many attempts. Try again later.","auth/popup-closed-by-user":"Google sign-in cancelled.","auth/network-request-failed":"Network error." };
  return map[code] || "Something went wrong. Please try again.";
}

/* Page-specific styles only — global theme is in index.css */

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");

  useEffect(() => { const u = onAuthStateChanged(auth, u => { if (u) navigate("/dashboard"); }); return u; }, []);

  const clear = () => { setError(""); setSuccess(""); };

  const handleLogin = async (e) => {
    e.preventDefault(); clear(); setLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); navigate("/dashboard"); }
    catch (err) { setError(getErrorMessage(err.code)); } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    clear(); setLoading(true);
    try { await signInWithPopup(auth, googleProvider); navigate("/dashboard"); }
    catch (err) { setError(getErrorMessage(err.code)); } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault(); clear();
    if (!email) { setError("Enter your email address first."); return; }
    setLoading(true);
    try { await sendPasswordResetEmail(auth, email); setSuccess("Reset email sent! Check your inbox."); }
    catch (err) { setError(getErrorMessage(err.code)); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="resp-flex-col" style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", overflowX:"hidden", position:"relative", transition:"background 0.35s" }}>

        {/* Left decorative panel */}
        <div className="auth-left-panel" style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, var(--bg2) 0%, var(--bg) 100%)" }} />
          <div style={{ position:"absolute", top:"20%", left:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,168,232,0.07) 0%, transparent 70%)", animation:"glow-pulse 4s ease-in-out infinite" }} />
          <div style={{ position:"absolute", bottom:"15%", right:"5%", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,120,212,0.05) 0%, transparent 70%)", animation:"glow-pulse 5s ease-in-out infinite 1s" }} />
          {/* Orbiting ring */}
          <div style={{ position:"absolute", top:"50%", left:"50%", width:320, height:320, marginLeft:-160, marginTop:-160, borderRadius:"50%", border:"1px solid rgba(0,168,232,0.07)", animation:"spin-slow 40s linear infinite", pointerEvents:"none" }}>
            <div style={{ position:"absolute", top:-3, left:"40%", width:6, height:6, borderRadius:"50%", background:"var(--accent)", boxShadow:"0 0 10px var(--accent)" }} />
          </div>
          <div style={{ position:"relative", zIndex:1, animation:"fadeUp 0.8s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:48 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg, var(--accent2), var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"var(--bg)", fontSize:17, boxShadow:"0 0 24px var(--accent-glow)" }}>
                <img src="/ingres.svg" alt="" />
              </div>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:20, letterSpacing:"0.03em" }}>AquaGuide<em style={{ color:"var(--accent)" }}>AI</em></span>
            </div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(36px,4vw,52px)", fontWeight:900, lineHeight:1.1, marginBottom:20 }}>
              India's Groundwater<br /><em style={{ color:"var(--accent)" }}>Intelligence</em> Layer
            </h1>
            <p style={{ color:"var(--muted)", fontSize:16, lineHeight:1.7, maxWidth:400, fontWeight:300, marginBottom:40 }}>
              Query 7,000+ groundwater assessment blocks across India using plain English. Powered by CGWB data and AI.
            </p>
            <div style={{ display:"flex", gap:24 }}>
              {[["713+","Districts"],["36","States & UTs"],["CGWB","Verified Data"]].map(([v,l]) => (
                <div key={l}>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:22, color:"var(--accent)" }}>{v}</div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:2, fontFamily:"var(--font-mono)", letterSpacing:"0.04em" }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:48, display:"flex", gap:16, flexWrap:"wrap" }}>
              {["Safe","Semi-Critical","Critical","Over-Exploited"].map((s,i) => {
                const c = ["var(--accent)","#f0dc3a","#f5a623","#e84040"][i];
                return <span key={s} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontFamily:"var(--font-mono)", color:c, letterSpacing:"0.06em" }}><span style={{ width:6, height:6, borderRadius:"50%", background:c, display:"inline-block" }} />{s}</span>;
              })}
            </div>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="auth-right-panel" style={{ width:480, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 48px", background:"var(--bg2)", borderLeft:"1px solid var(--border)", transition:"background 0.35s, border-color 0.35s" }}>
          <div style={{ width:"100%", animation:"fadeUp 0.6s ease 0.15s both" }}>

            {mode === "reset" ? (
              <>
                <div style={{ marginBottom:32 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🔑</div>
                  <h2 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, marginBottom:6 }}>Reset Password</h2>
                  <p style={{ color:"var(--muted)", fontSize:14 }}>Enter your email and we'll send a reset link.</p>
                </div>
                {error && <div style={{ background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.25)", borderRadius:8, padding:"10px 14px", color:"#fca5a5", fontSize:13, marginBottom:16 }}>⚠ {error}</div>}
                {success && <div style={{ background:"rgba(0,168,232,0.1)", border:"1px solid rgba(0,168,232,0.2)", borderRadius:8, padding:"10px 14px", color:"var(--accent)", fontSize:13, marginBottom:16 }}>✓ {success}</div>}
                <form onSubmit={handleReset}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--muted)", marginBottom:6, fontFamily:"var(--font-mono)", letterSpacing:"0.06em", textTransform:"uppercase" }}>Email Address</label>
                  <input className="auth-input" style={{ width:"100%", padding:"12px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontSize:14, fontFamily:"var(--font-body)", marginBottom:20, transition:"all 0.2s", boxSizing:"border-box" }} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
                  <button className="auth-btn-primary" style={{ width:"100%", padding:13, background:"var(--accent)", border:"none", borderRadius:10, color:"var(--btn-text)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", transition:"all 0.25s", boxShadow:"0 0 24px var(--accent-glow)" }} type="submit" disabled={loading}>
                    {loading ? "Sending..." : "📧 Send Reset Email"}
                  </button>
                </form>
                <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:13, marginTop:16, display:"block", width:"100%", textAlign:"center", fontFamily:"var(--font-body)" }}>← Back to Sign In</button>
              </>
            ) : (
              <>
                <div style={{ marginBottom:32 }}>
                  <h2 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:700, marginBottom:6 }}>Welcome back</h2>
                  <p style={{ color:"var(--muted)", fontSize:14 }}>Sign in to continue to INGRES AI</p>
                </div>
                {error && <div style={{ background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.25)", borderRadius:8, padding:"10px 14px", color:"#fca5a5", fontSize:13, marginBottom:16 }}>⚠ {error}</div>}
                {success && <div style={{ background:"rgba(0,168,232,0.1)", border:"1px solid rgba(0,168,232,0.2)", borderRadius:8, padding:"10px 14px", color:"var(--accent)", fontSize:13, marginBottom:16 }}>✓ {success}</div>}
                <form onSubmit={handleLogin}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--muted)", marginBottom:6, fontFamily:"var(--font-mono)", letterSpacing:"0.06em", textTransform:"uppercase" }}>Email Address</label>
                  <input className="auth-input" style={{ width:"100%", padding:"12px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontSize:14, fontFamily:"var(--font-body)", marginBottom:16, transition:"all 0.2s", boxSizing:"border-box" }} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"var(--muted)", marginBottom:6, fontFamily:"var(--font-mono)", letterSpacing:"0.06em", textTransform:"uppercase" }}>Password</label>
                  <div style={{ position:"relative", marginBottom:8 }}>
                    <input className="auth-input" style={{ width:"100%", padding:"12px 44px 12px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontSize:14, fontFamily:"var(--font-body)", transition:"all 0.2s", boxSizing:"border-box" }} type={showPw?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
                    <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:15 }}>{showPw?"🙈":"👁️"}</button>
                  </div>
                  <button type="button" onClick={()=>{setMode("reset");clear();}} style={{ background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:12, fontFamily:"var(--font-mono)", display:"block", textAlign:"right", width:"100%", marginBottom:20, textDecoration:"underline" }}>Forgot password?</button>
                  <button className="auth-btn-primary" style={{ width:"100%", padding:13, background:"var(--accent)", border:"none", borderRadius:10, color:"var(--btn-text)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", transition:"all 0.25s", boxShadow:"0 0 24px var(--accent-glow)", marginBottom:16 }} type="submit" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, color:"var(--muted)", fontSize:12 }}>
                  <div style={{ flex:1, height:1, background:"var(--border)" }} /><span style={{ fontFamily:"var(--font-mono)" }}>or</span><div style={{ flex:1, height:1, background:"var(--border)" }} />
                </div>
                <button className="auth-btn-ghost" onClick={handleGoogle} disabled={loading} style={{ width:"100%", padding:"12px", background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontSize:14, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontFamily:"var(--font-body)", transition:"all 0.25s", marginBottom:24 }}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continue with Google
                </button>
                <p style={{ textAlign:"center", fontSize:13, color:"var(--muted)", fontFamily:"var(--font-body)" }}>
                  No account?{" "}
                  <button onClick={()=>navigate("/register")} style={{ background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"var(--font-body)", textDecoration:"underline" }}>Create one →</button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}