import clientPromise from "./_db.js";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const DB_NAME = "calendar";

export async function getDB() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function verifyUser(username, password) {
  const db = await getDB();
  const user = await db.collection("users").findOne({ username, active: true });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}

export async function getUserFromRequest(req) {
  const cookie = req.headers.cookie || "";
  const session = cookie
    .split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!session) return null;

  try {
    const db = await getDB();
    return await db
      .collection("users")
      .findOne({ _id: new ObjectId(session), active: true });
  } catch {
    return null;
  }
}
