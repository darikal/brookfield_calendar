import clientPromise from "./_db.js";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");
    const collection = db.collection("events");

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // If recurring, store as one series
    if (body.recurType && body.recurCount) {
      const seriesId = uuidv4();
      const eventDoc = {
        ...body,
        seriesId,
        recurrence: {
          type: body.recurType, // week, biWeek, month
          count: body.recurCount,
          startDate: body.date
        },
        exceptions: []
      };
      await collection.insertOne(eventDoc);
      res.status(200).json({ success: true, seriesId });
    } else {
      // Single event
      const result = await collection.insertOne(body);
      res.status(200).json({ success: true, id: result.insertedId });
    }

  } catch (err) {
    console.error("ADD EVENTS ERROR:", err);
    res.status(500).json({ error: "DB insert failed" });
  }
}
