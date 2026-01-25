import { verifyUser } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await verifyUser(username, password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // persistent cookie for 30 days
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds

    res.setHeader(
      "Set-Cookie",
      `session=${user._id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`
    );

    res.json({ role: user.role });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
}
