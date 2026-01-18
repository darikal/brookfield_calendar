import clientPromise from "./_db.js";
import { requireRole } from "./requireRoles.js";

/**
 * Role permissions:
 * - admin: full control
 * - subAdmin: full control except managing other sub-admins
 * - socialCommittee: can only create socialCommitteeEvent
 * - regular users: can create smallGroup or noSocialnoPaid events
 */

export default requireRole(["admin","subAdmin","socialCommittee","user"])(async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const client = await clientPromise;
    const db = client.db("calendarDB");
    const collection = db.collection("events");

    let body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const user = req.user;

    // ---------------- Role enforcement ----------------
    const eType = body.eType;
    if (eType === "socialCommitteeEvent" && !["admin","subAdmin","socialCommittee"].includes(user.role)) {
      return res.status(403).json({ error: "You cannot create social committee events" });
    }

    if (["reservedPaid"].includes(eType) && !["admin","subAdmin"].includes(user.role)) {
      // non-admins cannot confirm paid events
      body.status = "pendingDateConfirmation";
    } else if (!body.status) {
      body.status = "confirmed";
    }

    if (!["admin","subAdmin"].includes(user.role) && eType !== "socialCommitteeEvent") {
      // record ownership for regular users
      body.userId = user._id;
    }

    // ---------------- Recurring processing ----------------
    let occurrences = [];
    if (body.recurType && body.recurCount) {
      const { recurType, recurCount } = body;
      let startDate = new Date(body.date);

      for (let i = 0; i < parseInt(recurCount); i++) {
        let d = new Date(startDate);
        if (recurType === "week") d.setDate(startDate.getDate() + 7*i);
        if (recurType === "biWeek") d.setDate(startDate.getDate() + 14*i);
        if (recurType === "month") d.setMonth(startDate.getMonth() + i);

        occurrences.push({ ...body, date: d.toISOString().split("T")[0] });
      }

      delete body.recurType;
      delete body.recurCount;
    } else {
      occurrences = [body];
    }

    // ---------------- Conflict check ----------------
    for (const ev of occurrences) {
      const start = ev.startTime || "00:00";
      const end = ev.endTime || "23:59";

      const conflicts = await collection.find({
        date: ev.date,
        $or: [
          { 
            startTime: { $lt: end },
            endTime: { $gt: start }
          }
        ]
      }).toArray();

      if (conflicts.length) {
        return res.status(409).json({ error: `Time conflict on ${ev.date} ${start}-${end}` });
      }
    }

    // ---------------- Insert events ----------------
    const result = await collection.insertMany(occurrences);

    res.status(200).json({ success: true, insertedIds: result.insertedIds });

  } catch (err) {
    console.error("ADD EVENT ERROR:", err);
    res.status(500).json({ error: "DB insert failed" });
  }
});
