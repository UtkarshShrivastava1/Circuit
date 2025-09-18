import mongoose from "mongoose";

const NotificationPermissionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  notificationPermission: { type: String, enum: ["granted", "denied", "default"], required: true },
  time: { type: Date, required: true },
});

export default mongoose.models.NotificationPermission ||
  mongoose.model("NotificationPermission", NotificationPermissionSchema);
