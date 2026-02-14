import { getDb } from "./_db.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, type } = req.body;

    if (!id || !type || !["deposit", "fee"].includes(type)) {
      return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    const db = await getDb();
    const fieldToUpdate = type === "deposit" ? "paidDeposit" : "paidFee";

    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $set: { [fieldToUpdate]: true } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("markPayment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
