import mongoose from "mongoose";

// Participant schema
const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // reference User model
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  roleInProject: {
    type: String,
    required: true,
  }, // e.g. "frontend", "tester", etc.
  responsibility: {
    type: String,
    required: true,
  },
});

// Announcement schema (embedded)
const announcementSchema = new mongoose.Schema({
  msg: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
  postedBy: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  file: { type: String, default: "No Files" },
  originalName: { type: String },
});

// Main project schema
const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: /^[a-zA-Z0-9-_ ]+$/,
    },
    projectState: {
      type: String,
      enum: ["ongoing", "deployment", "completed", "paused", "cancelled"],
      default: "ongoing",
    },
    projectDomain: {
      type: String,
      default: "",
      trim: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },

    // Manager reference
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: { type: [participantSchema], default: [] },

    // Add announcements array (embedded subdocuments)
    announcements: { type: [announcementSchema], default: [] },
  },
  { timestamps: true }
);

const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
