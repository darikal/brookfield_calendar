import clientPromise from "./_db.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");
    const events = db.collection("events");

    const allEvents = await events.find({}).toArray();
    res.status(200).json(allEvents);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
