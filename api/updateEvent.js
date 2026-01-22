import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, ...updates } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");

    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE EVENT ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  }
}
