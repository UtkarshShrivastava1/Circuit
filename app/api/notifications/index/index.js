// pages/api/notifications/index.js
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.query;

    // Find notifications where this user is in `toEmail`
    const notifications = await Notification.find({
      "toEmail.email": email,
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
