import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();
function getErrorMessage(code) {
  const map = { "auth/email-already-in-use":"This email is already registered.","auth/invalid-email":"Invalid email address.","auth/weak-password":"Password must be at least 6 characters.","auth/popup-closed-by-user":"Google sign-in cancelled.","auth/network-request-failed":"Network error." };
  return map[code] || "Something went wrong. Please try again.";
}

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh","Other"];
const OCCUPATIONS = ["Researcher / Scientist","Government Official","Farmer / Agriculturist","Student","NGO / Activist","Policy Maker","Engineer","Journalist","Other"];

const css = `
.step-indicator.active{background:var(--accent)!important;color:var(--btn-text)!important;}
.step-indicator.done{background:var(--accent-dim)!important;border-color:var(--accent)!important;color:var(--accent)!important;}
`;

const inputStyle = { width:"100%", padding:"11px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontSize:14, fontFamily:"var(--font-body)", transition:"all 0.2s", boxSizing:"border-box" };
const labelStyle = { display:"block", fontSize:11, fontWeight:600, color:"var(--muted)", marginBottom:6, fontFamily:"var(--font-mono)", letterSpacing:"0.06em", textTransform:"uppercase" };

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState(""); const [occupation, setOccupation] = useState("");
  const [showPw, setShowPw] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");

  useEffect(() => { const u = onAuthStateChanged(auth, u => { if (u) navigate("/dashboard"); }); return u; }, []);

  const handleStep1 = (e) => {
    e.preventDefault(); setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setStep(2);
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim()) await updateProfile(cred.user, { displayName: displayName.trim() });
      // Save extended profile to Firestore (if db is imported)
      try {
        const { getFirestore } = await import("firebase/firestore");
        const db = getFirestore();
        await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name: displayName.trim(), email, state, occupation, created_at: serverTimestamp() });
      } catch (e) { /* Firestore optional */ }
      navigate("/dashboard");
    } catch (err) { setError(getErrorMessage(err.code)); } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try { await signInWithPopup(auth, googleProvider); navigate("/dashboard"); }
    catch (err) { setError(getErrorMessage(err.code)); } finally { setLoading(false); }
  };

  return (
    <>
      <style>{css}</style>
      <div className="resp-flex-col" style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", overflowX:"hidden", position:"relative", transition:"background 0.35s" }}>
        {/* Left Panel */}
        <div className="auth-left-panel" style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, var(--bg2), var(--bg))" }} />
          <div style={{ position:"absolute", top:"15%", right:"10%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle, rgba(0,168,232,0.07) 0%, transparent 70%)", animation:"glow-pulse 4s ease-in-out infinite" }} />
          <div style={{ position:"absolute", top:"50%", left:"50%", width:280, height:280, marginLeft:-140, marginTop:-140, borderRadius:"50%", border:"1px solid rgba(0,168,232,0.06)", animation:"spin-slow 40s linear infinite", pointerEvents:"none" }}>
            <div style={{ position:"absolute", top:-3, left:"35%", width:6, height:6, borderRadius:"50%", background:"var(--accent)", boxShadow:"0 0 10px var(--accent)" }} />
          </div>
          <div style={{ position:"relative", zIndex:1, animation:"fadeUp 0.7s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:48 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg, var(--accent2), var(--accent))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, color:"var(--btn-text)", fontSize:17, boxShadow:"0 0 24px var(--accent-glow)" }}>
                <img src="/ingres.svg" alt="" />
              </div>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:20 }}>AquaGuide <em style={{ color:"var(--accent)" }}>AI</em></span>
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(32px,3.5vw,46px)", fontWeight:900, lineHeight:1.15, marginBottom:20 }}>
              Join the groundwater<br /><em style={{ color:"var(--accent)" }}>intelligence</em> network
            </h1>
            <p style={{ color:"var(--muted)", fontSize:15, lineHeight:1.7, maxWidth:380, fontWeight:300, marginBottom:36 }}>
              Access AI-powered insights on India's groundwater data. Built for researchers, policymakers, and citizens.
            </p>
            {/* Steps visual */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {[["01","Account Details","Name, email, and password"],["02","Your Profile","State and occupation for personalized data"]].map(([num,title,desc],i) => (
                <div key={num} style={{ display:"flex", gap:14, alignItems:"flex-start", opacity: step===i+1?1:0.45, transition:"opacity 0.3s" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background: step===i+1?"var(--accent)":"var(--accent-dim)", border:"1px solid var(--glass-border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color: step===i+1?"var(--btn-text)":"var(--accent)", fontFamily:"var(--font-mono)", flexShrink:0, transition:"all 0.3s" }}>{num}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:"var(--text)" }}>{title}</div>
                    <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-right-panel" style={{ width:500, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 48px", background:"var(--bg2)", borderLeft:"1px solid var(--border)", overflowY:"auto", transition:"background 0.35s, border-color 0.35s" }}>
          <div style={{ width:"100%", animation:"fadeUp 0.6s ease 0.15s both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28 }}>
              {[1,2].map(s => (
                <div key={s} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, fontFamily:"var(--font-mono)", transition:"all 0.3s", background: step>s?"var(--accent-dim)": step===s?"var(--accent)":"transparent", color: step>s?"var(--accent)":step===s?"var(--btn-text)":"var(--muted)", borderColor: step>=s?"var(--accent)":"var(--border)" }}>{step>s?"✓":s}</div>
                  <span style={{ fontSize:12, color: step===s?"var(--text)":"var(--muted)", fontFamily:"var(--font-mono)" }}>{["Account","Profile"][s-1]}</span>
                  {s<2 && <div style={{ width:24, height:1, background:"var(--border)", margin:"0 4px" }} />}
                </div>
              ))}
            </div>

            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, marginBottom:6 }}>{step===1?"Create account":"Your profile"}</h2>
            <p style={{ color:"var(--muted)", fontSize:13, marginBottom:24 }}>{step===1?"Fill in your details to get started":"Help us personalise your experience"}</p>

            {error && <div style={{ background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.25)", borderRadius:8, padding:"10px 14px", color:"#fca5a5", fontSize:13, marginBottom:16 }}>⚠ {error}</div>}

            {step === 1 ? (
              <form onSubmit={handleStep1}>
                <label style={labelStyle}>Display Name</label>
                <input className="auth-input" style={{ ...inputStyle, marginBottom:16 }} type="text" placeholder="Your full name" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
                <label style={labelStyle}>Email Address</label>
                <input className="auth-input" style={{ ...inputStyle, marginBottom:16 }} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
                <label style={labelStyle}>Password</label>
                <div style={{ position:"relative", marginBottom:16 }}>
                  <input className="auth-input" style={{ ...inputStyle, paddingRight:44 }} type={showPw?"text":"password"} placeholder="Min. 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required />
                  <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:14 }}>{showPw?"🙈":"👁️"}</button>
                </div>
                <label style={labelStyle}>Confirm Password</label>
                <input className="auth-input" style={{ ...inputStyle, marginBottom:24 }} type={showPw?"text":"password"} placeholder="Re-enter password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
                <button className="auth-btn-primary" style={{ width:"100%", padding:13, background:"var(--accent)", border:"none", borderRadius:10, color:"var(--btn-text)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", transition:"all 0.25s", boxShadow:"0 0 24px var(--accent-glow)", marginBottom:16 }} type="submit">
                  Continue →
                </button>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, color:"var(--muted)", fontSize:12 }}>
                  <div style={{ flex:1, height:1, background:"var(--border)" }} /><span style={{ fontFamily:"'DM Mono',monospace" }}>or</span><div style={{ flex:1, height:1, background:"var(--border)" }} />
                </div>
                <button className="auth-btn-ghost" onClick={handleGoogle} disabled={loading} style={{ width:"100%", padding:12, background:"rgba(255,255,255,0.03)", border:"1px solid var(--border)", borderRadius:10, color:"var(--text)", fontSize:14, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontFamily:"'DM Sans',sans-serif", transition:"all 0.25s", marginBottom:20 }}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Sign up with Google
                </button>
                <p style={{ textAlign:"center", fontSize:13, color:"var(--muted)" }}>
                  Already have an account?{" "}
                  <button onClick={()=>navigate("/login")} style={{ background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", textDecoration:"underline" }}>Sign in →</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <label style={labelStyle}>Your State / UT</label>
                <select className="auth-select" style={{ ...inputStyle, marginBottom:16, appearance:"none", cursor:"pointer" }} value={state} onChange={e=>setState(e.target.value)} required>
                <option value="" style={{ background:"var(--surface)" }}>Select your state</option>
                  {STATES.map(s => <option key={s} value={s} style={{ background:"var(--surface)" }}>{s}</option>)}
                </select>
                <label style={labelStyle}>Occupation</label>
                <select className="auth-select" style={{ ...inputStyle, marginBottom:28, appearance:"none", cursor:"pointer" }} value={occupation} onChange={e=>setOccupation(e.target.value)} required>
                <option value="" style={{ background:"var(--surface)" }}>Select your occupation</option>
                  {OCCUPATIONS.map(o => <option key={o} value={o} style={{ background:"var(--surface)" }}>{o}</option>)}
                </select>
                <div style={{ background:"var(--accent-dim)", border:"1px solid rgba(0,168,232,0.18)", borderRadius:10, padding:"12px 16px", marginBottom:24, fontSize:12, color:"var(--muted)" }}>
                  <span style={{ color:"var(--accent)", fontWeight:600 }}>ℹ Why we ask:</span> Your state and occupation help us surface the most relevant groundwater data for your region and use case.
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <button type="button" onClick={()=>{setStep(1);setError("");}} style={{ flex:1, padding:13, background:"transparent", border:"1px solid var(--border)", borderRadius:10, color:"var(--muted)", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.25s" }}>← Back</button>
                  <button className="auth-btn-primary" style={{ flex:2, padding:13, background:"var(--accent)", border:"none", borderRadius:10, color:"var(--btn-text)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", transition:"all 0.25s", boxShadow:"0 0 24px var(--accent-glow)" }} type="submit" disabled={loading}>
                    {loading ? "Creating account..." : "🚀 Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}