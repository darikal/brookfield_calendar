import clientPromise from "./_db.js";
import { getDB } from "./auth/_auth.js";
import { ObjectId } from "mongodb";
import crypto from "crypto";

/* ---------------- HELPERS ---------------- */

async function getUserFromSession(req) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  const db = await getDB();
  return await db.collection("users").findOne({ _id: new ObjectId(session) });
}

function canCreateEvent(role, eType) {
  if (role === "admin" || role === "subAdmin") return true;

  if (role === "socialCommittee") {
    return eType === "socialCommitteeEvent";
  }

  // guests + residents
  return ["smallGroup", "noSocialnoPaid"].includes(eType);
}

function timesOverlap(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && bStart < aEnd;
}

/* ---------------- HANDLER ---------------- */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const {
      date,
      startTime,
      endTime,
      eType
    } = body;

    if (!date || !eType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    /* ---------- AUTH / ROLE ---------- */

    const user = await getUserFromSession(req);
    const role = user?.role || "guest";

    if (!canCreateEvent(role, eType)) {
      return res.status(403).json({ error: "Not allowed to create this event type" });
    }

    /* ---------- TIME COLLISION CHECK ---------- */

    const client = await clientPromise;
    const db = client.db("calendarDB");

    const existingEvents = await db.collection("events").find({
      date
    }).toArray();

    for (const ev of existingEvents) {
      if (timesOverlap(startTime, endTime, ev.startTime, ev.endTime)) {
        return res.status(409).json({
          error: "Time slot already booked"
        });
      }
    }

    /* ---------- OWNERSHIP ---------- */

    let ownership = {};

    if (user) {
      ownership = {
        createdBy: user._id,
        createdByRole: role
      };
    } else {
      // guest
      const guestId =
        req.cookies?.guestId ||
        crypto.randomUUID();

      ownership = {
        createdByGuest: guestId,
        createdByRole: "guest"
      };

      // persist guest ID
      res.setHeader(
        "Set-Cookie",
        `guestId=${guestId}; Path=/; Max-Age=31536000; SameSite=Strict`
      );
    }

    /* ---------- PAID EVENT HANDLING ---------- */

    if (eType === "reservedPaid" && role !== "admin" && role !== "subAdmin") {
      body.paymentStatus = "pending_admin_approval";
    }

    /* ---------- INSERT ---------- */

    const eventDoc = {
      ...body,
      ...ownership,
      createdAt: new Date()
    };

    const result = await db.collection("events").insertOne(eventDoc);

    res.status(200).json({
      success: true,
      id: result.insertedId
    });

  } catch (err) {
    console.error("ADD EVENT ERROR:", err);
    res.status(500).json({ error: "Failed to add event" });
  }
}
