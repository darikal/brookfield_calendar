import { verifyUser } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = await verifyUser(username, password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Set HttpOnly cookie for session (no Max-Age, so it lasts until browser is closed)
  res.setHeader(
    "Set-Cookie",
    `session=${user._id}; HttpOnly; Path=/; SameSite=Strict`
  );

  res.status(200).json({
    message: "Login successful",
    role: user.role,
    username: user.username,
  });
}
