import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

function expandRecurringEvent(ev) {
  if (!ev.recurring) return [ev];

  const out = [];
  const start = new Date(ev.date);
  const total = parseInt(ev.recurLengthNum, 10) || 1;

  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    if (ev.recurWhen === "week") d.setDate(start.getDate() + i * 7);
    else if (ev.recurWhen === "biWeek") d.setDate(start.getDate() + i * 14);
    else if (ev.recurWhen === "month") d.setMonth(start.getMonth() + i);

    out.push({
      ...ev,
      date: d.toISOString().split("T")[0],
      _parentId: ev._id
    });
  }
  return out;
}

async function getUserFromSession(req, db) {
  const cookie = req.headers.cookie || "";
  const session = cookie.split(";").find(c => c.trim().startsWith("session="))?.split("=")[1];
  if (!session) return null;
  try {
    return await db.collection("users").findOne({ _id: new ObjectId(session), active: true });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const isAdmin = req.query.admin === "true";
    const month = req.query.month !== undefined ? parseInt(req.query.month, 10) : undefined;
    const year = req.query.year !== undefined ? parseInt(req.query.year, 10) : undefined;

    const client = await clientPromise;
    const db = client.db("calendar");

    const rawEvents = await db.collection("events").find({}).toArray();

    let events = rawEvents.flatMap(ev => expandRecurringEvent(ev));

    if (month !== undefined && year !== undefined) {
      events = events.filter(ev => {
        const d = new Date(ev.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });
    }

    const user = await getUserFromSession(req, db);
    const role = user?.role || "guest";

    events = events.map(ev => {
      if (isAdmin || role === "admin" || role === "subAdmin") return ev;
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
