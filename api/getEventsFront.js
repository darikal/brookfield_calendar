import { getDB } from "./_db.js";

export default async function handler(req, res) {
  try {
    const db = await getDB();

    // Get today at midnight
    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);

    // Fetch all events
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

    // Filter out past events
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

    // ✅ Ensure recurring icon shows for all series
    const seriesMap = {};
    events.forEach(ev => {
      if (ev.seriesId) seriesMap[ev.seriesId] = true;
    });

    const processedEvents = events.map(ev => {
      if (ev.seriesId && seriesMap[ev.seriesId]) {
        ev.recurring = true; // force recurring icon
      }
      return ev;
    });

    res.status(200).json(processedEvents);

  } catch (err) {
    console.error("GET EVENTS FRONT ERROR:", err);
    res.status(200).json([]);
  }
}