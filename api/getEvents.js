import clientPromise from "./_db.js";
import { getDB } from "./_auth.js";
import { ObjectId } from "mongodb";

// Expand recurring events for the given month/year
function expandRecurring(event, month, year) {
  const occurrences = [];
  if (!event.recurrence) return [event];

  const { type, count, startDate } = event.recurrence;
  let baseDate = new Date(startDate);

  for (let i = 0; i < count; i++) {
    let d = new Date(baseDate);
    if (type === "week") d.setDate(baseDate.getDate() + 7 * i);
    if (type === "biWeek") d.setDate(baseDate.getDate() + 14 * i);
    if (type === "month") d.setMonth(baseDate.getMonth() + i);

    if (event.exceptions?.includes(d.toISOString().split("T")[0])) continue;

    // If month/year provided, filter by them
    if ((month === undefined || d.getMonth() === month) && 
        (year === undefined || d.getFullYear() === year)) {
      occurrences.push({ ...event, date: d.toISOString().split("T")[0] });
    }
  }
  return occurrences;
}

// Get user from session cookie
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

export default async function handler(req, res) {
  try {
    const query = req.query;
    const isAdminView = query.admin === "true"; // admin panel request
    const month = query.month !== undefined ? parseInt(query.month) : undefined;
    const year = query.year !== undefined ? parseInt(query.year) : undefined;

    const client = await clientPromise;
    const db = client.db("calendarDB");
    const allEvents = await db.collection("events").find({}).toArray();

    const user = await getUserFromSession(req);
    const role = user?.role || "guest";

    // Expand recurring events
    let events = allEvents.flatMap(ev => expandRecurring(ev, month, year));

    // Sanitize for non-admins unless admin panel request
    events = events.map(ev => {
      if (isAdminView) return ev; // admin panel sees everything

      if (role === "admin" || role === "subAdmin") return ev;
      if (role === "socialCommittee" && ev.eType === "socialCommitteeEvent") return ev;

      const sanitized = { ...ev };
      delete sanitized.contactName;
      delete sanitized.contactInfo;
      delete sanitized.residentAddress;
      delete sanitized.residentName;
      return sanitized;
    });

    res.status(200).json(events);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
}
