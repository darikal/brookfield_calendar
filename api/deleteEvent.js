import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, deleteSeries } = req.body;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid or missing id" });
    }

    const client = await clientPromise;
    const db = client.db("calendarDB");
    const collection = db.collection("events");

    const event = await collection.findOne({
      _id: new ObjectId(id)
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    /* =====================================================
       🗑️ DELETE ENTIRE SERIES
    ===================================================== */
    if (deleteSeries && event.seriesId) {
      await collection.deleteMany({
        seriesId: event.seriesId
      });

      return res.json({
        success: true,
        deletedSeries: true
      });
    }

    /* =====================================================
       🗑️ DELETE SINGLE EVENT
    ===================================================== */
    await collection.deleteOne({
      _id: new ObjectId(id)
    });

    res.json({
      success: true,
      deletedSingle: true
    });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
}