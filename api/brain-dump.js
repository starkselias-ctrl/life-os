import { requireAuth, setCors } from "./_lib/auth.js";

const MODEL = "claude-haiku-4-5-20251001";
const API_KEY = () => process.env.VITE_ANTHROPIC_KEY;

async function callClaude(body) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY(),
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify(body),
  });
  return r;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { prompt } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: "No prompt provided" });

  try {
    const r = await callClaude({
      model: MODEL,
      max_tokens: 1024,
      system: `You are a research assistant that turns brain dumps into actionable tasks.
Use web search to research real locations, services, companies, prices, and logistics when the user needs them.
After researching, return ONLY a valid JSON array of specific, actionable task strings. Max 8 tasks.
Example: ["Book rabies vaccination at Austin Vet Specialists (512-555-0100)", "Get EU pet passport at USDA-accredited vet"]
Return ONLY the JSON array, nothing else.`,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    });

    if (!r.ok) {
      const err = await r.json();
      console.error("Anthropic error:", err);
      return res.status(502).json({ error: "AI error", detail: err });
    }

    const d = await r.json();

    // Find the final text block after any tool use
    const textBlock = d.content?.filter(b => b.type === "text").pop();
    const text = textBlock?.text || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const tasks = match ? JSON.parse(match[0]) : [];
    return res.json({ tasks });
  } catch (e) {
    console.error("brain-dump error:", e);
    return res.status(500).json({ error: "Server error", detail: e.message });
  }
}
