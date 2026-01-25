import clientPromise from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const sessionId = req.cookies.session;
    if (!sessionId) return res.status(401).json({ error: "Not logged in" });

    const db = await clientPromise;
    const user = await db.db().collection("users").findOne({ _id: new ObjectId(sessionId) });

    if (!user) return res.status(401).json({ error: "Not logged in" });

    res.json({ role: user.role, username: user.username });
  } catch (err) {
    console.error("CHECK SESSION ERROR:", err);
    res.status(500).json({ error: "Session check failed" });
  }
}
