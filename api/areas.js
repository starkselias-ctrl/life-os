import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let userId;
  try {
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, label, sub, icon
        FROM areas WHERE user_id = ${userId}
        ORDER BY sort_order
      `;
      return res.json(rows);
    }

    if (req.method === "POST") {
      const { areas } = req.body;
      if (!areas?.length) return res.json({ ok: true });
      for (const [i, a] of areas.entries()) {
        await sql`
          INSERT INTO areas (id, user_id, label, sub, icon, sort_order)
          VALUES (${a.id}, ${userId}, ${a.label}, ${a.sub||""}, ${a.icon||"⊕"}, ${i})
          ON CONFLICT (id) DO UPDATE SET
            label = EXCLUDED.label, sub = EXCLUDED.sub,
            icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order
        `;
      }
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Missing id" });
      await sql`DELETE FROM areas WHERE id = ${id} AND user_id = ${userId}`;
      return res.json({ ok: true });
    }
  } catch (e) {
    console.error("areas error:", e);
    return res.status(500).json({ error: "Database error" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
