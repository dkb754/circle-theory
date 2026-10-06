const SYSTEM_PROMPT = `You are a socio-geographic analyst applying the "Concentric Circle Theory." Return ONLY a raw valid JSON object. No markdown, no backticks. Structure: {"location":{"city":"","county":"","state":"","stateAbbr":"","zip":"","region":""},"circles":[{"number":1,"name":"The Zip Code","geography":"","status":"normal","action":"Act","description":"","currentContext":"","keyIssues":[]},{"number":2,"name":"The Region","geography":"","status":"normal","action":"Engage","description":"","currentContext":"","keyIssues":[]},{"number":3,"name":"The State","geography":"","status":"normal","action":"Monitor","description":"","currentContext":"","keyIssues":[]},{"number":4,"name":"The Nation","geography":"United States","status":"normal","action":"Track","description":"","currentContext":"","keyIssues":[]},{"number":5,"name":"The World","geography":"Global","status":"normal","action":"Aware","description":"","currentContext":"","keyIssues":[]}],"compressionEvents":[],"overallStatus":"normal","overallAssessment":"","personal":{"summary":"","priorities":[{"circle":1,"focus":"","why":""}],"actions":[],"watchOuts":[]}}. The user message gives a verified "Resolved location"; treat it as authoritative and never substitute a different place. Fill every field with real geographic and policy knowledge for that location (for a street address, circle 1 is its neighborhood and ZIP code). Status options: normal, elevated, pressure. Keep every string concise (1-2 sentences max) and keyIssues to at most 4 short items. If the user supplies a profile (demographics, priorities, personal objectives), tailor currentContext, overallAssessment and the "personal" section to it: "priorities" ranks up to 4 circles where the user's attention is best spent for their objectives, "actions" gives 3-5 concrete next steps aligned with their stated objectives, "watchOuts" lists 2-3 outer-circle forces most likely to affect someone with their profile. If no profile is given, set "personal" to {"summary":"","priorities":[],"actions":[],"watchOuts":[]}.`;

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
async function resolveLocation(mode, query) {
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
  const hit = (await nominatim({ q: query }))[0];
  if (!hit) return null;
  const a = hit.address || {};
  return {
    zip: a.postcode?.slice(0, 5) || "",
    city: a.city || a.town || a.village || a.hamlet || a.suburb || a.municipality || a.county || "",
    county: a.county || "", state: a.state || "", stateAbbr: "",
    lat: hit.lat, lon: hit.lon, street: mode === "address" ? hit.display_name : "",
  };
}
const locationText = (l) => !l ? "" :
  "\n\nResolved location (verified, authoritative):\n" +
  [["Street address", l.street], ["City", l.city], ["County", l.county], ["State", l.state],
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
  try { place = await resolveLocation(mode, query); }
  catch (e) {
    // Lookup service down: a ZIP can still be analyzed from the model's own knowledge; others cannot.
    if (mode !== "zip") return json(502, { error: "Location lookup is unavailable right now. Please try again, or use a ZIP code." });
    place = { zip: query };
  }
  if (!place) return json(404, { error: mode === "zip"
    ? `We couldn't find ZIP code ${query}. Check the number and try again.`
    : "We couldn't find that location. Check the spelling, or add the state." });

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
        max_tokens: 3000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Analyze this location: ${query}.${locationText(place)}${profileText(profile)}\n\nReturn ONLY the JSON object.` }],
      }),
    });
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      return json(upstream.status, { error: data.error?.message || "API error" });
    }
    // Pass the Anthropic server-sent events straight through to the browser.
    return new Response(upstream.body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
