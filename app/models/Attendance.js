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
      // default: () => new Date().setHours(0, 0, 0, 0), // midnight, unique per day
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

// Create compound index for userId and date (truncated to day)
attendanceSchema.index({ userId: 1 }, { unique: false });

// Add a virtual field for date-only comparison and create custom validation
attendanceSchema.pre('save', async function(next) {
  const startOfDay = new Date(this.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(this.date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const existingAttendance = await this.constructor.findOne({
    userId: this.userId,
    date: { $gte: startOfDay, $lte: endOfDay },
    _id: { $ne: this._id } // Exclude current document if updating
  });
  
  if (existingAttendance) {
    const error = new Error('Attendance already marked for today');
    error.code = 11000; // Duplicate key error code
    return next(error);
  }
  next();
});


export default mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);
