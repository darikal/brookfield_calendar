// api/events.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Keep track of MongoDB connection
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  isConnected = true;
  console.log("✅ Connected to MongoDB");
}

// Define Event Schema
const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: String,
  type: String,
  walkInWelcome: Boolean,
});
const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

// ---- ROUTES ----

// Get all events
app.get("/api/events", async (req, res) => {
  try {
    await connectDB();
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new event
app.post("/api/events", async (req, res) => {
  try {
    await connectDB();
    const newEvent = new Event(req.body);
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ⚠️ Remove app.listen(), and instead export app for Vercel
export default app;
