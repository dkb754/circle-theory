const SYSTEM_PROMPT = `You are a socio-geographic analyst applying the "Concentric Circle Theory." Return ONLY a raw valid JSON object. No markdown, no backticks. Structure: {"location":{"city":"","county":"","state":"","stateAbbr":"","zip":"","region":""},"circles":[{"number":1,"name":"The Zip Code","geography":"","status":"normal","action":"Act","description":"","currentContext":"","keyIssues":[]},{"number":2,"name":"The Region","geography":"","status":"normal","action":"Engage","description":"","currentContext":"","keyIssues":[]},{"number":3,"name":"The State","geography":"","status":"normal","action":"Monitor","description":"","currentContext":"","keyIssues":[]},{"number":4,"name":"The Nation","geography":"United States","status":"normal","action":"Track","description":"","currentContext":"","keyIssues":[]},{"number":5,"name":"The World","geography":"Global","status":"normal","action":"Aware","description":"","currentContext":"","keyIssues":[]}],"compressionEvents":[],"overallStatus":"normal","overallAssessment":"","pmesii":{"domains":[{"key":"political","name":"Political","assessment":"","events":[],"forecast":"","likelihood":"moderate","horizon":"","circles":[]}],"watchlist":[{"event":"","forecast":"","likelihood":"moderate","circles":[]}]},"personal":{"summary":"","priorities":[{"circle":1,"focus":"","why":""}],"actions":[],"watchOuts":[]}}. The user message gives a verified "Resolved location"; treat it as authoritative and never substitute a different place. Fill every field with real geographic and policy knowledge for that location (for a street address, circle 1 is its neighborhood and ZIP code). Status options: normal, elevated, pressure. Keep every string concise (1-2 sentences max) and keyIssues to at most 4 short items. PMESII-PT: "pmesii.domains" must contain exactly 8 objects with keys political, military, economic, social, information, infrastructure, environment (Physical Environment), time (tempo, deadlines and windows such as election dates, seasons, how soon effects reach inner circles). For each: "assessment" (1 sentence on the current state as it bears on this location), "events" (0-3 short strings of CURRENT emerging events, each ending with its source in parentheses), "forecast" (1 sentence on what is likely over the horizon), "likelihood" (low, moderate or high), "horizon" (e.g. "30-90 days"), "circles" (numbers 1-5 of the circles most affected). Emerging events MUST come from the numbered headlines supplied in the user message; never invent events, dates or sources. If a domain has no supporting headline, set events to [] and give a base-rate forecast beginning "No current reporting;". "pmesii.watchlist" has one entry per topic the user asked to watch (empty array if none): the event, a forecast of how it could play out and reach this location, likelihood, and circles affected. Treat headlines as unverified reporting, not fact.
 If the user supplies a profile (demographics, priorities, personal objectives), tailor currentContext, overallAssessment and the "personal" section to it: "priorities" ranks up to 4 circles where the user's attention is best spent for their objectives, "actions" gives 3-5 concrete next steps aligned with their stated objectives, "watchOuts" lists 2-3 outer-circle forces most likely to affect someone with their profile. If no profile is given, set "personal" to {"summary":"","priorities":[],"actions":[],"watchOuts":[]}.`;

const clip = (v, n = 400) => String(v ?? "").slice(0, n);
const profileText = (p) => {
  if (!p || typeof p !== "object") return "";
  const lines = [
    ["Age range", clip(p.age, 40)], ["Household", clip(p.household, 80)],
    ["Housing", clip(p.housing, 40)], ["Income range", clip(p.income, 40)],
    ["Occupation", clip(p.occupation, 120)],
    ["Priorities", Array.isArray(p.priorities) ? p.priorities.slice(0, 12).map(x => clip(x, 40)).join(", ") : ""],
    ["Personal objectives", clip(p.objectives, 600)],
  ].filter(([, v]) => v);
  return lines.length ? "\n\nUser profile:\n" + lines.map(([k, v]) => `${k}: ${v}`).join("\n") : "";
};

const UA = "ConcentricCircleTheory/1.0 (netlify function)";
const getJson = async (url) => {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`lookup ${r.status}`);
  return r.json();
};
const nominatim = (params) =>
  getJson("https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
    format: "jsonv2", addressdetails: "1", countrycodes: "us", limit: "1", ...params }));

// Resolve the user's input to a verified place. Returns null when nothing matches.
const toTitle = (t) => t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const STATES = { alabama:"AL", alaska:"AK", arizona:"AZ", arkansas:"AR", california:"CA", colorado:"CO", connecticut:"CT",
  delaware:"DE", "district of columbia":"DC", florida:"FL", georgia:"GA", hawaii:"HI", idaho:"ID", illinois:"IL", indiana:"IN",
  iowa:"IA", kansas:"KS", kentucky:"KY", louisiana:"LA", maine:"ME", maryland:"MD", massachusetts:"MA", michigan:"MI",
  minnesota:"MN", mississippi:"MS", missouri:"MO", montana:"MT", nebraska:"NE", nevada:"NV", "new hampshire":"NH",
  "new jersey":"NJ", "new mexico":"NM", "new york":"NY", "north carolina":"NC", "north dakota":"ND", ohio:"OH", oklahoma:"OK",
  oregon:"OR", pennsylvania:"PA", "rhode island":"RI", "south carolina":"SC", "south dakota":"SD", tennessee:"TN", texas:"TX",
  utah:"UT", vermont:"VT", virginia:"VA", washington:"WA", "west virginia":"WV", wisconsin:"WI", wyoming:"WY" };
const ABBRS = Object.fromEntries(Object.entries(STATES).map(([n, a]) => [a, toTitle(n)]));
const SUFFIX = "(?:ave|avenue|st|street|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|cir|circle|way|pkwy|parkway|hwy|highway|pl|place|ter|terrace|trl|trail|sq|square|loop|pike|run|row|path|walk)";

// Split free text like "14100 botsford ave chester virginia" into street / city / state / zip.
function parseAddress(raw) {
  let t = raw.replace(/\s+/g, " ").replace(/,?\s*(usa|u\.s\.a\.?|united states)$/i, "").trim();
  const zm = t.match(/[,\s]+(\d{5})(?:-\d{4})?$/);
  const zip = zm ? zm[1] : "";
  if (zm) t = t.slice(0, zm.index).trim();
  let abbr = "", rest = t;
  const lower = t.toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  const name = Object.keys(STATES).sort((a, b) => b.length - a.length).find((n) => lower === n || lower.endsWith(" " + n));
  if (name) { abbr = STATES[name]; rest = t.slice(0, t.length - name.length).replace(/[,\s]+$/, ""); }
  else {
    const am = t.match(/[,\s]+([A-Za-z]{2})$/);
    if (am && ABBRS[am[1].toUpperCase()]) { abbr = am[1].toUpperCase(); rest = t.slice(0, am.index); }
  }
  if (!abbr) return { zip };
  let street = "", city = "";
  if (rest.includes(",")) {
    const parts = rest.split(",").map((x) => x.trim()).filter(Boolean);
    street = parts[0]; city = parts.slice(1).join(" ");
  } else {
    const m = rest.match(new RegExp(`^(.*?\\b${SUFFIX}\\b\\.?)\\s+(.+)$`, "i"));
    if (m) { street = m[1]; city = m[2]; }
  }
  if (!street || !city) return { zip, abbr, city: rest.includes(",") ? "" : "" };
  return { street, city, abbr, zip };
}

async function resolveLocation(mode, query, tried = []) {
  if (mode === "zip") {
    const z = await getJson(`https://api.zippopotam.us/us/${query}`).catch(() => null);
    const pl = z?.places?.[0];
    if (!pl) return null;
    const loc = { zip: query, city: pl["place name"], state: pl.state, stateAbbr: pl["state abbreviation"],
                  lat: pl.latitude, lon: pl.longitude, county: "" };
    try { // best effort: county from reverse geocode
      const rev = await getJson("https://nominatim.openstreetmap.org/reverse?" + new URLSearchParams({
        format: "jsonv2", zoom: "10", lat: loc.lat, lon: loc.lon }));
      loc.county = rev?.address?.county || "";
    } catch { /* county stays blank; the model can fill it from the ZIP */ }
    return loc;
  }
  const fromNominatim = (hit, extra = {}) => {
    const a = hit.address || {};
    return {
      zip: a.postcode?.slice(0, 5) || "",
      city: a.city || a.town || a.village || a.hamlet || a.suburb || a.municipality || a.county || "",
      county: a.county || "", state: a.state || "", stateAbbr: "",
      lat: hit.lat, lon: hit.lon, matched: hit.display_name, ...extra,
    };
  };

  if (mode === "address") {
    const pa = parseAddress(query);
    const stateName = pa.abbr ? ABBRS[pa.abbr] : "";
    const tidy = pa.street ? `${pa.street}, ${pa.city}, ${pa.abbr}${pa.zip ? " " + pa.zip : ""}` : query;
    const swallow = (p, label) => p.catch((e) => { tried.push(`${label} failed`); return null; });

    // 1) US Census geocoder (authoritative for street addresses) and OSM structured search, in parallel.
    const census = swallow(getJson("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?" +
      new URLSearchParams({ address: tidy, benchmark: "Public_AR_Current", vintage: "Current_Current",
                            layers: "Counties", format: "json" })), "census");
    const osmStruct = pa.street ? swallow(nominatim({ street: pa.street, city: pa.city, state: stateName,
                                                       ...(pa.zip && { postalcode: pa.zip }) }), "osm-structured") : Promise.resolve(null);
    const [c, os] = await Promise.all([census, osmStruct]);
    const m = c?.result?.addressMatches?.[0];
    if (m) return {
      zip: m.addressComponents?.zip || "", city: toTitle(m.addressComponents?.city || ""),
      county: m.geographies?.Counties?.[0]?.NAME || "", state: ABBRS[m.addressComponents?.state] || "",
      stateAbbr: m.addressComponents?.state || "",
      lat: String(m.coordinates?.y ?? ""), lon: String(m.coordinates?.x ?? ""), matched: m.matchedAddress,
    };
    tried.push("census: no match");
    if (os?.[0]) return fromNominatim(os[0]);
    if (pa.street) tried.push("osm-structured: no match");

    // 2) OSM free-text search with the cleaned-up address.
    const free = await swallow(nominatim({ q: tidy }), "osm-text");
    if (free?.[0]) return fromNominatim(free[0]);
    tried.push("osm-text: no match");

    // 3) Street number not on file: match the street (no number), then the city, as approximate.
    if (pa.street) {
      const noNum = pa.street.replace(/^\s*\d+[A-Za-z]?\s+/, "");
      const st = await swallow(nominatim({ street: noNum, city: pa.city, state: stateName }), "osm-street");
      if (st?.[0]) return fromNominatim(st[0], { approximate: true });
      tried.push("osm-street: no match");
    }
    if (pa.city && pa.abbr) {
      const ci = await swallow(nominatim({ city: pa.city, state: stateName }), "osm-city");
      if (ci?.[0]) return fromNominatim(ci[0], { approximate: true, matched: `${toTitle(pa.city)}, ${stateName} (street not found)` });
      tried.push("osm-city: no match");
    }
    return null;
  }

  const hit = (await nominatim({ q: query }))[0];
  return hit ? fromNominatim(hit) : null;
}
const decode = (t) => t.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
async function headlines(q, n = 5) {
  const url = "https://news.google.com/rss/search?" + new URLSearchParams({ q: `${q} when:7d`, hl: "en-US", gl: "US", ceid: "US:en" });
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(3500) });
  if (!r.ok) throw new Error(`news ${r.status}`);
  const xml = await r.text();
  return xml.split("<item>").slice(1, n + 1).map((it) => {
    const get = (tag) => decode((it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || "");
    const source = get("source");
    let title = get("title");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    return { title, source, date: get("pubDate").slice(5, 16) };
  }).filter((h) => h.title);
}
// Current headlines for each ring plus the user's watchlist topics. Never throws.
async function gatherNews(place, watch) {
  const where = [place?.city, place?.stateAbbr || place?.state].filter(Boolean).join(" ");
  const state = place?.state || ABBRS[place?.stateAbbr] || "";
  const groups = [
    where && { label: "Local (circles 1-2)", q: where },
    state && { label: "State (circle 3)", q: `${state} politics economy` },
    { label: "Nation (circle 4)", q: "United States politics economy security" },
    { label: "World (circle 5)", q: "world geopolitics conflict outbreak" },
    ...watch.map((w) => ({ label: `Watchlist: ${w}`, q: w })),
  ].filter(Boolean);
  const out = await Promise.all(groups.map((g) => headlines(g.q, g.label.startsWith("Watchlist") ? 4 : 5).then((items) => ({ ...g, items })).catch(() => ({ ...g, items: [] }))));
  const seen = new Set(); let i = 0, count = 0;
  const lines = out.map((g) => {
    const rows = g.items.filter((h) => !seen.has(h.title) && seen.add(h.title))
      .map((h) => { count++; return `${++i}. ${h.title} (${h.source || "unknown"}, ${h.date})`; });
    return rows.length ? `${g.label}:\n${rows.join("\n")}` : `${g.label}: no headlines found`;
  });
  return { text: lines.join("\n"), count };
}
const parseWatch = (v) => String(v ?? "").split(/[\n,;]+/).map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 4);

const locationText = (l) => !l ? "" :
  "\n\nResolved location (verified, authoritative):\n" +
  [["Matched address", l.matched], ["City", l.city], ["County", l.county], ["State", l.state || l.stateAbbr],
   ["ZIP", l.zip], ["Coordinates", l.lat && `${l.lat}, ${l.lon}`]]
    .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// Netlify Functions v2: returning a Response with a stream body streams it to the client,
// so bytes flow while the model is still generating instead of waiting for the full reply.
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "API key not configured" });

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { profile } = body;
  const mode = ["zip", "city", "address"].includes(body.mode) ? body.mode : "zip";
  const query = String(body.query ?? body.zip ?? "").trim().slice(0, 200);
  if (mode === "zip" && !/^\d{5}$/.test(query)) return json(400, { error: "Invalid ZIP code" });
  if (mode === "city" && !/[A-Za-z]{2}/.test(query)) return json(400, { error: "Enter a city and state, e.g. Chester, VA" });
  if (mode === "address" && query.length < 6) return json(400, { error: "Enter a full street address" });

  let place = null;
  const tried = [];
  try { place = await resolveLocation(mode, query, tried); }
  catch (e) {
    // Lookup service down: a ZIP can still be analyzed from the model's own knowledge; others cannot.
    if (mode !== "zip") return json(502, { error: "Location lookup is unavailable right now. Please try again, or use a ZIP code." });
    place = { zip: query };
  }
  if (!place) return json(404, { error: mode === "zip"
    ? `We couldn't find ZIP code ${query}. Check the number and try again.`
    : "We couldn't find that location. Check the spelling, or add the state.", detail: tried.join("; ") });

  const watch = parseWatch(profile?.watchlist);
  const today = new Date().toISOString().slice(0, 10);
  const news = await gatherNews(place, watch).catch(() => ({ text: "", count: 0 }));
  const newsText = `\n\nToday's date: ${today}.\nCurrent headlines (last 7 days, unverified):\n` +
    (news.count ? news.text : "none available; label all forecasts as general knowledge, not current reporting");

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 5000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Analyze this location: ${query}.${locationText(place)}${profileText(profile)}${newsText}\n\nReturn ONLY the JSON object.` }],
      }),
    });
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      return json(upstream.status, { error: data.error?.message || "API error" });
    }
    // Send the verified location first, then pass the Anthropic server-sent events through,
    // so the browser can show the resolved place rather than trusting the model's wording.
    const reader = upstream.body.getReader();
    const head = new TextEncoder().encode(`data: ${JSON.stringify({ type: "resolved", place, news: { count: news.count, asOf: today, watch } })}\n\n`);
    const stream = new ReadableStream({
      start(c) { c.enqueue(head); },
      async pull(c) {
        const { done, value } = await reader.read();
        if (done) c.close(); else c.enqueue(value);
      },
      cancel() { return reader.cancel(); },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
