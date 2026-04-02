import { getDB } from "./_db.js";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";

const PRIORITY = {
  reservedPaid: 4,
  socialCommitteeEvent: 3,
  noSocialnoPaid: 2,
  smallGroup: 1,
  boardMeeting: 5
};

// ------------------------
// LOCAL DATE HELPERS
// ------------------------

// Parse "YYYY-MM-DD" as local Date
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Format Date object as "YYYY-MM-DD"
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ------------------------
// MONTHLY HELPER (NEW)
// ------------------------
function getNthWeekdayOfMonth(year, month, weekday, nth) {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();

  let offset = weekday - firstWeekday;
  if (offset < 0) offset += 7;

  let day = 1 + offset + (nth - 1) * 7;

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  // If nth doesn't exist (like 5th Wednesday), fallback to last occurrence
  if (day > lastDayOfMonth) {
    day -= 7;
  }

  return new Date(year, month, day);
}

// ------------------------
// RECURRING DATES GENERATOR (UPDATED)
// ------------------------
function generateRecurringDates(startDate, type, lengthNum) {
  const dates = [];
  const count = parseInt(lengthNum, 10) || 0;

  const original = parseLocalDate(startDate);
  if (isNaN(original.getTime())) return dates;

  const weekday = original.getDay();
  const nth = Math.ceil(original.getDate() / 7);

  for (let i = 0; i < count; i++) {
    let current;

    if (type === "week") {
      current = new Date(original);
      current.setDate(original.getDate() + i * 7);

    } else if (type === "biWeek") {
      current = new Date(original);
      current.setDate(original.getDate() + i * 14);

    } else if (type === "month") {
      const temp = new Date(original);
      temp.setMonth(original.getMonth() + i);

      current = getNthWeekdayOfMonth(
        temp.getFullYear(),
        temp.getMonth(),
        weekday,
        nth
      );

    } else {
      current = new Date(original);
    }

    if (!isNaN(current.getTime())) {
      dates.push(current);
    }
  }

  return dates;
}

// ------------------------
// API HANDLER
// ------------------------
export default async function handler(req, res) {
  try {
    const db = await getDB();
    const eventsCollection = db.collection("events");

    switch (req.method) {

      // ------------------------
      // GET EVENTS
      // ------------------------
      case "GET": {
        const { admin, cutoff } = req.query;
        const query = {};
        if (admin === "true" && cutoff) {
          query.date = { $gte: cutoff.split("T")[0] };
        }

        const events = await eventsCollection.find(query).toArray();

        // Sort by local date + time
        events.sort(
          (a, b) =>
            parseLocalDate(a.date).getTime() +
            ((a.startTime || "00:00").split(":")[0] * 3600000 + (a.startTime || "00:00").split(":")[1] * 60000) -
            (parseLocalDate(b.date).getTime() +
            ((b.startTime || "00:00").split(":")[0] * 3600000 + (b.startTime || "00:00").split(":")[1] * 60000))
        );

        return res.status(200).json(events);
      }

      // ------------------------
      // CREATE EVENT
      // ------------------------
      case "POST": {
        const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const required = ["eType", "date", "startTime", "endTime", "title"];
        for (const f of required) {
          if (!event[f]) return res.status(400).json({ error: `Missing field: ${f}` });
        }
        if (!PRIORITY[event.eType]) return res.status(400).json({ error: `Unknown event type: ${event.eType}` });

        const isRecurring = !!event.recurring;
        const dates = isRecurring
          ? generateRecurringDates(event.date, event.recurWhen, event.recurLengthNum)
          : [parseLocalDate(event.date)];

        const seriesId = isRecurring ? uuidv4() : null;
        const insertedIds = [];

        for (let i = 0; i < dates.length; i++) {
          const dateStr = formatLocalDate(dates[i]);

          const doc = {
            eType: event.eType,
            date: dateStr,
            startTime: event.startTime,
            endTime: event.endTime,
            title: event.title,
            description: event.description || "",
            groupSize: event.groupSize || "",
            contactName: event.contactName || "",
            contactInfo: event.contactInfo || "",
            addedBy: event.addedBy || "unknown",
            recurring: isRecurring,
            isParent: i === 0 && isRecurring,
            seriesId: seriesId,
            recurWhen: event.recurWhen || null,
            recurLengthNum: event.recurLengthNum || null,
            createdAt: new Date(),
            depositPaid: event.eType.toLowerCase() === "reservedpaid" ? false : null,
            feePaid: event.eType.toLowerCase() === "reservedpaid" ? false : null,
            walkIns: !!event.walkIns,
            walkInStatus: event.walkInStatus || "open",
            walkInContact: event.walkInContact || ""
          };

          const result = await eventsCollection.insertOne(doc);
          insertedIds.push(result.insertedId);
        }

        return res.status(200).json({ success: true, inserted: insertedIds });
      }

      // ------------------------
      // UPDATE EVENT
      // ------------------------
      case "PUT": {
        const { id, singleEdit, ...fields } = req.body;
        if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

        if ("walkIns" in fields) fields.walkIns = !!fields.walkIns;
        if ("walkInStatus" in fields) fields.walkInStatus = fields.walkInStatus || "open";
        if ("walkInContact" in fields) fields.walkInContact = fields.walkInContact || "";

        const parent = await eventsCollection.findOne({ _id: new ObjectId(id) });
        if (!parent) return res.status(404).json({ error: "Event not found" });

        await eventsCollection.updateOne({ _id: new ObjectId(id) }, { $set: fields });

        if (!singleEdit && parent.recurring && parent.isParent) {

          await eventsCollection.deleteMany({
            seriesId: parent.seriesId,
            _id: { $ne: parent._id }
          });

          const dates = generateRecurringDates(
            fields.date || parent.date,
            fields.recurWhen || parent.recurWhen,
            fields.recurLengthNum || parent.recurLengthNum
          );

          for (let i = 0; i < dates.length; i++) {
            if (i === 0) continue;

            const dateStr = formatLocalDate(dates[i]);

            const child = {
              ...fields,
              date: dateStr,
              isParent: false,
              seriesId: parent.seriesId,
              createdAt: new Date(),
              depositPaid: fields.eType?.toLowerCase() === "reservedpaid" ? false : null,
              feePaid: fields.eType?.toLowerCase() === "reservedpaid" ? false : null
            };

            await eventsCollection.insertOne(child);
          }
        }

        return res.status(200).json({ success: true, id });
      }

      // ------------------------
      // DELETE EVENT
      // ------------------------
      case "DELETE": {
        const { id } = req.body;
        if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

        const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
        if (!event) return res.status(404).json({ error: "Event not found" });

        if (event.isParent && event.recurring) {
          await eventsCollection.deleteMany({ seriesId: event.seriesId });
        } else {
          await eventsCollection.deleteOne({ _id: new ObjectId(id) });
        }

        return res.status(200).json({ success: true });
      }

      // ------------------------
      // TOGGLE PAYMENT
      // ------------------------
      case "PATCH": {
        const { id, field } = req.body;
        if (!id || !["depositPaid", "feePaid"].includes(field)) return res.status(400).json({ error: "Invalid request" });

        await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          [{ $set: { [field]: { $not: `$${field}` } } }]
        );
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }

  } catch (err) {
    console.error("EVENT API ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}