import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  announcements: [
    {
      title: { type: String, required: true },
      message: { type: String, required: true },
      date: { type: String, required: true }, // YYYY-MM-DD
      createdBy: { type: String, required: true }, // email or userId
    },
  ],
});

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", AnnouncementSchema);
