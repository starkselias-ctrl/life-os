import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Verifies the Clerk JWT from the Authorization header.
 * Returns the userId on success, or sends a 401 and returns null.
 */
export async function requireAuth(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    const payload = await clerk.verifyToken(token);
    return payload.sub; // Clerk user ID
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

/** Standard CORS headers for all API routes. */
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}
