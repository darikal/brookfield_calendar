import clientPromise from "../_db.js";
import { getDB } from "../auth/_auth.js";
import { ObjectId } from "mongodb";

async function getUserFromSession(req) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  const db = await getDB();
  return await db.collection("users").findOne({ _id: new ObjectId(session) });
}

export default async function handler(req, res) {
  try {
    const user = await getUserFromSession(req);

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Admin, Sub-admin, Social Committee ONLY
    if (!["admin", "subAdmin", "socialCommittee"].includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const client = await clientPromise;
    const db = client.db("calendarDB");

    const events = await db
      .collection("events")
      .find({})
      .sort({ date: 1 })
      .toArray();

    res.status(200).json(events);

  } catch (err) {
    console.error("ADMIN GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
