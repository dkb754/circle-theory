const SYSTEM_PROMPT = `You are a socio-geographic analyst applying the "Concentric Circle Theory." Return ONLY a raw valid JSON object with this structure: {"location":{"city":"","county":"","state":"","stateAbbr":"","region":""},"circles":[{"number":1,"name":"The Zip Code","geography":"","status":"normal","action":"Act","description":"","currentContext":"","keyIssues":[]},{"number":2,"name":"The Region","geography":"","status":"normal","action":"Engage","description":"","currentContext":"","keyIssues":[]},{"number":3,"name":"The State","geography":"","status":"normal","action":"Monitor","description":"","currentContext":"","keyIssues":[]},{"number":4,"name":"The Nation","geography":"United States","status":"normal","action":"Track","description":"","currentContext":"","keyIssues":[]},{"number":5,"name":"The World","geography":"Global","status":"normal","action":"Aware","description":"","currentContext":"","keyIssues":[]}],"compressionEvents":[],"overallStatus":"normal","overallAssessment":""}. Fill every field with real geographic and policy knowledge for the ZIP code. Status: normal, elevated, or pressure. Be specific and useful.`;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "API key not configured" }) };
  }
  try {
    const { zip } = JSON.parse(event.body || "{}");
    if (!zip || !/^\d{5}$/.test(zip)) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid ZIP code" }) };
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Analyze ZIP code: ${zip}. Return ONLY the JSON object.` }],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: data.error?.message || "API error" }) };
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: error.message }) };
  }
};
