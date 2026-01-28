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

    // --- SAFELY PARSE JSON ---
    let event;
    try {
      event = req.body;
      if (!event) {
        const text = await req.text();
        event = JSON.parse(text);
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON body", details: err.message });
    }

    // Remove legacy id if present
    if (event.id) delete event.id;

    // Validate required fields
    const required = ["eType", "date", "startTime", "endTime", "title"];
    for (const f of required) {
      if (!event[f]) return res.status(400).json({ error: `Missing field: ${f}` });
    }

    if (!PRIORITY[event.eType]) {
      return res.status(400).json({ error: `Unknown event type: ${event.eType}` });
    }

    const db = await getDB();

    // Generate all dates
    const dates = event.recurring
      ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum)
      : [event.date];

    const conflictBreakdown = {};

    // Check conflicts
    for (const date of dates) {
      const conflicts = await db.collection("events").find({
        date,
        startTime: { $exists: true },
        endTime: { $exists: true }
      }).toArray();

      const blocking = conflicts.filter(e => 
        PRIORITY[e.eType] >= PRIORITY[event.eType] &&
        e.startTime < event.endTime &&
        e.endTime > event.startTime
      );

      if (blocking.length) {
        conflictBreakdown[date] = blocking.map(e => ({
          title: e.title,
          type: e.eType,
          startTime: e.startTime,
          endTime: e.endTime
        }));
      }
    }

    // Return 409 if conflicts and override not approved
    if (Object.keys(conflictBreakdown).length && !event.overrideApproved) {
      return res.status(409).json({
        error: "conflict",
        conflicts: conflictBreakdown
      });
    }

    // Insert non-conflicting dates
    const insertedIds = [];
    for (const date of dates) {
      if (conflictBreakdown[date] && !event.overrideApproved) continue;
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
