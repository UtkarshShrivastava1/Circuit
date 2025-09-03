import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: () => new Date().setHours(0, 0, 0, 0), // midnight, unique per day
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "pending"],
      default: "pending",
    },
     workMode: {
      type: String,
      enum: ["office", "wfh"],
      required: true, // mandatory
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true }); // prevent duplicate for same day

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);
