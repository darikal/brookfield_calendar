import { getDB } from "./_db.js";

const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1
};

// Recurring dates generator
function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = Number(lengthNum) || 0;
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

    // Safe parsing
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON body", details: err.message });
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Empty or invalid body" });
    }

    const db = await getDB();
    const events = db.collection("events");

    // Sanitize fields
    const eType = body.eType;
    const date = body.date;
    const startTime = body.startTime;
    const endTime = body.endTime;
    const title = body.title;
    const description = body.description || "";
    const groupSize = body.groupSize ? Number(body.groupSize) : null;
    const contactName = body.contactName || "";
    const contactInfo = body.contactInfo || "";
    const recurring = !!body.recurring;
    const recurWhen = body.recurWhen || "week";
    const recurLengthNum = Number(body.recurLengthNum) || 0;
    const addedBy = body.addedBy || "admin";
    const overrideApproved = !!body.overrideApproved;

    // Validate required fields
    const required = [eType, date, startTime, endTime, title];
    if (required.some(f => !f)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!PRIORITY[eType]) return res.status(400).json({ error: `Unknown event type: ${eType}` });

    const dates = recurring ? generateRecurringDates(date, recurWhen, recurLengthNum) : [date];

    const conflictBreakdown = {};

    for (const d of dates) {
      const conflicts = await events.find({ date: d }).toArray();
      const blocking = conflicts.filter(e =>
        PRIORITY[e.eType] >= PRIORITY[eType] &&
        e.startTime < endTime &&
        e.endTime > startTime
      );
      if (blocking.length) {
        conflictBreakdown[d] = blocking.map(e => ({
          title: e.title,
          type: e.eType,
          startTime: e.startTime,
          endTime: e.endTime
        }));
      }
    }

    if (Object.keys(conflictBreakdown).length && !overrideApproved) {
      return res.status(409).json({ error: "conflict", conflicts: conflictBreakdown });
    }

    const insertedIds = [];

    for (const d of dates) {
      if (conflictBreakdown[d] && !overrideApproved) continue;

      const eventData = {
        eType,
        date: d,
        startTime,
        endTime,
        title,
        description,
        groupSize,
        contactName,
        contactInfo,
        recurring,
        recurWhen,
        recurLengthNum,
        addedBy,
        createdAt: new Date()
      };

      // If editing, use existing id
      if (body.id && typeof body.id === "string" && body.id.length === 24) {
        const { id, ...rest } = eventData;
        const result = await events.updateOne(
          { _id: new (await import("mongodb")).ObjectId(body.id) },
          { $set: rest }
        );
        insertedIds.push(body.id);
      } else {
        const result = await events.insertOne(eventData);
        insertedIds.push(result.insertedId);
      }
    }

    return res.status(200).json({ success: true, inserted: insertedIds, conflicts: conflictBreakdown });

  } catch (err) {
    console.error("addEvent error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
