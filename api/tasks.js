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
        SELECT id, text, area, done, priority, due, time, dur, desc, notes, subtasks
        FROM tasks WHERE user_id = ${userId}
      `;
      return res.json(rows);
    }

    if (req.method === "POST") {
      const { tasks } = req.body;
      if (!tasks?.length) return res.json({ ok: true });
      for (const t of tasks) {
        await sql`
          INSERT INTO tasks (id, user_id, text, area, done, priority, due, time, dur, desc, notes, subtasks)
          VALUES (
            ${t.id}, ${userId}, ${t.text}, ${t.area||"inbox"}, ${t.done||false},
            ${t.priority||"med"}, ${t.due||""}, ${t.time||""}, ${t.dur||30},
            ${t.desc||""}, ${t.notes||""}, ${JSON.stringify(t.subtasks||[])}
          )
          ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text, area = EXCLUDED.area, done = EXCLUDED.done,
            priority = EXCLUDED.priority, due = EXCLUDED.due, time = EXCLUDED.time,
            dur = EXCLUDED.dur, desc = EXCLUDED.desc, notes = EXCLUDED.notes,
            subtasks = EXCLUDED.subtasks
        `;
      }
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "Missing id" });
      await sql`DELETE FROM tasks WHERE id = ${id} AND user_id = ${userId}`;
      return res.json({ ok: true });
    }
  } catch (e) {
    console.error("tasks error:", e);
    return res.status(500).json({ error: "Database error" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
