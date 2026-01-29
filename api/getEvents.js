import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

/**
 * Expand recurring events based on stored schema
 * Only expands events marked recurring === true
 */
function expandRecurringEvent(event) {
  if (!event.recurring) return [event];

  const results = [];
  const startDate = new Date(event.date);
  const total = parseInt(event.recurLengthNum, 10) || 0;
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
      _parentId: event._id // useful for debugging/future edits
    });
  }

  return results;
}

/**
 * Get user from session cookie
 */
async function getUserFromSession(req, db) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  try {
    return await db.collection("users").findOne({
      _id: new ObjectId(session),
      active: true
    });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const isAdminView = req.query.admin === "true";

    const client = await clientPromise;

    // ✅ Connect to correct database
    const db = client.db("calendarDB");

    // ALWAYS fetch all events from calendarDB.events
    const rawEvents = await db.collection("events").find({}).toArray();

    // Expand recurring events
    let events = rawEvents.flatMap(ev => expandRecurringEvent(ev));

    // Auth-based sanitization
    const user = await getUserFromSession(req, db);
    const role = user?.role || "guest";

    events = events.map(ev => {
      if (isAdminView || role === "admin" || role === "subAdmin") return ev;

      // Public view: remove private fields
      const clean = { ...ev };
      delete clean.contactName;
      delete clean.contactInfo;
      delete clean.residentName;
      delete clean.residentAddress;
      return clean;
    });

    res.status(200).json(events);
  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    // Always return an array to prevent frontend crashes
    res.status(200).json([]);
  }
}
