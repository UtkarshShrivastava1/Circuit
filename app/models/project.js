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


// Work update schema
const workUpdateSchema = new mongoose.Schema({
  msg: { type: String, required: true },
  source: { type: String }, // optional
});

// Update schema
const updateSchema = new mongoose.Schema({
  email: { type: String, required: true },
  date: { type: String, required: true },
  workUpdate: { type: workUpdateSchema, required: true },
});

// Announcement schema
const announcementSchema = new mongoose.Schema({
  msg: { type: String, required: true },
  date: { type: String, required: true },
  postedBy: { type: String, required: true },
});

// Main project schema
const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: /^[a-zA-Z0-9-_]+$/,
    },
    projectState: {
      type: String,
      enum: ["ongoing", "completed", "paused", "cancelled"],
      default: "ongoing",
    },
    projectDomain: {
      type: String,
      default: "",
      trim: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    
    // ✅ Link to manager (who is a User with role "manager")
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ Other participants
    participants: { type: [participantSchema], default: [] },
  },
  { timestamps: true }
);

const Project =
  mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
