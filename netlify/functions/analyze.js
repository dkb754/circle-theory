const SYSTEM_PROMPT = `You are a socio-geographic analyst applying the "Concentric Circle Theory." Return ONLY a raw valid JSON object. No markdown, no backticks. Structure: {"location":{"city":"","county":"","state":"","stateAbbr":"","region":""},"circles":[{"number":1,"name":"The Zip Code","geography":"","status":"normal","action":"Act","description":"","currentContext":"","keyIssues":[]},{"number":2,"name":"The Region","geography":"","status":"normal","action":"Engage","description":"","currentContext":"","keyIssues":[]},{"number":3,"name":"The State","geography":"","status":"normal","action":"Monitor","description":"","currentContext":"","keyIssues":[]},{"number":4,"name":"The Nation","geography":"United States","status":"normal","action":"Track","description":"","currentContext":"","keyIssues":[]},{"number":5,"name":"The World","geography":"Global","status":"normal","action":"Aware","description":"","currentContext":"","keyIssues":[]}],"compressionEvents":[],"overallStatus":"normal","overallAssessment":"","personal":{"summary":"","priorities":[{"circle":1,"focus":"","why":""}],"actions":[],"watchOuts":[]}}. Fill every field with real geographic and policy knowledge for the ZIP code. Status options: normal, elevated, pressure. Keep every string concise (1-2 sentences max) and keyIssues to at most 4 short items. If the user supplies a profile (demographics, priorities, personal objectives), tailor currentContext, overallAssessment and the "personal" section to it: "priorities" ranks up to 4 circles where the user's attention is best spent for their objectives, "actions" gives 3-5 concrete next steps aligned with their stated objectives, "watchOuts" lists 2-3 outer-circle forces most likely to affect someone with their profile. If no profile is given, set "personal" to {"summary":"","priorities":[],"actions":[],"watchOuts":[]}.`;

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

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// Netlify Functions v2: returning a Response with a stream body streams it to the client,
// so bytes flow while the model is still generating instead of waiting for the full reply.
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "API key not configured" });

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { zip, profile } = body;
  if (!zip || !/^\d{5}$/.test(zip)) return json(400, { error: "Invalid ZIP code" });

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
        messages: [{ role: "user", content: `Analyze ZIP code: ${zip}.${profileText(profile)}\n\nReturn ONLY the JSON object.` }],
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
