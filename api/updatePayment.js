import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { id, field } = req.body;

  if (!id || !["depositPaid", "feePaid"].includes(field)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");

    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      [
        {
          $set: {
            [field]: { $not: `$${field}` }
          }
        }
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("PAYMENT TOGGLE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
}
