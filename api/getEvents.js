import clientPromise from "./_db.js";

function expandRecurring(event, month, year) {
  const occurrences = [];
  if (!event.recurrence) return [event];

  const { type, count, startDate } = event.recurrence;
  let baseDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    let d = new Date(baseDate);
    if (type === "week") d.setDate(baseDate.getDate() + 7 * i);
    if (type === "biWeek") d.setDate(baseDate.getDate() + 14 * i);
    if (type === "month") d.setMonth(baseDate.getMonth() + i);

    // Skip exceptions
    if (event.exceptions && event.exceptions.includes(d.toISOString().split("T")[0])) continue;

    if (d.getMonth() === month && d.getFullYear() === year) {
      occurrences.push({ ...event, date: d.toISOString().split("T")[0] });
    }
  }
  return occurrences;
}

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
    const allEvents = await db.collection("events").find({}).toArray();

    // Expand recurring events for the requested month
    let events = [];
    allEvents.forEach(ev => {
      events.push(...expandRecurring(ev, monthNum, yearNum));
    });

    res.status(200).json(events);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
