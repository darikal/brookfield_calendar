import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function getDB() {
  if (!client.topology?.isConnected()) {
    await client.connect();
  }
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
