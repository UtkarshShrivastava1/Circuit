// pages/api/notifications.js
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {

      const { email, notificationPermission, time } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Invalid or missing email" });
      }
      if (!notificationPermission || typeof notificationPermission !== "string") {
        return res.status(400).json({ message: "Invalid or missing notificationPermission" });
      }
      if (!time || typeof time !== "string") {
        return res.status(400).json({ message: "Invalid or missing time" });
      }

      const user = await User.findOneAndUpdate(
        { email },
        {
          notificationPermission,
          notificationPermissionTime: time,
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({ message: "Notification info saved" });
    } catch (error) {
      console.error("Error saving notification info:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
