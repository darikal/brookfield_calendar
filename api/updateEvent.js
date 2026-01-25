import { getDb } from "./_db.js";
import { ObjectId } from "mongodb";

const PRIORITY = {
  paid: 4,
  social: 3,
  large: 2,
  small: 1
};

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = await getDb();
  const event = req.body;

  const conflicts = await db.collection("events").find({
    _id: { $ne: new ObjectId(event._id) },
    date: event.date,
    startTime: { $lt: event.endTime },
    endTime: { $gt: event.startTime }
  }).toArray();

  const blockingConflicts = conflicts.filter(existing => {
    return PRIORITY[existing.eventType] >= PRIORITY[event.eventType];
  });

  if (blockingConflicts.length && !event.overrideApproved) {
    return res.status(409).json({
      error: "conflict",
      conflicts: blockingConflicts
    });
  }

  await db.collection("events").updateOne(
    { _id: new ObjectId(event._id) },
    { $set: event }
  );

  res.json({ success: true });
}
