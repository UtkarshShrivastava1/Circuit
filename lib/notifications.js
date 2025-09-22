import dbConnect from "./mongodb";
import Notification from "@/app/models/Notification.model";
import NotificationPermission from "@/app/models/NotificationPermission";
import webpush from "./webpush"; 

// call getIO via server res.socket.server.io or import getIO if you exported it.

export async function sendNotification({ recipientId, senderId=null, type='system', message, link=null, io=null }) {
  await dbConnect();

  // 1) save in DB
  const notif = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    message,
    link
  });

  // 2) emit via socket.io to a user room (if io provided)
  try {
    if (io) {
      io.to(`user_${recipientId}`).emit("notification", notif);
    } else if (global?.This?.io) {
      global.This.io.to(`user_${recipientId}`).emit("notification", notif);
    }
  } catch (e) {
    // not fatal
    console.warn("Socket emit failed", e);
  }

  // 3) find push subscriptions and send web push
  const subs = await NotificationPermission.find({ user: recipientId });
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        s.subscription,
        JSON.stringify({ title: "New Notification", message, url: link || "/" })
      );
    } catch (err) {
      console.error("webpush error", err);
      // remove invalid subscription (410 / NotRegistered) to clean DB
      if (err.statusCode === 410 || err.body?.includes("not a valid")) {
        try {
          await NotificationPermission.deleteOne({ _id: s._id });
        } catch (deleteErr) {
          console.error("Failed to delete invalid subscription", deleteErr);
        }
      }
    }
  }

  return notif;
}
