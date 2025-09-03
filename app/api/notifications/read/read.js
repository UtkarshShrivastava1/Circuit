// pages/api/notifications/read.js
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { notificationId, email } = req.body;

    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, "toEmail.email": email },
      { $set: { "toEmail.$.state": "read" } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.status(200).json({ success: true, notification: updated });
  } catch (error) {
    console.error("Error marking as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
