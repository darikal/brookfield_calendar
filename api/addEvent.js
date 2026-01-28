import { getDB } from "./_db.js";

const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1
};

// Convert "HH:MM" to minutes
function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Generate recurring dates
function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = parseInt(lengthNum, 10) || 0;
  let current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    dates.push(current.toISOString().split("T")[0]);
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
      event = await req.json();
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
    const dates = event.recurring
      ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum)
      : [event.date];

    const conflictBreakdown = {};
    const insertedIds = [];

    for (const date of dates) {
      let conflicts = [];
      try {
        conflicts = await db.collection("events").find({ date }).toArray();
      } catch (err) {
        return res.status(500).json({ error: "DB query failed", details: err.message });
      }

      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);

      const blocking = conflicts.filter(e => {
        const s = timeToMinutes(e.startTime);
        const e_ = timeToMinutes(e.endTime);
        return PRIORITY[e.eType] >= PRIORITY[event.eType] && s < eventEnd && e_ > eventStart;
      });

      if (blocking.length) {
        conflictBreakdown[date] = blocking.map(e => ({
          title: e.title,
          type: e.eType,
          startTime: e.startTime,
          endTime: e.endTime
        }));
      } else {
        // Insert non-conflicting date
        try {
          const insert = await db.collection("events").insertOne({
            ...event,
            date,
            createdAt: new Date()
          });
          insertedIds.push(insert.insertedId);
        } catch (err) {
          return res.status(500).json({ error: "DB insert failed", details: err.message });
        }
      }
    }

    if (Object.keys(conflictBreakdown).length && !event.overrideApproved) {
      return res.status(409).json({
        error: "conflict",
        conflicts: conflictBreakdown
      });
    }

    return res.status(200).json({
      success: true,
      inserted: insertedIds,
      conflicts: conflictBreakdown
    });

  } catch (err) {
    console.error("addEvent error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
