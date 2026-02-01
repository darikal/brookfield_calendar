import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

/**
 * Expand recurring events
 * Only expands events that are marked recurring AND isParent === true
 */
function expandRecurringEvent(event) {
  if (!event.recurring || !event.isParent) return [event];

  const results = [];
  const startDate = new Date(event.date);
  const total = parseInt(event.recurLengthNum, 10) || 0;

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
      _parentId: event._id,
      isParent: i === 0 // mark only the first occurrence as parent
    });
  }

  return results;
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");

    // Fetch all events from the database
    const rawEvents = await db.collection("events").find({}).toArray();

    // Expand recurring events but only from parent events
    let events = rawEvents
      .filter(ev => ev.isParent || !ev.recurring) // include single events and recurring parents only
      .flatMap(ev => expandRecurringEvent(ev));

    // Return events
    res.status(200).json(events);
  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(200).json([]);
  }
}
