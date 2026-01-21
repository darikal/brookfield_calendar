import clientPromise from "./_db.js";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

// Get database instance
export async function getDB() {
  const client = await clientPromise;
  return client.db("calendarDB"); // <-- make sure your DB name matches
}

// Verify user credentials
export async function verifyUser(username, password) {
  const db = await getDB();
  const user = await db.collection("users").findOne({ username });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}

// Get user from session cookie
export async function getUserFromSession(req) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  const db = await getDB();
  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(session) });
    return user || null;
  } catch (err) {
    console.error("Error fetching user from session:", err);
    return null;
  }
}
