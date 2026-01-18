import clientPromise from "./_db.js";
import { requireRole } from "./requireRoles.js";

/**
 * Fetch events filtered by month/year
 * - Admins/SubAdmins see everything
 * - SocialCommittee sees social events fully
 * - Regular users see smallGroup/noSocialnoPaid events and their own events
 * - Sensitive info (email/phone) hidden from others
 */
export default requireRole(["admin","subAdmin","socialCommittee","user"])(async (req,res)=>{
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: "Missing month or year" });

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const client = await clientPromise;
    const db = client.db("calendarDB");
    const allEvents = await db.collection("events").find({}).toArray();

    const user = req.user;

    // ---------------- Expand recurring events ----------------
    const events = allEvents.flatMap(ev => {
      if (!ev.recurrence) return [ev];

      const { type, count, startDate } = ev.recurrence;
      const occurrences = [];

      let baseDate = new Date(startDate);
      for (let i=0;i<count;i++){
        let d = new Date(baseDate);
        if(type==="week") d.setDate(baseDate.getDate()+7*i);
        if(type==="biWeek") d.setDate(baseDate.getDate()+14*i);
        if(type==="month") d.setMonth(baseDate.getMonth()+i);

        if (ev.exceptions?.includes(d.toISOString().split("T")[0])) continue;
        if (d.getMonth()===monthNum && d.getFullYear()===yearNum){
          occurrences.push({ ...ev, date: d.toISOString().split("T")[0] });
        }
      }
      return occurrences;
    });

    // ---------------- Role-based field filtering ----------------
    const filtered = events.map(ev=>{
      const isOwner = ev.userId && ev.userId.toString() === user._id.toString();
      if (["admin","subAdmin"].includes(user.role)) return ev;
      if (user.role === "socialCommittee" && ev.eType === "socialCommitteeEvent") return ev;
      if (isOwner) return ev; // user sees their own events
      // hide sensitive fields
      const { contactInfo, contactName, ...rest } = ev;
      return rest;
    });

    res.status(200).json(filtered);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
});
