import { verifyUser } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Vercel sometimes sends body as a string
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { username, password } = body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await verifyUser(username, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // IMPORTANT: cookie value must be a string
    const sessionId = user._id.toString();

    res.setHeader(
      "Set-Cookie",
      `session=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );

    return res.status(200).json({
      success: true,
      role: user.role
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
