import { getDB } from "./_db.js";

const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1
};

// Generate recurring dates based on start date and recurrence type
function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = parseInt(lengthNum, 10) || 0;
  let current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    dates.push(current.toISOString().split("T")[0]); // YYYY-MM-DD
    if (type === "week") current.setDate(current.getDate() + 7);
    else if (type === "biWeek") current.setDate(current.getDate() + 14);
    else if (type === "month") current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const db = await getDB();
    const event = { ...req.body };
    if (event.id) delete event.id; // remove any legacy ID

    // Validate required fields
    const required = ["eType", "date", "startTime", "endTime", "title"];
    for (const f of required) {
      if (!event[f]) return res.status(400).json({ error: `Missing field: ${f}` });
    }

    if (!PRIORITY[event.eType]) {
      return res.status(400).json({ error: `Unknown event type: ${event.eType}` });
    }

    // Determine all dates to insert
    const dates = event.recurring
      ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum)
      : [event.date];

    const conflictBreakdown = {};

    // Check conflicts for each date
    for (const date of dates) {
      const conflicts = await db.collection("events").find({
        date,
        startTime: { $exists: true },
        endTime: { $exists: true },
        $expr: { $and: [
          { $lt: ["$startTime", event.endTime] },
          { $gt: ["$endTime", event.startTime] }
        ]}
      }).toArray();

      const blocking = conflicts.filter(e => PRIORITY[e.eType] >= PRIORITY[event.eType]);
      if (blocking.length) {
        conflictBreakdown[date] = blocking.map(e => ({
          title: e.title,
          type: e.eType,
          startTime: e.startTime,
          endTime: e.endTime
        }));
      }
    }

    // If there are conflicts and override not approved, return 409 with details
    if (Object.keys(conflictBreakdown).length && !event.overrideApproved) {
      return res.status(409).json({
        error: "conflict",
        conflicts: conflictBreakdown
      });
    }

    // Insert events for non-conflicting dates
    const insertedIds = [];
    for (const date of dates) {
      if (conflictBreakdown[date] && !event.overrideApproved) continue; // skip conflicting date
      const insert = await db.collection("events").insertOne({
        ...event,
        date,
        createdAt: new Date()
      });
      insertedIds.push(insert.insertedId);
    }

    return res.json({ success: true, inserted: insertedIds, conflicts: conflictBreakdown });
  } catch (err) {
    console.error("addEvent error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
