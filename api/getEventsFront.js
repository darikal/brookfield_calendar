import { getDB } from "./_db.js";

/**
 * Safely parse a date + time as LOCAL time (prevents UTC shift bugs)
 */
function parseLocalDate(dateStr, timeStr = "00:00") {
  if (!dateStr) return null;

  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  return new Date(year, month - 1, day, hour || 0, minute || 0, 0);
}

export default async function handler(req, res) {
  try {
    const db = await getDB();

    // Get today at midnight (LOCAL)
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

    // Filter out past events (using LOCAL parsing)
    const events = rawEvents
      .filter(ev => {
        const eventDate = parseLocalDate(ev.date);
        if (!eventDate) return false;
        return eventDate >= fromDate;
      })
      .sort((a, b) => {
        const aDate = parseLocalDate(a.date, a.startTime);
        const bDate = parseLocalDate(b.date, b.startTime);
        return aDate - bDate;
      });

    // Ensure recurring icon shows for all events in a series
    const seriesMap = {};
    events.forEach(ev => {
      if (ev.seriesId) {
        seriesMap[ev.seriesId] = true;
      }
    });

    const processedEvents = events.map(ev => {
      return {
        ...ev,
        recurring: ev.seriesId && seriesMap[ev.seriesId] ? true : ev.recurring
      };
    });

    res.status(200).json(processedEvents);

  } catch (err) {
    console.error("GET EVENTS FRONT ERROR:", err);
    res.status(200).json([]);
  }
}