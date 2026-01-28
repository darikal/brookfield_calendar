import { getDB } from "./_db.js";

// Define priority for conflicts
const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1
};

// Generate recurring dates based on start date and recurrence type
function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = parseInt(lengthNum, 10);
  if (isNaN(count) || count < 1) return [startDate]; // fallback to single date

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

    // Remove any incoming IDs
    if ("id" in event) delete event.id;
    if ("_id" in event) delete event._id;

    // Validate required fields
    const required = ["eType", "date", "startTime", "endTime", "title"];
    for (const f of required) {
      if (!event[f]) return res.status(400).json({ error: `Missing field: ${f}` });
    }

    if (!PRIORITY[event.eType]) {
      return res.status(400).json({ error: `Unknown event type: ${event.eType}` });
    }

    // Determine all dates (recurring or single)
    const dates = event.recurring
      ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum)
      : [event.date];

    const conflictBreakdown = {};
    const insertedIds = [];

    for (const date of dates) {
      // Find conflicts
      const conflicts = await db.collection("events").find({
        date,
        startTime: { $exists: true, $type: "string" },
        endTime: { $exists: true, $type: "string" },
        $expr: { $and: [
          { $lt: ["$startTime", event.endTime] },
          { $gt: ["$endTime", event.startTime] }
        ]}
      }).toArray();

      // Filter only blocking conflicts
      const blocking = conflicts.filter(e => PRIORITY[e.eType] >= PRIORITY[event.eType]);
      if (blocking.length) {
        conflictBreakdown[date] = blocking.map(e => ({
          title: e.title,
          type: e.eType,
          startTime: e.startTime,
          endTime: e.endTime
        }));
      }

      // If no conflict or override approved, insert
      if (!blocking.length || event.overrideApproved) {
        try {
          const insert = await db.collection("events").insertOne({
            ...event,
            date,
            groupSize: event.groupSize || "",
            description: event.description || "",
            contactName: event.contactName || "",
            contactInfo: event.contactInfo || "",
            createdAt: new Date()
          });
          insertedIds.push(insert.insertedId);
        } catch (e) {
          console.error("Insert failed for date", date, e);
          return res.status(500).json({ error: "Insert failed", details: e.message });
        }
      }
    }

    return res.json({
      success: true,
      inserted: insertedIds,
      conflicts: conflictBreakdown
    });

  } catch (err) {
    console.error("addEvent error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
