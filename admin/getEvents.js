import clientPromise from "../_db.js";
import { getUserFromRequest } from "../_auth.js";

export default async function handler(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const allowed = ["admin", "subAdmin", "socialCommittee"];
  if (!allowed.includes(user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const client = await clientPromise;
  const db = client.db("calendar");
  const events = await db.collection("events").find({}).toArray();

  res.json(events);
}
