import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Alert || mongoose.model("Alert", AlertSchema);
