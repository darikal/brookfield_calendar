import clientPromise from "./_db";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
    }

    try {
        const client = await clientPromise;
        const db = client.db("calendarDB");         // auto-creates if missing
        const events = db.collection("events");     // auto-creates if missing

        const eventData = req.body;

        const result = await events.insertOne(eventData);

        res.status(200).json({ success: true, id: result.insertedId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB insert failed" });
    }
}
