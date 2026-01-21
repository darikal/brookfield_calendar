import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

(async () => {
  try {
    await client.connect();
    console.log("MongoDB connection successful!");
    const db = client.db("calendar");
    console.log(await db.listCollections().toArray());
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
})();
