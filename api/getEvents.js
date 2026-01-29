import clientPromise from "./_db.js";
import { ObjectId } from "mongodb";

/**
 * Get logged-in user from session cookie
 */
async function getUserFromSession(req, db) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  try {
    return await db
      .collection("users")
      .findOne({ _id: new ObjectId(session), active: true });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const { month, year, admin } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Missing month or year" });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const isAdminView = admin === "true";

    const client = await clientPromise;
    const db = client.db("calendar");

    // Build date range ONCE
    const start = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
    const end = `${yearNum}-${String(monthNum).padStart(2, "0")}-31`;

    // 🔒 SINGLE SOURCE OF TRUTH
    const events = await db
      .collection("events")
      .find({
        date: { $gte: start, $lte: end }
      })
      .sort({ date: 1, startTime: 1 })
      .toArray();

    const user = await getUserFromSession(req, db);
    const role = user?.role || "guest";

    const sanitized = events.map(ev => {
      if (isAdminView || role === "admin" || role === "subAdmin") {
        return ev;
      }

      const clean = { ...ev };
      delete clean.contactName;
      delete clean.contactInfo;
      delete clean.residentName;
      delete clean.residentAddress;
      return clean;
    });

    res.status(200).json(sanitized);
  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    res.status(500).json([]);
  }
}
