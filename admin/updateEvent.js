import clientPromise from "../_db.js";
import { getDB } from "../auth/_auth.js";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";

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

function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = parseInt(lengthNum, 10) || 0;
  let current = new Date(startDate);

  for (let i = 0; i < count; i++) {
    dates.push(new Date(current));

    if (type === "week") current.setDate(current.getDate() + 7);
    else if (type === "biWeek") current.setDate(current.getDate() + 14);
    else if (type === "month") current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

/* ---------------- HANDLER ---------------- */

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { eventId, updates, editSeries, makeRecurring } = body;

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

    /* =====================================================
       🔥 CONVERT TO RECURRING (THIS IS WHAT YOU NEEDED)
    ===================================================== */
    if (makeRecurring && updates.recurWhen && updates.recurLengthNum) {
      const seriesId = uuidv4();

      const dates = generateRecurringDates(
        event.date,
        updates.recurWhen,
        updates.recurLengthNum
      );

      // 1. Update original event to be parent
      await collection.updateOne(
        { _id: new ObjectId(eventId) },
        {
          $set: {
            ...updates,
            recurring: true,
            isParent: true,
            seriesId
          }
        }
      );

      // 2. Create future events (skip first date)
      for (let i = 1; i < dates.length; i++) {
        const dateStr = dates[i].toISOString().split("T")[0];

        await collection.insertOne({
          ...event,
          ...updates,
          _id: new ObjectId(),
          date: dateStr,
          recurring: true,
          isParent: false,
          seriesId,
          createdAt: new Date()
        });
      }

      return res.status(200).json({ success: true, seriesCreated: true });
    }

    /* =====================================================
       🔁 EDIT ENTIRE SERIES
    ===================================================== */
    if (editSeries && event.seriesId) {
      await collection.updateMany(
        { seriesId: event.seriesId },
        { $set: updates }
      );

      return res.status(200).json({ success: true, seriesUpdated: true });
    }

    /* =====================================================
       ✏️ SINGLE EVENT UPDATE
    ===================================================== */
    await collection.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: updates }
    );

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("UPDATE EVENT ERROR:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
}