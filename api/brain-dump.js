import { requireAuth, setCors } from "./_lib/auth.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await requireAuth(req, res);
  if (!userId) return;

  const { prompt } = req.body || {};
  if (!prompt?.trim()) return res.status(400).json({ error: "No prompt provided" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.VITE_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: "Extract the user's brain dump into a list of clear, actionable task titles. Return ONLY a valid JSON array of strings, nothing else. Example: [\"Buy groceries\",\"Call dentist\"]. Max 8 tasks.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const d = await r.json();
    if (!r.ok) {
      console.error("Anthropic error:", d);
      return res.status(502).json({ error: "AI error" });
    }

    const text = d.content?.[0]?.text || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const tasks = match ? JSON.parse(match[0]) : [];
    return res.json({ tasks });
  } catch (e) {
    console.error("brain-dump error:", e);
    return res.status(500).json({ error: "Server error" });
  }
}
