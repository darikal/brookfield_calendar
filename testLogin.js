import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI in .env");

async function testLogin(username, password) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("calendar"); // make sure this matches your DB name
    const user = await db.collection("users").findOne({ username });
    if (!user) {
      console.log("User not found");
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (valid) {
      console.log("Login successful!");
      console.log("User role:", user.role);
    } else {
      console.log("Invalid password");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

// Replace with your test credentials
testLogin("webadmin", "test");
