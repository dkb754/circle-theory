// src/App.jsx
// Replace your entire src/App.jsx with this file

import { useState, useEffect } from "react";

const SC = {
  normal:   { stroke:"#C9A84C", lCol:"#e4c97e", sCol:"#C9A84C", aBg:"rgba(201,168,76,0.1)",  aCol:"#C9A84C", border:"#C9A84C", dot:"#C9A84C", dotB:"#e4c97e", badge:null },
  elevated: { stroke:"#d47a0a", lCol:"#e8953a", sCol:"#d47a0a", aBg:"rgba(212,122,10,0.1)",  aCol:"#d47a0a", border:"#d47a0a", dot:"#d47a0a", dotB:"#e8953a", badge:"⚠ Elevated" },
  pressure: { stroke:"#c0392b", lCol:"#e07070", sCol:"#c0392b", aBg:"rgba(192,57,43,0.12)",  aCol:"#e07070", border:"#c0392b", dot:"#c0392b", dotB:"#e07070", badge:"⚠ Pressure" },
};

const RADII          = [54, 90, 130, 170, 210];
const DEF_FILLS      = ["#C9A84C","#2a1e0e","#1c1408","#110c06","#0a0705"];
const DEF_STROKES    = ["#e4c97e","#a87838","#7a5828","#3D2E10","#1e1608"];
const DEF_LABELS     = ["ZIP CODE","REGION","STATE","NATION","WORLD"];
const DEF_ACTIONS    = ["ACT","ENGAGE","MONITOR","TRACK","AWARE"];
const DEF_LCOLORS    = ["#e4c97e","#c49a5a","#9e7844","#5a3810","#3d2e10"];
const DEF_SCOLORS    = ["#C9A84C","#a87838","#7a5828","#3D2E10","#1e1608"];
const LABEL_Y        = [166, 129, 92, 54, 17];
const NAMES_DEFAULT  = ["The Zip Code","The Region","The State","The Nation","The World"];

export default function App() {
  const [zip, setZip]         = useState("23831");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const s = document.createElement("style");
    s.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #07070a; }
      @keyframes fadeIn  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes ringIn  { from{stroke-dashoffset:1500;opacity:0} to{stroke-dashoffset:0;opacity:1} }
      @keyframes hotPulse{ 0%,100%{opacity:0.15} 50%{opacity:0.65} }
      @keyframes beat    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
      @keyframes orbitCW { to{transform:rotate(360deg)} }
      @keyframes orbitCC { to{transform:rotate(-360deg)} }
    `;
    document.head.appendChild(s);
  }, []);

  const run = async () => {
    if (!/^\d{5}$/.test(zip)) { setError("Please enter a valid 5-digit ZIP code."); return; }
    setLoading(true); setError(null); setResult(null);

    try {
      // ── Calls the Netlify function, not Anthropic directly ──
      const res = await fetch("/.netlify/functions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Request failed");

      const raw = (d.content?.find(b => b.type === "text")?.text || "").trim();
      const clean = raw.replace(/^```(?:json)?/,"").replace(/```$/,"").trim();
      const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
      if (start === -1) throw new Error("No JSON in response");
      setResult(JSON.parse(clean.slice(start, end + 1)));
    } catch(e) {
      setError("Analysis failed: " + e.message);
      console.error(e);
    } finally { setLoading(false); }
  };

  const circ = (n) => result?.circles?.find(x => x.number === n);
  const cfg  = (n) => SC[circ(n)?.status] || SC.normal;
  const hasCompression = result?.circles?.some(x => x.status !== "normal");
  const overBorder = { compressed:"#c0392b", elevated:"#d47a0a", normal:"#7a6230" }[result?.overallStatus] || "#7a6230";

  return (
    <div style={{ background:"#07070a", color:"#F5F0E8", fontFamily:"'DM Sans',sans-serif",
                  minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center",
                  padding:"32px 16px 64px" }}>

      {/* ── HEADER ── */}
      <div style={{ textAlign:"center", marginBottom:"22px", animation:"fadeIn 0.7s ease both" }}>
        <div style={{ fontSize:"9.5px", fontWeight:500, letterSpacing:"0.32em",
                      textTransform:"uppercase", color:"#4a4030", marginBottom:"6px" }}>
          A Personal Philosophy of Intentional Attention
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(30px,5.5vw,56px)",
                     letterSpacing:"0.06em", lineHeight:1, marginBottom:"5px" }}>
          The Concentric <span style={{ color:"#C9A84C" }}>Circle Theory</span>
        </h1>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                      fontSize:"13px", color:"#3a3a3a" }}>
          Know your rings. Protect your energy. Serve your zip code.
        </div>
      </div>

      {/* ── INPUT ── */}
      <div style={{ display:"flex", gap:"8px", width:"100%", maxWidth:"420px",
                    marginBottom:"22px", animation:"fadeIn 0.7s ease 0.1s both" }}>
        <input
          value={zip}
          onChange={e => { setZip(e.target.value.replace(/\D/g,"").slice(0,5)); setError(null); }}
          onKeyDown={e => e.key === "Enter" && run()}
          placeholder="Enter any U.S. ZIP code"
          maxLength={5}
          style={{ flex:1, background:"#0f0f12", border:"1px solid #222", color:"#F5F0E8",
                   fontFamily:"'DM Sans',sans-serif", fontSize:"16px", padding:"11px 16px",
                   borderRadius:"5px", outline:"none", letterSpacing:"0.08em", transition:"border-color 0.2s" }}
          onFocus={e => e.target.style.borderColor = "#C9A84C"}
          onBlur={e  => e.target.style.borderColor = "#222"}
        />
        <button
          onClick={run}
          disabled={loading}
          style={{ background: loading ? "#151515" : "#C9A84C",
                   color: loading ? "#444" : "#07070a",
                   border:"none", padding:"11px 20px", borderRadius:"5px",
                   cursor: loading ? "not-allowed" : "pointer",
                   fontFamily:"'Bebas Neue',sans-serif", fontSize:"15px",
                   letterSpacing:"0.14em", whiteSpace:"nowrap", transition:"background 0.2s" }}>
          {loading ? "ANALYZING…" : "ANALYZE"}
        </button>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ width:"100%", maxWidth:"420px", background:"rgba(192,57,43,0.08)",
                      border:"1px solid rgba(192,57,43,0.28)", borderRadius:"5px",
                      padding:"10px 14px", fontSize:"12px", color:"#e07070", marginBottom:"16px" }}>
          {error}
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                      gap:"18px", padding:"50px 0", animation:"fadeIn 0.5s ease both" }}>
          <svg width="110" height="110" viewBox="0 0 110 110">
            {[46,36,26,16,6].map((r,i) => (
              <circle key={i} cx="55" cy="55" r={r} fill="none"
                stroke={["#C9A84C","#a87838","#7a5828","#4a3418","#2a1a08"][i]}
                strokeWidth={i === 0 ? 2 : 1.5}
                strokeDasharray={`${r * 0.55} ${r * 0.1}`}
                style={{ transformBox:"fill-box", transformOrigin:"center",
                         animation:`${i%2===0?"orbitCW":"orbitCC"} ${1.4+i*0.22}s linear infinite` }}
              />
            ))}
          </svg>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                        fontSize:"14px", color:"#4a4a4a" }}>
            Mapping circles for {zip}…
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && !loading && (() => {
        const loc = result.location;
        return (
          <>
            {/* Location Banner */}
            <div style={{ textAlign:"center", marginBottom:"20px", animation:"fadeIn 0.6s ease both" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif",
                            fontSize:"clamp(20px,3.5vw,32px)", letterSpacing:"0.08em", color:"#C9A84C" }}>
                {loc.city}, {loc.stateAbbr}
              </div>
              <div style={{ fontSize:"9.5px", fontWeight:500, letterSpacing:"0.2em",
                            textTransform:"uppercase", color:"#3a3a3a", marginTop:"3px" }}>
                {loc.county} · {loc.region} · ZIP {zip}
              </div>
            </div>

            {/* Compression Alert */}
            {hasCompression && (
              <div style={{
                width:"100%", maxWidth:"1100px",
                background:"linear-gradient(90deg,rgba(192,57,43,0.13),rgba(192,57,43,0.05),rgba(192,57,43,0.13))",
                border:"1px solid rgba(192,57,43,0.35)", borderRadius:"5px",
                padding:"10px 16px", marginBottom:"22px",
                display:"flex", alignItems:"flex-start", gap:"10px",
                animation:"fadeIn 0.6s ease both"
              }}>
                <span style={{ flexShrink:0, paddingTop:2, fontSize:"14px" }}>⚠</span>
                <div>
                  <div style={{ fontSize:"9px", fontWeight:600, letterSpacing:"0.22em",
                                textTransform:"uppercase", color:"#f08080", marginBottom:"3px" }}>
                    Compression Event — {loc.city}, {loc.stateAbbr}
                  </div>
                  <div style={{ fontSize:"11.5px", color:"#906060", lineHeight:1.55 }}>
                    {(result.compressionEvents || []).join(" · ") || "Outer-ring forces are bleeding into inner-circle realities."}
                  </div>
                </div>
              </div>
            )}

            {/* Main: Diagram + Legend */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:"44px",
                          maxWidth:"1100px", width:"100%",
                          flexWrap:"wrap", justifyContent:"center" }}>

              {/* ── SVG DIAGRAM ── */}
              <div style={{ flexShrink:0, animation:"fadeIn 0.7s ease 0.1s both" }}>
                <svg viewBox="-12 -12 484 484"
                  style={{ width:"min(450px, 88vw)", height:"min(450px, 88vw)",
                           filter:"drop-shadow(0 0 44px rgba(201,168,76,0.1))",
                           overflow:"visible" }}>
                  <defs>
                    <radialGradient id="bgGrd" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#140e04"/>
                      <stop offset="100%" stopColor="#07070a"/>
                    </radialGradient>
                    <radialGradient id="glowG" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.22"/>
                      <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
                    </radialGradient>
                  </defs>

                  <circle cx="230" cy="230" r="230" fill="url(#bgGrd)"/>

                  {[5,4,3,2,1].map(n => {
                    const r      = RADII[n-1];
                    const status = circ(n)?.status || "normal";
                    const hot    = status !== "normal";
                    const stroke = result ? cfg(n).stroke : DEF_STROKES[n-1];
                    const fill   = n === 1 ? "#C9A84C" : DEF_FILLS[n-1];
                    const delay  = (5-n) * 0.11;
                    return (
                      <g key={n}>
                        <circle cx="230" cy="230" r={r}
                          fill={fill} stroke={stroke}
                          strokeWidth={n === 1 ? 2.5 : 1.8}
                          strokeDasharray={1500}
                          style={{ animation:`ringIn 1.4s cubic-bezier(0.4,0,0.2,1) ${delay}s both` }}
                        />
                        {hot && n > 1 && (
                          <circle cx="230" cy="230" r={r}
                            fill="none" stroke={stroke}
                            strokeWidth={status === "pressure" ? 3 : 2}
                            style={{ animation:"hotPulse 3s ease-in-out infinite" }}
                          />
                        )}
                      </g>
                    );
                  })}

                  <circle cx="230" cy="230" r="74" fill="url(#glowG)"/>

                  <g style={{ transformBox:"fill-box", transformOrigin:"center",
                               animation:"beat 3s ease-in-out infinite" }}>
                    <circle cx="230" cy="230" r="34" fill="#C9A84C"/>
                    <circle cx="230" cy="230" r="21" fill="#07070a"/>
                    <text x="230" y="226" textAnchor="middle"
                          fontFamily="'Bebas Neue',sans-serif" fontSize="7.5"
                          fill="#C9A84C" letterSpacing="0.1em">YOU</text>
                    <text x="230" y="237" textAnchor="middle"
                          fontFamily="'Bebas Neue',sans-serif" fontSize="6.5"
                          fill="#e4c97e" letterSpacing="0.07em">{zip}</text>
                  </g>

                  {[1,2,3,4,5].map(n => {
                    const cd     = circ(n);
                    const status = cd?.status || "normal";
                    const lc     = result ? cfg(n).lCol : DEF_LCOLORS[n-1];
                    const sc2    = result ? cfg(n).sCol : DEF_SCOLORS[n-1];
                    const label  = cd ? cd.name.replace("The ","").toUpperCase() : DEF_LABELS[n-1];
                    const sub    = status === "pressure" ? "⚠ PRESSURE"
                                 : status === "elevated" ? "⚠ ELEVATED"
                                 : DEF_ACTIONS[n-1];
                    const yb = LABEL_Y[n-1];
                    return (
                      <g key={n}>
                        <text x="230" y={yb} textAnchor="middle"
                              fontFamily="'Bebas Neue',sans-serif" fontSize="9"
                              fill={lc} letterSpacing="0.12em">{label}</text>
                        <text x="230" y={yb+13} textAnchor="middle"
                              fontFamily="'DM Sans',sans-serif" fontSize="7"
                              fill={sc2} fontWeight="700">{sub}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* ── LEGEND ── */}
              <div style={{ flex:1, minWidth:"270px", maxWidth:"460px",
                            animation:"fadeIn 0.7s ease 0.2s both" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"10px",
                              letterSpacing:"0.24em", color:"#383830", marginBottom:"12px",
                              paddingBottom:"6px", borderBottom:"1px solid #141414" }}>
                  Circle Analysis — {loc.city}, {loc.stateAbbr} {zip}
                </div>

                {[1,2,3,4,5].map(n => {
                  const cd   = circ(n);
                  const cf   = SC[cd?.status] || SC.normal;
                  return (
                    <div key={n} style={{
                      display:"flex", alignItems:"flex-start", gap:"12px",
                      marginBottom:"13px", padding:"11px 13px",
                      borderLeft:`3px solid ${cf.border}`,
                      borderRadius:"0 5px 5px 0",
                      background:"rgba(255,255,255,0.012)"
                    }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0,
                                    marginTop:5, background:cf.dot, border:`2px solid ${cf.dotB}` }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6,
                                      fontSize:"9px", fontWeight:500, letterSpacing:"0.14em",
                                      color:"#333", marginBottom:"2px" }}>
                          Circle {n}
                          {cf.badge && (
                            <span style={{ fontSize:"7.5px", color:cf.aCol, background:cf.aBg,
                                           border:`1px solid ${cf.border}`, padding:"1px 5px",
                                           borderRadius:2, letterSpacing:"0.1em" }}>
                              {cf.badge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"15px",
                                      color:"#F5F0E8", marginBottom:"2px" }}>
                          {cd?.name || NAMES_DEFAULT[n-1]}
                        </div>
                        <div style={{ fontSize:"9.5px", fontWeight:500, letterSpacing:"0.12em",
                                      textTransform:"uppercase", color:"#504a30", marginBottom:"6px" }}>
                          {cd?.geography || ""}
                        </div>
                        {cd?.description && (
                          <p style={{ fontSize:"12px", color:"#7a7a7a", lineHeight:1.56, marginBottom:"5px" }}>
                            {cd.description}
                          </p>
                        )}
                        {cd?.currentContext && (
                          <p style={{ fontSize:"11.5px",
                                      color: cd.status !== "normal" ? "#b07070" : "#5a5a5a",
                                      lineHeight:1.5, fontStyle:"italic", marginBottom:"6px" }}>
                            {cd.currentContext}
                          </p>
                        )}
                        {cd?.keyIssues?.length > 0 && (
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px" }}>
                            {cd.keyIssues.map((iss,i) => (
                              <span key={i} style={{ fontSize:"9.5px", color:"#4a4a4a",
                                                     background:"#0e0e0e", border:"1px solid #1c1c1c",
                                                     padding:"2px 7px", borderRadius:3 }}>
                                {iss}
                              </span>
                            ))}
                          </div>
                        )}
                        <span style={{ display:"inline-block", fontSize:"9px", fontWeight:500,
                                       letterSpacing:"0.18em", textTransform:"uppercase",
                                       color:cf.aCol, background:cf.aBg,
                                       padding:"3px 8px", borderRadius:3 }}>
                          → {cd?.action || ["Act","Engage","Monitor","Track","Aware"][n-1]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── OVERALL ASSESSMENT ── */}
            {result.overallAssessment && (
              <div style={{
                width:"100%", maxWidth:"1100px",
                borderLeft:`4px solid ${overBorder}`,
                background:"#0d0d0d", border:"1px solid #161616",
                borderRadius:"0 6px 6px 0", padding:"16px 20px",
                marginTop:"26px", animation:"fadeIn 0.7s ease 0.3s both"
              }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"10.5px",
                              letterSpacing:"0.2em", color:"#444", marginBottom:"7px" }}>
                  Overall Assessment — {loc.city}, {loc.stateAbbr}
                </div>
                <div style={{ fontSize:"13.5px", color:"#818181", lineHeight:1.65 }}>
                  {result.overallAssessment}
                </div>
              </div>
            )}

            {/* ── PRINCIPLES ── */}
            <div style={{ display:"flex", gap:"14px", maxWidth:"1100px", width:"100%",
                          flexWrap:"wrap", justifyContent:"center",
                          marginTop:"26px", animation:"fadeIn 0.7s ease 0.4s both" }}>
              {[
                { icon:"🎯", title:"Directionality",  body:"Noise pushes outer-ring urgency inward. This framework reverses that inversion." },
                { icon:"⚡", title:"The Filter",       body:"\"Which circle is this — and is that circle owed my energy right now?\"" },
                { icon:"🔨", title:"Stewardship",      body:"You serve your community best when your attention is calibrated, not consumed." },
                { icon:"🌐", title:"Calibration",      body:"Staying small isn't the goal. Staying precise is." },
              ].map((p,i) => (
                <div key={i}
                  style={{ flex:1, minWidth:"148px", maxWidth:"196px", textAlign:"center",
                           padding:"14px 12px", background:"#0e0e0e",
                           border:"1px solid #1a1a1a", borderRadius:5,
                           cursor:"default", transition:"border-color 0.25s, transform 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="#555"; e.currentTarget.style.transform="translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor="#1a1a1a"; e.currentTarget.style.transform="translateY(0)"; }}>
                  <div style={{ fontSize:"18px", marginBottom:"6px" }}>{p.icon}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"12px",
                                letterSpacing:"0.1em", color:"#C9A84C", marginBottom:"4px" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize:"11px", color:"#3a3a3a", lineHeight:1.5 }}>{p.body}</div>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* ── FOOTER ── */}
      <div style={{ marginTop:"44px", textAlign:"center",
                    fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                    fontSize:"12px", color:"#222" }}>
        A personal philosophy by <span style={{ color:"#3a3a3a" }}>Duane Brown</span>
        {" "}· Chester, Virginia · 23831
      </div>
    </div>
  );
}
