import { getDB } from "./_db.js";

const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const db = await getDB();
    const event = { ...req.body };

    // Remove `id` if present to prevent MongoDB error
    delete event.id;

    if (!event.date || !event.startTime || !event.endTime || !event.eType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Ensure safe string comparison for times
    const conflicts = await db.collection("events").find({
      date: event.date,
      startTime: { $exists: true, $lt: event.endTime },
      endTime: { $exists: true, $gt: event.startTime }
    }).toArray();

    const blockingConflicts = conflicts.filter(existing => {
      return PRIORITY[existing.eType] >= PRIORITY[event.eType];
    });

    if (blockingConflicts.length && !event.overrideApproved) {
      return res.status(409).json({
        error: "conflict",
        conflicts: blockingConflicts
      });
    }

    await db.collection("events").insertOne({
      ...event,
      createdAt: new Date()
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("addEvent error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
