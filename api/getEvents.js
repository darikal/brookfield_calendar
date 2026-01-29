import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

/**
 * Expand recurring events based on YOUR schema
 */
function expandRecurringEvent(event, month, year) {
  if (!event.recurring) return [event];

  const results = [];
  const start = new Date(event.date);

  const count = parseInt(event.recurLengthNum || "0", 10);
  if (!count || count <= 0) return [];

  for (let i = 0; i < count; i++) {
    const d = new Date(start);

    if (event.recurWhen === "week") {
      d.setDate(start.getDate() + i * 7);
    } else if (event.recurWhen === "biWeek") {
      d.setDate(start.getDate() + i * 14);
    } else if (event.recurWhen === "month") {
      d.setMonth(start.getMonth() + i);
    }

    const eventMonth = d.getMonth() + 1; // FIXED
    const eventYear = d.getFullYear();

    if (
      (month !== undefined && eventMonth !== month) ||
      (year !== undefined && eventYear !== year)
    ) {
      continue;
    }

    results.push({
      ...event,
      date: d.toISOString().split("T")[0]
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
    const { month, year, admin } = req.query;

    const monthNum = month ? parseInt(month, 10) : undefined;
    const yearNum = year ? parseInt(year, 10) : undefined;
    const isAdminView = admin === "true";

    const client = await clientPromise;
    const db = client.db("calendar");

    const baseQuery =
      monthNum && yearNum
        ? {
            date: {
              $gte: `${yearNum}-${String(monthNum).padStart(2, "0")}-01`,
              $lte: `${yearNum}-${String(monthNum).padStart(2, "0")}-31`
            }
          }
        : {};

    const rawEvents = await db
      .collection("events")
      .find(baseQuery)
      .toArray();

    const user = await getUserFromSession(req, db);
    const role = user?.role || "guest";

    let events = rawEvents.flatMap(ev =>
      expandRecurringEvent(ev, monthNum, yearNum)
    );

    // Sanitize for non-admin calendar view
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
    res.status(500).json([]);
  }
}
