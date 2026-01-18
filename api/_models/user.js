import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  role: {
    type: String,
    enum: ["admin", "socialCommittee", "subAdmin"]
  },
  active: { type: Boolean, default: true }
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
