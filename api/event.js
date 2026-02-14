import { getDB } from "./_db.js";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";

const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1,
  boardMeeting: 5
};

function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = parseInt(lengthNum, 10) || 0;
  let current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    if (!isNaN(current.getTime())) dates.push(new Date(current));
    if (type === "week") current.setDate(current.getDate() + 7);
    else if (type === "biWeek") current.setDate(current.getDate() + 14);
    else if (type === "month") current.setMonth(current.getMonth() + 1);
  }
  return dates;
}

export default async function handler(req, res) {
  try {
    const db = await getDB();
    const eventsCollection = db.collection("events");

    switch (req.method) {
      case "POST": { // create
        const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const required = ["eType", "date", "startTime", "endTime", "title"];
        for (const f of required) if (!event[f]) return res.status(400).json({ error: `Missing field: ${f}` });
        if (!PRIORITY[event.eType]) return res.status(400).json({ error: `Unknown event type: ${event.eType}` });

        const dates = event.recurring ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum) : [new Date(event.date)];
        const seriesId = event.recurring ? uuidv4() : null;
        const insertedIds = [];

        for (let i = 0; i < dates.length; i++) {
          const dateStr = dates[i].toISOString().split("T")[0];
          const doc = {
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
            isParent: i === 0 && !!event.recurring,
            seriesId: seriesId,
            recurWhen: event.recurWhen || null,
            recurLengthNum: event.recurLengthNum || null,
            createdAt: new Date(),
            depositPaid: event.eType.toLowerCase() === "paid" ? false : null,
            feePaid: event.eType.toLowerCase() === "paid" ? false : null
          };

          const result = await eventsCollection.insertOne(doc);
          insertedIds.push(result.insertedId);
        }

        return res.status(200).json({ success: true, inserted: insertedIds });
      }

      case "PUT": { // update
        const { id, ...fields } = req.body;
        if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

        await eventsCollection.updateOne({ _id: new ObjectId(id) }, { $set: fields });
        return res.status(200).json({ success: true, id });
      }

      case "DELETE": {
        const { id } = req.body;
        if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

        await eventsCollection.deleteOne({ _id: new ObjectId(id) });
        return res.status(200).json({ success: true });
      }

      case "PATCH": { // toggle payment
        const { id, field } = req.body;
        if (!id || !["depositPaid", "feePaid"].includes(field)) return res.status(400).json({ error: "Invalid request" });

        await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          [{ $set: { [field]: { $not: `$${field}` } } }]
        );
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }

  } catch (err) {
    console.error("EVENT API ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
