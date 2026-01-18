import { verifyUser } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;
  const user = await verifyUser(username, password);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // Set HttpOnly cookie for session
  res.setHeader(
    "Set-Cookie",
    `session=${user._id}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${8*60*60}`
  );

  res.json({ role: user.role });
}
