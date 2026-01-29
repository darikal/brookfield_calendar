import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

/**
 * Expand recurring events based on stored schema
 * This ONLY expands events marked recurring === true
 */
function expandRecurringEvent(event) {
  // Non-recurring events pass through unchanged
  if (!event.recurring) {
    return [event];
  }

  const results = [];
  const startDate = new Date(event.date);

  const total = parseInt(event.recurLengthNum, 10);
  if (!total || total <= 0) return [];

  for (let i = 0; i < total; i++) {
    const d = new Date(startDate);

    if (event.recurWhen === "week") {
      d.setDate(startDate.getDate() + i * 7);
    } else if (event.recurWhen === "biWeek") {
      d.setDate(startDate.getDate() + i * 14);
    } else if (event.recurWhen === "month") {
      d.setMonth(startDate.getMonth() + i);
    } else {
      continue;
    }

    results.push({
      ...event,
      date: d.toISOString().split("T")[0],
      _parentId: event._id // helps debugging / future edits
    });
  }

  return results;
}

/**
 * Session → user
 */
async function getUserFromSession(req, db) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  try {
    return await db
      .collection("users")
      .findOne({ _id: new ObjectId(session), active: true });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const isAdminView = req.query.admin === "true";

    const client = await clientPromise;
    const db = client.db("calendar");

    // ALWAYS fetch all base events
    const rawEvents = await db
      .collection("events")
      .find({})
      .toArray();

    // Expand recurring events ONCE
    let events = rawEvents.flatMap(ev => expandRecurringEvent(ev));

    // Auth-based sanitization
    const user = await getUserFromSession(req, db);
    const role = user?.role || "guest";

    events = events.map(ev => {
      // Admin & admin panel see everything
      if (isAdminView || role === "admin" || role === "subAdmin") {
        return ev;
      }

      // Public view: strip private fields
      const clean = { ...ev };
      delete clean.contactName;
      delete clean.contactInfo;
      delete clean.residentName;
      delete clean.residentAddress;
      return clean;
    });

    // ALWAYS return an array
    res.status(200).json(events);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    // Never break the frontend contract
    res.status(200).json([]);
  }
}
