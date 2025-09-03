import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  fromEmail: {
    type: String,
    required: true
  },
  msg: {
    msgcontent: {
      type: String,
      required: true
    },
    source: {
      type: String,
      default: "No Files"
    }
  },
  dataTo: {
    type: String,
    enum: ["public", "private"],
    default: "private"
  },
  toEmail: [{
    email: {
      type: String,
      required: true
    },
    state: {
      type: String,
      enum: ["read", "unread"],
      default: "unread"
    }
  }],
  date: {
    type: String,
    default: () => new Date().toISOString()
  }
}, {
  timestamps: true
});

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;