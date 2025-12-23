import clientPromise from "./_db.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("calendar");
    const events = await db.collection("events").find({}).toArray();

    res.status(200).json(events);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
