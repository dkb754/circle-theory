// src/App.jsx
// Replace your entire src/App.jsx with this file

import { useState, useEffect } from "react";

const T = {
  bg:"#faf6ee", card:"#ffffff", cardAlt:"#fdf9ef", line:"#e2d6b8",
  text:"#1f1a10", body:"#3a3326", muted:"#5c523c", gold:"#8a6410", goldBright:"#C9A84C",
};
const SC = {
  normal:   { stroke:"#8a6a1c", lCol:"#3a2c0c", sCol:"#6b5010", aBg:"rgba(138,100,16,0.12)", aCol:"#7a5a0c", border:"#C9A84C", dot:"#C9A84C", dotB:"#8a6a1c", badge:null },
  elevated: { stroke:"#b45f06", lCol:"#7a3d00", sCol:"#9a4f00", aBg:"rgba(180,95,6,0.12)",  aCol:"#9a4f00", border:"#d47a0a", dot:"#d47a0a", dotB:"#9a4f00", badge:"⚠ Elevated" },
  pressure: { stroke:"#b3261e", lCol:"#8a1a14", sCol:"#a32018", aBg:"rgba(179,38,30,0.10)", aCol:"#a32018", border:"#c0392b", dot:"#c0392b", dotB:"#8a1a14", badge:"⚠ Pressure" },
};

const RADII          = [54, 90, 130, 170, 210];
const DEF_FILLS      = ["#C9A84C","#ecd9a6","#f3e8c8","#f8f1de","#fdf9ef"];
const DEF_STROKES    = ["#8a6a1c","#a98a3c","#b89c58","#c8b078","#d6c496"];
const DEF_LABELS     = ["ZIP CODE","REGION","STATE","NATION","WORLD"];
const DEF_ACTIONS    = ["ACT","ENGAGE","MONITOR","TRACK","AWARE"];
const DEF_LCOLORS    = ["#3a2c0c","#3a2c0c","#3a2c0c","#3a2c0c","#3a2c0c"];
const DEF_SCOLORS    = ["#5a430a","#6b5010","#6b5010","#6b5010","#6b5010"];
const LABEL_Y        = [156, 118, 78, 38, 5];
const NAMES_DEFAULT  = ["The Zip Code","The Region","The State","The Nation","The World"];

const MODES = [
  { id:"zip",     label:"ZIP code",     placeholder:"Enter any U.S. ZIP code" },
  { id:"city",    label:"City, State",  placeholder:"e.g. Chester, VA" },
  { id:"address", label:"Home address", placeholder:"e.g. 123 Main St, Chester, VA" },
];
const AGES       = ["Under 25","25–34","35–44","45–54","55–64","65+"];
const HOUSEHOLDS = ["Single, no children","Couple, no children","Family with young children","Family with school-age children","Family with adult children","Caring for an aging parent","Retired"];
const HOUSING    = ["Own","Rent","Other"];
const INCOMES    = ["Under $40k","$40k–$75k","$75k–$125k","$125k–$200k","Over $200k"];
const PRIORITIES = ["Family","Safety","Schools","Housing costs","Health care","Jobs & career","Small business","Faith & community","Civic involvement","Environment","Taxes","Retirement"];
const EMPTY_PROFILE = { age:"", household:"", housing:"", income:"", occupation:"", priorities:[], objectives:"" };

const loadProfile = () => {
  try { return { ...EMPTY_PROFILE, ...JSON.parse(localStorage.getItem("ctProfile") || "{}") }; }
  catch { return EMPTY_PROFILE; }
};

export default function App() {
  const [mode, setMode]       = useState("zip");
  const [query, setQuery]     = useState("23831");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState(loadProfile);
  const [showProfile, setShowProfile] = useState(() => !!loadProfile().objectives);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const s = document.createElement("style");
    s.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${T.bg}; }
      select, input, textarea, button { font-family: inherit; }
      @keyframes fadeIn  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes ringIn  { from{stroke-dashoffset:1500;opacity:0} to{stroke-dashoffset:0;opacity:1} }
      @keyframes hotPulse{ 0%,100%{opacity:0.25} 50%{opacity:0.9} }
      @keyframes beat    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
      @keyframes orbitCW { to{transform:rotate(360deg)} }
      @keyframes orbitCC { to{transform:rotate(-360deg)} }
    `;
    document.head.appendChild(s);
  }, []);

  const setP = (k, v) => setProfile(p => {
    const n = { ...p, [k]: v };
    try { localStorage.setItem("ctProfile", JSON.stringify(n)); } catch {}
    return n;
  });
  const togglePriority = (x) => setP("priorities",
    profile.priorities.includes(x) ? profile.priorities.filter(y => y !== x) : [...profile.priorities, x]);
  const clearProfile = () => { setProfile(EMPTY_PROFILE); try { localStorage.removeItem("ctProfile"); } catch {} };
  const hasProfile = !!(profile.age || profile.household || profile.housing || profile.income ||
                        profile.occupation || profile.priorities.length || profile.objectives.trim());

  const run = async () => {
    const q = query.trim();
    if (mode === "zip" && !/^\d{5}$/.test(q)) { setError("Please enter a valid 5-digit ZIP code."); return; }
    if (mode === "city" && !/[A-Za-z]{2}.*,?\s*[A-Za-z]{2}/.test(q)) { setError("Enter a city and state, e.g. Chester, VA."); return; }
    if (mode === "address" && q.length < 6) { setError("Enter a full street address, e.g. 123 Main St, Chester, VA."); return; }
    setLoading(true); setError(null); setResult(null); setProgress(0);

    try {
      // ── Calls the Netlify function, not Anthropic directly ──
      const res = await fetch("/.netlify/functions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, query: q, profile: hasProfile ? profile : undefined }),
      });

      if (!res.ok) {
        const t = await res.text();
        let msg;
        try { msg = JSON.parse(t).error; } catch { /* gateway HTML */ }
        throw new Error(msg || (res.status === 504 || res.status === 502
          ? "The analysis timed out. Please try again."
          : `Server returned an unexpected response (HTTP ${res.status}).`));
      }

      // Read the Anthropic server-sent event stream and collect the text deltas.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", raw = "", place = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          let ev;
          try { ev = JSON.parse(line.slice(5)); } catch { continue; }
          if (ev.type === "resolved") {
            place = ev.place;
          } else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            raw += ev.delta.text;
            setProgress(raw.length);
          } else if (ev.type === "error") {
            throw new Error(ev.error?.message || "Stream error");
          }
        }
      }
      raw = raw.trim();
      const clean = raw.replace(/^```(?:json)?/,"").replace(/```$/,"").trim();
      const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
      if (start === -1) throw new Error("No JSON in response");
      const parsed = JSON.parse(clean.slice(start, end + 1));
      // The verified lookup wins over anything the model wrote for the location.
      const verified = {};
      for (const k of ["city", "county", "state", "stateAbbr", "zip"]) if (place?.[k]) verified[k] = place[k];
      parsed.location = { ...(parsed.location || {}), ...verified };
      parsed.verified = !!place?.city;
      setResult(parsed);
    } catch(e) {
      setError("Analysis failed: " + e.message);
      console.error(e);
    } finally { setLoading(false); }
  };

  const circ = (n) => result?.circles?.find(x => x.number === n);
  const cfg  = (n) => SC[circ(n)?.status] || SC.normal;
  const hasCompression = result?.circles?.some(x => x.status !== "normal");
  const overBorder = { compressed:"#c0392b", pressure:"#c0392b", elevated:"#d47a0a", normal:"#8a6a1c" }[result?.overallStatus] || "#8a6a1c";
  const personal = result?.personal;
  const hasPersonal = personal && (personal.summary || personal.actions?.length || personal.priorities?.length || personal.watchOuts?.length);

  const field = { width:"100%", background:"#fff", border:`1px solid ${T.line}`, color:T.text,
                  fontSize:"15px", padding:"10px 12px", borderRadius:6, outline:"none" };
  const lab   = { display:"block", fontSize:"13px", fontWeight:700, color:T.body, marginBottom:"5px" };
  const Select = ({ k, label, opts }) => (
    <div style={{ flex:"1 1 200px" }}>
      <label style={lab}>{label}</label>
      <select value={profile[k]} onChange={e => setP(k, e.target.value)} style={field}>
        <option value="">Prefer not to say</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ background:T.bg, color:T.text, fontFamily:"'DM Sans',sans-serif", fontSize:"16px",
                  minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center",
                  padding:"32px 16px 64px" }}>

      {/* ── HEADER ── */}
      <div style={{ textAlign:"center", marginBottom:"24px", animation:"fadeIn 0.7s ease both" }}>
        <div style={{ fontSize:"13px", fontWeight:700, letterSpacing:"0.22em",
                      textTransform:"uppercase", color:T.muted, marginBottom:"8px" }}>
          A Personal Philosophy of Intentional Attention
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(36px,6vw,64px)",
                     letterSpacing:"0.06em", lineHeight:1, marginBottom:"8px" }}>
          The Concentric <span style={{ color:T.gold }}>Circle Theory</span>
        </h1>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                      fontSize:"18px", color:T.body }}>
          Know your rings. Protect your energy. Serve your zip code.
        </div>
      </div>

      {/* ── INPUT ── */}
      <div style={{ width:"100%", maxWidth:"620px", marginBottom:"12px", animation:"fadeIn 0.7s ease 0.1s both" }}>
        <div role="tablist" style={{ display:"flex", gap:"6px", justifyContent:"center", marginBottom:"10px", flexWrap:"wrap" }}>
          {MODES.map(m => (
            <button key={m.id} role="tab" aria-selected={mode === m.id}
              onClick={() => { setMode(m.id); setQuery(m.id === "zip" ? "23831" : ""); setError(null); }}
              style={{ fontSize:"15px", fontWeight:700, padding:"8px 16px", borderRadius:999, cursor:"pointer",
                       border:`1.5px solid ${mode === m.id ? T.gold : T.line}`,
                       background: mode === m.id ? T.gold : "#fff", color: mode === m.id ? "#fff" : T.body }}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <input
            value={query}
            onChange={e => { setQuery(mode === "zip" ? e.target.value.replace(/\D/g,"").slice(0,5) : e.target.value.slice(0,200)); setError(null); }}
            onKeyDown={e => e.key === "Enter" && run()}
            placeholder={MODES.find(m => m.id === mode).placeholder}
            maxLength={mode === "zip" ? 5 : 200}
            inputMode={mode === "zip" ? "numeric" : "text"}
            autoComplete={mode === "address" ? "street-address" : "off"}
            style={{ ...field, flex:1, fontSize:"18px", padding:"12px 16px",
                     letterSpacing: mode === "zip" ? "0.08em" : "normal", border:`2px solid ${T.line}` }}
            onFocus={e => e.target.style.borderColor = T.goldBright}
            onBlur={e  => e.target.style.borderColor = T.line}
          />
          <button
            onClick={run}
            disabled={loading}
            style={{ background: loading ? "#d8cfb8" : T.gold,
                     color: loading ? "#6b6350" : "#fff",
                     border:"none", padding:"12px 24px", borderRadius:6,
                     cursor: loading ? "not-allowed" : "pointer",
                     fontFamily:"'Bebas Neue',sans-serif", fontSize:"20px",
                     letterSpacing:"0.12em", whiteSpace:"nowrap" }}>
            {loading ? "ANALYZING…" : "ANALYZE"}
          </button>
        </div>
        {mode === "address" && (
          <p style={{ fontSize:"13px", color:T.muted, textAlign:"center", marginTop:"8px" }}>
            Your address is sent to a public geocoding service and to the AI only to find your neighborhood. This app does not store it.
          </p>
        )}
      </div>

      {/* ── PROFILE ── */}
      <div style={{ width:"100%", maxWidth:"760px", marginBottom:"22px", animation:"fadeIn 0.7s ease 0.15s both" }}>
        <button onClick={() => setShowProfile(v => !v)}
          style={{ background:"none", border:"none", color:T.gold, fontSize:"15px", fontWeight:700,
                   cursor:"pointer", textDecoration:"underline", display:"block", margin:"0 auto" }}>
          {showProfile ? "▾ Hide" : "▸ Personalize"} your profile &amp; objectives
          {hasProfile && !showProfile ? " (saved)" : ""}
        </button>

        {showProfile && (
          <div style={{ background:T.card, border:`1px solid ${T.line}`, borderRadius:8,
                        padding:"20px", marginTop:"12px", display:"flex", flexDirection:"column", gap:"16px" }}>
            <p style={{ fontSize:"14px", color:T.muted, lineHeight:1.5 }}>
              Everything here is optional. It is sent only with your analysis request to tailor the results,
              and is saved in this browser only.
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"14px" }}>
              <Select k="age" label="Age range" opts={AGES} />
              <Select k="household" label="Household" opts={HOUSEHOLDS} />
              <Select k="housing" label="Housing" opts={HOUSING} />
              <Select k="income" label="Household income" opts={INCOMES} />
              <div style={{ flex:"1 1 200px" }}>
                <label style={lab}>Occupation / industry</label>
                <input value={profile.occupation} maxLength={120}
                  onChange={e => setP("occupation", e.target.value)}
                  placeholder="e.g. teacher, restaurant owner" style={field} />
              </div>
            </div>
            <div>
              <label style={lab}>What matters most to you? (pick any)</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                {PRIORITIES.map(x => {
                  const on = profile.priorities.includes(x);
                  return (
                    <button key={x} type="button" onClick={() => togglePriority(x)} aria-pressed={on}
                      style={{ fontSize:"14px", padding:"7px 13px", borderRadius:999, cursor:"pointer",
                               border:`1.5px solid ${on ? T.gold : T.line}`,
                               background: on ? T.gold : "#fff", color: on ? "#fff" : T.body,
                               fontWeight: on ? 700 : 500 }}>
                      {x}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={lab}>Your personal objectives</label>
              <textarea value={profile.objectives} maxLength={600} rows={3}
                onChange={e => setP("objectives", e.target.value)}
                placeholder="e.g. Run for school board in two years, keep my business open, help my neighbors, retire here comfortably…"
                style={{ ...field, resize:"vertical", lineHeight:1.5 }} />
            </div>
            <button onClick={clearProfile}
              style={{ alignSelf:"flex-start", background:"none", border:"none", color:T.muted,
                       fontSize:"14px", cursor:"pointer", textDecoration:"underline" }}>
              Clear profile
            </button>
          </div>
        )}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ width:"100%", maxWidth:"520px", background:"rgba(179,38,30,0.08)",
                      border:"1px solid rgba(179,38,30,0.4)", borderRadius:6,
                      padding:"12px 16px", fontSize:"15px", color:"#8a1a14", marginBottom:"16px" }}>
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
                stroke={["#8a6a1c","#a98a3c","#b89c58","#c8b078","#d6c496"][i]}
                strokeWidth={i === 0 ? 2.5 : 2}
                strokeDasharray={`${r * 0.55} ${r * 0.1}`}
                style={{ transformBox:"fill-box", transformOrigin:"center",
                         animation:`${i%2===0?"orbitCW":"orbitCC"} ${1.4+i*0.22}s linear infinite` }}
              />
            ))}
          </svg>
          <div style={{ fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                        fontSize:"18px", color:T.body }}>
            Mapping circles for {query.trim()}…{progress > 0 && ` (${Math.min(99, Math.round(progress / 30))}%)`}
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
                            fontSize:"clamp(28px,4.5vw,42px)", letterSpacing:"0.08em", color:T.gold }}>
                {loc.city}, {loc.stateAbbr}
              </div>
              <div style={{ fontSize:"14px", fontWeight:700, letterSpacing:"0.12em",
                            textTransform:"uppercase", color:T.muted, marginTop:"3px" }}>
                {[loc.county, loc.region, loc.zip && `ZIP ${loc.zip}`].filter(Boolean).join(" · ")}
              </div>
            </div>

            {result.verified && (
              <div style={{ textAlign:"center", fontSize:"14px", color:T.muted, marginTop:"-12px", marginBottom:"16px" }}>
                ✓ Location verified from “{query.trim()}”
              </div>
            )}

            {/* Compression Alert */}
            {hasCompression && (
              <div style={{
                width:"100%", maxWidth:"1100px",
                background:"rgba(179,38,30,0.07)",
                border:"1px solid rgba(179,38,30,0.4)", borderRadius:6,
                padding:"14px 18px", marginBottom:"22px",
                display:"flex", alignItems:"flex-start", gap:"10px",
                animation:"fadeIn 0.6s ease both"
              }}>
                <span style={{ flexShrink:0, fontSize:"18px", color:"#a32018" }}>⚠</span>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:700, letterSpacing:"0.14em",
                                textTransform:"uppercase", color:"#a32018", marginBottom:"4px" }}>
                    Compression Event — {loc.city}, {loc.stateAbbr}
                  </div>
                  <div style={{ fontSize:"15px", color:T.body, lineHeight:1.55 }}>
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
                  style={{ width:"min(500px, 90vw)", height:"min(500px, 90vw)", overflow:"visible" }}>
                  {[5,4,3,2,1].map(n => {
                    const r      = RADII[n-1];
                    const status = circ(n)?.status || "normal";
                    const hot    = status !== "normal";
                    const stroke = result ? cfg(n).stroke : DEF_STROKES[n-1];
                    const fill   = DEF_FILLS[n-1];
                    const delay  = (5-n) * 0.11;
                    return (
                      <g key={n}>
                        <circle cx="230" cy="230" r={r}
                          fill={fill} stroke={stroke}
                          strokeWidth={hot ? 3 : 2}
                          strokeDasharray={1500}
                          style={{ animation:`ringIn 1.4s cubic-bezier(0.4,0,0.2,1) ${delay}s both` }}
                        />
                        {hot && n > 1 && (
                          <circle cx="230" cy="230" r={r}
                            fill="none" stroke={stroke}
                            strokeWidth={status === "pressure" ? 4 : 3}
                            style={{ animation:"hotPulse 3s ease-in-out infinite" }}
                          />
                        )}
                      </g>
                    );
                  })}

                  <g style={{ transformBox:"fill-box", transformOrigin:"center",
                               animation:"beat 3s ease-in-out infinite" }}>
                    <circle cx="230" cy="230" r="34" fill="#8a6a1c"/>
                    <circle cx="230" cy="230" r="23" fill="#fffaf0"/>
                    <text x="230" y="228" textAnchor="middle"
                          fontFamily="'Bebas Neue',sans-serif" fontSize="11"
                          fill="#3a2c0c" letterSpacing="0.08em">YOU</text>
                    <text x="230" y="240" textAnchor="middle"
                          fontFamily="'DM Sans',sans-serif" fontWeight="700" fontSize="9"
                          fill="#5a430a">{loc.zip || ""}</text>
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
                              fontFamily="'Bebas Neue',sans-serif" fontSize="14"
                              fill={lc} letterSpacing="0.1em">{label}</text>
                        <text x="230" y={yb+11} textAnchor="middle"
                              fontFamily="'DM Sans',sans-serif" fontSize="10"
                              fill={sc2} fontWeight="700">{sub}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* ── LEGEND ── */}
              <div style={{ flex:1, minWidth:"300px", maxWidth:"520px",
                            animation:"fadeIn 0.7s ease 0.2s both" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px",
                              letterSpacing:"0.16em", color:T.gold, marginBottom:"12px",
                              paddingBottom:"6px", borderBottom:`2px solid ${T.line}` }}>
                  Circle Analysis — {loc.city}, {loc.stateAbbr} {loc.zip}
                </div>

                {[1,2,3,4,5].map(n => {
                  const cd   = circ(n);
                  const cf   = SC[cd?.status] || SC.normal;
                  return (
                    <div key={n} style={{
                      display:"flex", alignItems:"flex-start", gap:"12px",
                      marginBottom:"14px", padding:"14px 16px",
                      borderLeft:`5px solid ${cf.border}`,
                      borderRadius:"0 8px 8px 0",
                      background:T.card, boxShadow:"0 1px 3px rgba(60,45,10,0.08)"
                    }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8,
                                      fontSize:"13px", fontWeight:700, letterSpacing:"0.1em",
                                      textTransform:"uppercase", color:T.muted, marginBottom:"3px" }}>
                          Circle {n}
                          {cf.badge && (
                            <span style={{ fontSize:"12px", color:cf.aCol, background:cf.aBg,
                                           border:`1px solid ${cf.border}`, padding:"1px 8px",
                                           borderRadius:3, letterSpacing:"0.06em" }}>
                              {cf.badge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"22px",
                                      color:T.text, marginBottom:"2px" }}>
                          {cd?.name || NAMES_DEFAULT[n-1]}
                        </div>
                        <div style={{ fontSize:"13px", fontWeight:700, letterSpacing:"0.08em",
                                      textTransform:"uppercase", color:T.gold, marginBottom:"8px" }}>
                          {cd?.geography || ""}
                        </div>
                        {cd?.description && (
                          <p style={{ fontSize:"16px", color:T.body, lineHeight:1.55, marginBottom:"8px" }}>
                            {cd.description}
                          </p>
                        )}
                        {cd?.currentContext && (
                          <p style={{ fontSize:"15.5px",
                                      color: cd.status !== "normal" ? "#8a1a14" : T.muted,
                                      lineHeight:1.55, fontStyle:"italic", marginBottom:"8px" }}>
                            {cd.currentContext}
                          </p>
                        )}
                        {cd?.keyIssues?.length > 0 && (
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"8px" }}>
                            {cd.keyIssues.map((iss,i) => (
                              <span key={i} style={{ fontSize:"14px", color:T.body,
                                                     background:T.cardAlt, border:`1px solid ${T.line}`,
                                                     padding:"3px 10px", borderRadius:4 }}>
                                {iss}
                              </span>
                            ))}
                          </div>
                        )}
                        <span style={{ display:"inline-block", fontSize:"13px", fontWeight:700,
                                       letterSpacing:"0.12em", textTransform:"uppercase",
                                       color:cf.aCol, background:cf.aBg,
                                       padding:"4px 10px", borderRadius:4 }}>
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
                borderLeft:`6px solid ${overBorder}`,
                background:T.card, border:`1px solid ${T.line}`, borderLeftWidth:6, borderLeftColor:overBorder,
                borderRadius:"0 8px 8px 0", padding:"20px 24px",
                marginTop:"26px", animation:"fadeIn 0.7s ease 0.3s both"
              }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"18px",
                              letterSpacing:"0.14em", color:T.gold, marginBottom:"8px" }}>
                  Overall Assessment — {loc.city}, {loc.stateAbbr}
                </div>
                <div style={{ fontSize:"17px", color:T.body, lineHeight:1.65 }}>
                  {result.overallAssessment}
                </div>
              </div>
            )}

            {/* ── PERSONAL ALIGNMENT ── */}
            {hasPersonal ? (
              <div style={{
                width:"100%", maxWidth:"1100px", background:"#fffaf0",
                border:`2px solid ${T.goldBright}`, borderRadius:8, padding:"22px 24px",
                marginTop:"22px", animation:"fadeIn 0.7s ease 0.35s both"
              }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px",
                              letterSpacing:"0.14em", color:T.gold, marginBottom:"8px" }}>
                  Aligned to Your Objectives
                </div>
                {personal.summary && (
                  <p style={{ fontSize:"17px", color:T.body, lineHeight:1.65, marginBottom:"16px" }}>{personal.summary}</p>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:"22px" }}>
                  {personal.priorities?.length > 0 && (
                    <div style={{ flex:"1 1 300px" }}>
                      <div style={{ fontSize:"13px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:"8px" }}>Where to focus</div>
                      {personal.priorities.map((p,i) => (
                        <div key={i} style={{ marginBottom:"10px", fontSize:"16px", lineHeight:1.5, color:T.body }}>
                          <strong style={{ color:T.text }}>Circle {p.circle}: {p.focus}</strong>
                          {p.why && <div style={{ color:T.muted }}>{p.why}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {personal.actions?.length > 0 && (
                    <div style={{ flex:"1 1 300px" }}>
                      <div style={{ fontSize:"13px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.muted, marginBottom:"8px" }}>Next steps</div>
                      <ol style={{ paddingLeft:"22px", fontSize:"16px", lineHeight:1.55, color:T.body }}>
                        {personal.actions.map((a,i) => <li key={i} style={{ marginBottom:"6px" }}>{a}</li>)}
                      </ol>
                    </div>
                  )}
                  {personal.watchOuts?.length > 0 && (
                    <div style={{ flex:"1 1 300px" }}>
                      <div style={{ fontSize:"13px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#a32018", marginBottom:"8px" }}>Watch-outs</div>
                      <ul style={{ paddingLeft:"22px", fontSize:"16px", lineHeight:1.55, color:T.body }}>
                        {personal.watchOuts.map((a,i) => <li key={i} style={{ marginBottom:"6px" }}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ marginTop:"22px", fontSize:"15px", color:T.muted, textAlign:"center" }}>
                Add your profile and objectives above, then analyze again for a personalized plan.
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
                  style={{ flex:1, minWidth:"200px", maxWidth:"250px", textAlign:"center",
                           padding:"18px 16px", background:T.card,
                           border:`1px solid ${T.line}`, borderRadius:8,
                           cursor:"default", transition:"border-color 0.25s, transform 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=T.goldBright; e.currentTarget.style.transform="translateY(-3px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=T.line; e.currentTarget.style.transform="translateY(0)"; }}>
                  <div style={{ fontSize:"24px", marginBottom:"6px" }}>{p.icon}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"19px",
                                letterSpacing:"0.1em", color:T.gold, marginBottom:"4px" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize:"15px", color:T.body, lineHeight:1.5 }}>{p.body}</div>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* ── FOOTER ── */}
      <div style={{ marginTop:"44px", textAlign:"center",
                    fontFamily:"'DM Serif Display',serif", fontStyle:"italic",
                    fontSize:"15px", color:T.muted }}>
        A personal philosophy by <span style={{ color:T.text }}>Duane Brown</span>
        {" "}· Chester, Virginia · 23831
      </div>
    </div>
  );
}
