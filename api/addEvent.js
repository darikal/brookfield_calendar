import { getDB } from "./_db.js";
import { ObjectId } from "mongodb";

const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1
};

// Generates recurring dates
function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = parseInt(lengthNum, 10) || 0;
  let current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    if (!isNaN(current.getTime())) {
      dates.push(current.toISOString().split("T")[0]);
    }
    if (type === "week") current.setDate(current.getDate() + 7);
    else if (type === "biWeek") current.setDate(current.getDate() + 14);
    else if (type === "month") current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // Vercel sometimes sends string body
    let bodyData;
    try {
      bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON body", details: err.message });
    }

    const event = bodyData || {};
    if (!event || typeof event !== "object") return res.status(400).json({ error: "Empty or invalid body" });

    // Validate required fields
    const required = ["eType", "date", "startTime", "endTime", "title"];
    for (const f of required) {
      if (!event[f]) return res.status(400).json({ error: `Missing field: ${f}` });
    }

    if (!PRIORITY[event.eType]) return res.status(400).json({ error: `Unknown event type: ${event.eType}` });

    const db = await getDB();
    const eventsCollection = db.collection("events");

    const dates = event.recurring
      ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum)
      : [event.date];

    const conflictBreakdown = {};

    for (const date of dates) {
      const conflicts = await eventsCollection.find({ date }).toArray();
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

    if (Object.keys(conflictBreakdown).length && !event.overrideApproved) {
      return res.status(409).json({ error: "conflict", conflicts: conflictBreakdown });
    }

    const insertedIds = [];

    for (const date of dates) {
      if (conflictBreakdown[date] && !event.overrideApproved) continue;

      const eventData = {
        eType: event.eType,
        date,
        startTime: event.startTime,
        endTime: event.endTime,
        title: event.title,
        description: event.description || "",
        groupSize: event.groupSize || "",
        contactName: event.contactName || "",
        contactInfo: event.contactInfo || "",
        addedBy: event.addedBy || "unknown",
        recurring: !!event.recurring,
        recurWhen: event.recurWhen || null,
        recurLengthNum: event.recurLengthNum || null,
        recurLength: event.recurLength || null,
        createdAt: new Date()
      };

      try {
        if (event.id && ObjectId.isValid(event.id)) {
          await eventsCollection.updateOne({ _id: new ObjectId(event.id) }, { $set: eventData });
          insertedIds.push(event.id);
        } else {
          const result = await eventsCollection.insertOne(eventData);
          insertedIds.push(result.insertedId);
        }
      } catch (insertErr) {
        console.error("Insert error:", insertErr);
        return res.status(500).json({ error: "Database insert failed", details: insertErr.message });
      }
    }

    return res.status(200).json({ success: true, inserted: insertedIds, conflicts: conflictBreakdown });

  } catch (err) {
    console.error("addEvent fatal error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
