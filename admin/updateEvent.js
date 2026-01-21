import clientPromise from "../_db.js";
import { getDB } from "../auth/_auth.js";
import { ObjectId } from "mongodb";

/* ---------------- HELPERS ---------------- */

async function getUserFromSession(req) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  const db = await getDB();
  return await db.collection("users").findOne({ _id: new ObjectId(session) });
}

function canEditEvent(userRole, event) {
  if (!userRole) return false;
  if (userRole === "admin" || userRole === "subAdmin") return true;
  if (userRole === "socialCommittee") {
    return event.eType === "socialCommitteeEvent";
  }
  return false;
}

/* ---------------- HANDLER ---------------- */

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { eventId, updates, editSeries } = body;

    if (!eventId || !updates) {
      return res.status(400).json({ error: "Missing eventId or updates" });
    }

    const user = await getUserFromSession(req);
    const role = user?.role;

    if (!role) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const client = await clientPromise;
    const db = client.db("calendarDB");
    const collection = db.collection("events");

    const event = await collection.findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (!canEditEvent(role, event)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    /* ---------- Handle recurring series ---------- */
    if (editSeries && event.recurrence) {
      // update all events with same recurrence.startDate and type
      await collection.updateMany(
        {
          "recurrence.startDate": event.recurrence.startDate,
          "recurrence.type": event.recurrence.type
        },
        { $set: updates }
      );
    } else {
      // update only this event
      await collection.updateOne(
        { _id: new ObjectId(eventId) },
        { $set: updates }
      );
    }

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("UPDATE EVENT ERROR:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
}
