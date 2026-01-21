import clientPromise from "./_db.js";

/**
 * Expand recurring events into individual dates for the requested month/year
 */
function expandRecurring(event, month, year) {
  const occurrences = [];

  if (!event.recurrence) return [event];

  const { type, count, startDate } = event.recurrence;
  const baseDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);

    if (type === "week") d.setDate(baseDate.getDate() + 7 * i);
    if (type === "biWeek") d.setDate(baseDate.getDate() + 14 * i);
    if (type === "month") d.setMonth(baseDate.getMonth() + i);

    const isoDate = d.toISOString().split("T")[0];

    // Skip deleted instances
    if (event.exceptions?.includes(isoDate)) continue;

    if (d.getMonth() === month && d.getFullYear() === year) {
      occurrences.push({
        ...event,
        date: isoDate
      });
    }
  }

  return occurrences;
}

export default async function handler(req, res) {
  try {
    const { month, year } = req.query;

    if (month === undefined || year === undefined) {
      return res.status(400).json({ error: "Missing month or year" });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    const client = await clientPromise;
    const db = client.db("calendarDB");

    const allEvents = await db
      .collection("events")
      .find({})
      .toArray();

    const events = allEvents
      .flatMap(ev => expandRecurring(ev, monthNum, yearNum))
      .map(ev => {
        // 🔒 PUBLIC SANITIZATION — ALWAYS STRIP SENSITIVE DATA
        const sanitized = { ...ev };

        delete sanitized.phone;
        delete sanitized.email;
        delete sanitized.contactName;
        delete sanitized.contactInfo;
        delete sanitized.residentAddress;
        delete sanitized.residentName;
        delete sanitized.internalNotes;
        delete sanitized.createdBy;
        delete sanitized.createdByRole;

        return sanitized;
      });

    res.status(200).json(events);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
