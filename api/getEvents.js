import clientPromise from "./_db.js";

// Expand recurring events only within a date range
function expandRecurringEvent(event, fromDate, toDate) {
  if (!event.recurring || !event.isParent) return [event];

  const results = [];
  const startDate = new Date(event.date);
  const total = parseInt(event.recurLengthNum, 10) || 0;

  for (let i = 0; i < total; i++) {
    let d = new Date(startDate);
    if (event.recurWhen === "week") d.setDate(startDate.getDate() + i * 7);
    else if (event.recurWhen === "biWeek") d.setDate(startDate.getDate() + i * 14);
    else if (event.recurWhen === "month") d.setMonth(startDate.getMonth() + i);

    if (d < fromDate || d > toDate) continue; // only occurrences in view

    results.push({
      ...event,
      date: d.toISOString().split("T")[0],
      _parentId: event._id,
      isParent: i === 0,
      depositPaid: event.depositPaid || false,
      feePaid: event.feePaid || false,
      contactName: event.contactName || "",
      contactInfo: event.contactInfo || ""
    });
  }

  return results;
}

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");

    // Only next 3 months for admin view
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 3);

    const rawEvents = await db.collection("events")
      .find({}, { projection: {
        _id: 1, title: 1, date: 1, startTime: 1, endTime: 1,
        eType: 1, groupSize: 1, contactName: 1, contactInfo: 1,
        description: 1, recurring: 1, isParent: 1, recurWhen: 1,
        recurLengthNum: 1, depositPaid: 1, feePaid: 1
      }})
      .toArray();

    const events = rawEvents
      .filter(ev => ev.isParent || !ev.recurring)
      .flatMap(ev => expandRecurringEvent(ev, fromDate, toDate));

    res.status(200).json(events);
  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(200).json([]);
  }
}
