import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

let client;
let clientPromise;

export async function getDB() {
  try {
    if (!clientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 5
      });
      clientPromise = client.connect();
    }

    const connectedClient = await clientPromise;
    return connectedClient.db();
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    throw err;
  }
}
