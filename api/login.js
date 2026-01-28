import { verifyUser } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Vercel may send body as string
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

    // Store Mongo ObjectId in session cookie
    res.setHeader(
      "Set-Cookie",
      `session=${user._id.toString()}; HttpOnly; Path=/; SameSite=Lax`
    );

    return res.status(200).json({
      success: true,
      username: user.username,
      role: user.role || "admin"
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
