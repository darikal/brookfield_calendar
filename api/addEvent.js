import { getDB } from "./_db.js";

// Event priority: higher number = higher priority
const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1
};

// Helper to generate recurring dates
function generateRecurringDates(startDate, type, lengthNum, lengthUnit) {
  const dates = [];
  let current = new Date(startDate);
  const count = parseInt(lengthNum, 10) || 0;

  for (let i = 0; i < count; i++) {
    dates.push(new Date(current).toISOString().split("T")[0]);
    if (type === "week") current.setDate(current.getDate() + 7);
    else if (type === "biWeek") current.setDate(current.getDate() + 14);
    else if (type === "month") current.setMonth(current.getMonth() + 1);
    else break;
  }

  return dates;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const db = await getDB();
    if (!db) throw new Error("Database not initialized");

    const event = { ...req.body };

    console.log("Received event:", event);

    // Remove client-side id to avoid DB conflicts
    if (event.id) delete event.id;

    // Validate required fields
    const requiredFields = ["eType", "date", "startTime", "endTime", "title"];
    for (const f of requiredFields) {
      if (!event[f]) {
        return res.status(400).json({ error: `Missing required field: ${f}` });
      }
    }

    // Ensure eType is recognized
    if (!PRIORITY[event.eType]) {
      return res.status(400).json({ error: `Unknown event type: ${event.eType}` });
    }

    // Determine dates to insert (single or recurring)
    let datesToInsert = [event.date];
    if (event.recurring) {
      datesToInsert = generateRecurringDates(
        event.date,
        event.recurWhen,
        event.recurLengthNum,
        event.recurLength
      );
    }

    const insertedEvents = [];

    for (const date of datesToInsert) {
      // Check conflicts
      const conflicts = await db.collection("events").find({
        date,
        startTime: { $exists: true, $lt: event.endTime },
        endTime: { $exists: true, $gt: event.startTime }
      }).toArray();

      const blockingConflicts = conflicts.filter(existing => {
        if (!existing.eType || !PRIORITY[existing.eType]) return false;
        return PRIORITY[existing.eType] >= PRIORITY[event.eType];
      });

      if (blockingConflicts.length && !event.overrideApproved) {
        return res.status(409).json({
          error: "conflict",
          date,
          conflicts: blockingConflicts
        });
      }

      // Insert event
      const insertResult = await db.collection("events").insertOne({
        ...event,
        date,
        createdAt: new Date()
      });

      insertedEvents.push(insertResult.insertedId);
    }

    console.log("Inserted events:", insertedEvents);
    return res.json({ success: true, insertedEvents });

  } catch (err) {
    console.error("addEvent error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
