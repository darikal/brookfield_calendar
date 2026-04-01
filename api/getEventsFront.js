// /api/getEventsFront.js
import clientPromise from "./_db.js";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");

    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0); // normalize to start of today

    const rawEvents = await db.collection("events")
      .find({}, {
        projection: {
          _id: 1,
          title: 1,
          date: 1,
          startTime: 1,
          endTime: 1,
          eType: 1,
          description: 1,
          recurring: 1,
          seriesId: 1,
          contactName: 1,
          contactInfo: 1,
          depositPaid: 1,
          feePaid: 1,
          walkIns: 1,
          walkInStatus: 1,
          walkInContact: 1
        }
      })
      .toArray();

    // ✅ Only future + today events
    const events = rawEvents
      .filter(ev => {
        if (!ev.date) return false;
        const eventDate = new Date(ev.date);
        return eventDate >= fromDate;
      })
      .sort((a, b) => {
        const aDate = new Date(a.date + "T" + (a.startTime || "00:00"));
        const bDate = new Date(b.date + "T" + (b.startTime || "00:00"));
        return aDate - bDate;
      });

    res.status(200).json(events);

  } catch (err) {
    console.error("GET EVENTS FRONT ERROR:", err);
    res.status(200).json([]);
  }
}