import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

/**
 * Expand recurring events based on stored schema
 */
function expandRecurringEvent(event) {
  if (!event.recurring) return [event];

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
      _parentId: event._id
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
    return await db.collection("users").findOne({ _id: new ObjectId(session), active: true });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const isAdminView = req.query.admin === "true";
    const month = req.query.month !== undefined ? parseInt(req.query.month, 10) : undefined;
    const year = req.query.year !== undefined ? parseInt(req.query.year, 10) : undefined;

    const client = await clientPromise;
    const db = client.db("calendar");

    // Fetch all base events
    const rawEvents = await db.collection("events").find({}).toArray();

    // Expand recurring events
    let events = rawEvents.flatMap(ev => expandRecurringEvent(ev));

    // Filter by month/year if provided
    if (month !== undefined && year !== undefined) {
      events = events.filter(ev => {
        const d = new Date(ev.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
    }

    // Sanitize for non-admin views
    const user = await getUserFromSession(req, db);
    const role = user?.role || "guest";

    events = events.map(ev => {
      if (isAdminView || role === "admin" || role === "subAdmin") return ev;

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
    res.status(200).json([]);
  }
}
