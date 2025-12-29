import clientPromise from "./_db.js";

export default async function handler(req, res) {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Missing month or year" });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    const client = await clientPromise;
    const db = client.db("calendarDB");

    // Start and end of the month
    const start = new Date(yearNum, monthNum, 1);
    const end = new Date(yearNum, monthNum + 1, 1);

    // Filter events where date >= start AND date < end
    const events = await db.collection("events").find({
      date: {
        $gte: start.toISOString().split("T")[0],
        $lt: end.toISOString().split("T")[0]
      }
    }).toArray();

    res.status(200).json(events);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
