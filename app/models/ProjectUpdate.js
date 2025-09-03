// models/ProjectUpdate.js
import mongoose from "mongoose";

const WorkUpdateSchema = new mongoose.Schema({
  msg: { type: String, required: true },
  source: { type: String }, // optional file URL
});

const UpdateSchema = new mongoose.Schema({
  email: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  workUpdate: { type: WorkUpdateSchema, required: true },
});

const ProjectUpdateSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  updates: { type: [UpdateSchema], default: [] },
});

export default mongoose.models.ProjectUpdate ||
  mongoose.model("ProjectUpdate", ProjectUpdateSchema);
