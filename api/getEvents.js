import clientPromise from "./_db.js";

function expandRecurring(event, month, year) {
  if (!event.recurrence) return [event];

  const { type, count, startDate } = event.recurrence;
  const baseDate = new Date(startDate);
  const occurrences = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    if (type === "week") d.setDate(baseDate.getDate() + 7 * i);
    if (type === "biWeek") d.setDate(baseDate.getDate() + 14 * i);
    if (type === "month") d.setMonth(baseDate.getMonth() + i);

    if (event.exceptions?.includes(d.toISOString().split("T")[0])) continue;

    if (d.getMonth() === month && d.getFullYear() === year) {
      const safeEvent = { ...event };
      delete safeEvent.contactName;
      delete safeEvent.contactInfo;
      delete safeEvent.residentName;
      delete safeEvent.residentAddress;
      occurrences.push({ ...safeEvent, date: d.toISOString().split("T")[0] });
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

    const client = await clientPromise;
    const db = client.db("calendar");
    const events = await db.collection("events").find({}).toArray();

    const expanded = events.flatMap(ev =>
      expandRecurring(ev, parseInt(month), parseInt(year))
    );

    res.status(200).json(expanded);
  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
