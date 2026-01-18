import clientPromise from "./_db.js";
import bcrypt from "bcryptjs";

export async function getDB() {
  const client = await clientPromise;
  return client.db();
}

export async function verifyUser(username, password) {
  const db = await getDB();
  const user = await db.collection("users").findOne({ username });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}
