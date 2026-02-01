import { getDB } from "./_db.js";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid"; // npm install uuid

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
      dates.push(new Date(current)); // keep as Date object
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

    let bodyData;
    try {
      bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON body", details: err.message });
    }

    const event = bodyData || {};
    if (!event || typeof event !== "object") return res.status(400).json({ error: "Empty or invalid body" });

    const required = ["eType", "date", "startTime", "endTime", "title"];
    for (const f of required) {
      if (!event[f]) return res.status(400).json({ error: `Missing field: ${f}` });
    }

    if (!PRIORITY[event.eType]) return res.status(400).json({ error: `Unknown event type: ${event.eType}` });

    const db = await getDB();
    const eventsCollection = db.collection("events");

    const dates = event.recurring
      ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum)
      : [new Date(event.date)];

    const conflictBreakdown = {};
    for (const date of dates) {
      const conflicts = await eventsCollection.find({ date: date.toISOString().split("T")[0] }).toArray();
      const blocking = conflicts.filter(e =>
        PRIORITY[e.eType] >= PRIORITY[event.eType] &&
        e.startTime < event.endTime &&
        e.endTime > event.startTime
      );
      if (blocking.length) {
        conflictBreakdown[date.toISOString().split("T")[0]] = blocking.map(e => ({
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
    const seriesId = event.recurring ? uuidv4() : null;

    for (let i = 0; i < dates.length; i++) {
      const dateObj = dates[i];
      const dateStr = dateObj.toISOString().split("T")[0];

      if (conflictBreakdown[dateStr] && !event.overrideApproved) continue;

      const eventData = {
        eType: event.eType,
        date: dateStr,
        startTime: event.startTime,
        endTime: event.endTime,
        title: event.title,
        description: event.description || "",
        groupSize: event.groupSize || "",
        contactName: event.contactName || "",
        contactInfo: event.contactInfo || "",
        addedBy: event.addedBy || "unknown",
        recurring: !!event.recurring,
        isParent: i === 0 && !!event.recurring, // only the first occurrence
        seriesId: seriesId,
        recurWhen: event.recurWhen || null,
        recurLengthNum: event.recurLengthNum || null,
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
