// netlify/functions/analyze.js
// Place this file at: netlify/functions/analyze.js

const SYSTEM_PROMPT = `You are a socio-geographic analyst applying the "Concentric Circle Theory" — a personal philosophy of intentional attention by Duane Brown of Chester, VA. A person sits at the center of 5 rings of influence and must allocate attention with precision, not anxiety.

Return ONLY a raw, valid JSON object. No markdown, no backticks, no explanation, no preamble. Exactly this structure:
{
  "location": {
    "city": "string",
    "county": "string",
    "state": "string",
    "stateAbbr": "2-letter",
    "region": "metro or regional name"
  },
  "circles": [
    {
      "number": 1,
      "name": "The Zip Code",
      "geography": "City, ST · ZIP",
      "status": "normal",
      "action": "Act",
      "description": "2 sentences: what this geography means for a resident",
      "currentContext": "2 sentences: current notable local conditions or issues at this scale",
      "keyIssues": ["issue 1", "issue 2", "issue 3"]
    },
    {
      "number": 2,
      "name": "The Region",
      "geography": "Metro or county region",
      "status": "normal",
      "action": "Engage",
      "description": "2 sentences",
      "currentContext": "2 sentences",
      "keyIssues": ["issue 1", "issue 2", "issue 3"]
    },
    {
      "number": 3,
      "name": "The State",
      "geography": "State name",
      "status": "normal",
      "action": "Monitor",
      "description": "2 sentences",
      "currentContext": "2 sentences",
      "keyIssues": ["issue 1", "issue 2", "issue 3"]
    },
    {
      "number": 4,
      "name": "The Nation",
      "geography": "United States",
      "status": "normal",
      "action": "Track",
      "description": "2 sentences",
      "currentContext": "2 sentences: note if federal policy is actively bleeding into local conditions for this community",
      "keyIssues": ["issue 1", "issue 2", "issue 3"]
    },
    {
      "number": 5,
      "name": "The World",
      "geography": "Global",
      "status": "normal",
      "action": "Aware",
      "description": "2 sentences",
      "currentContext": "2 sentences: note any global forces affecting this specific community",
      "keyIssues": ["issue 1", "issue 2", "issue 3"]
    }
  ],
  "compressionEvents": ["strings describing outer-ring forces bleeding into inner realities for this location"],
  "overallStatus": "normal",
  "overallAssessment": "2-3 sentence summary"
}

Status options: "normal" (standard monitoring), "elevated" (forces beginning to affect local conditions), "pressure" (outer forces compressing into local reality).
Be specific and grounded in real knowledge of the ZIP code area. Make the analysis genuinely useful for someone deciding what deserves their attention.`;

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Validate API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  try {
    const { zip } = JSON.parse(event.body || "{}");

    // Validate ZIP
    if (!zip || !/^\d{5}$/.test(zip)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid ZIP code — must be 5 digits" }),
      };
    }

    // Call Anthropic API
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
        messages: [
          {
            role: "user",
            content: `Analyze ZIP code: ${zip}. Return ONLY the JSON object.`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: data.error?.message || "Anthropic API error",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
