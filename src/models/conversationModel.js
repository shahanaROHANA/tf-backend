import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  title: { type: String, default: "New conversation" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("Conversation", conversationSchema);
