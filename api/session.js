import { getUserFromRequest } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    return res.status(200).json({
      username: user.username,
      role: user.role || "admin"
    });

  } catch (err) {
    console.error("SESSION ERROR:", err);
    return res.status(500).json({ error: "Session failed" });
  }
}
