// // /app/api/notifications/route.js
// import dbConnect from "@/lib/mongodb";
// import Alert from "@/app/models/Notification.model";

// export async function POST(req) {
//   await dbConnect();
//   const { senderId, receiverId, message } = await req.json();

//   const notification = await Alert.create({ senderId, receiverId, message });
//   return new Response(JSON.stringify(notification), { status: 201 });
// }

// export async function GET(req) {
//   await dbConnect();
//   const { searchParams } = new URL(req.url);
//   const userId = searchParams.get("userId");

//   const notifications = await Alert.find({ receiverId: userId }).sort({ createdAt: -1 });
//   return new Response(JSON.stringify(notifications), { status: 200 });
// }

import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import Alert from "@/app/models/Notification.model";
import PushSubscription from "@/app/models/PushSubscription";
import webpush from "@/lib/webpush";

export async function sendNotification({
  recipientId,
  senderId = null,
  type = "system",
  message,
  link = null,
  io = null, // optional socket.io instance
}) {
  await dbConnect();
  console.log(`Sending notification to: ${recipientId}`);
  console.log(`Notification type: ${type}`);
  console.log(`Message: ${message}`);

  // 1) Save notification in DB
  let notif;
  try {
    notif = await Alert.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: senderId ? new mongoose.Types.ObjectId(senderId) : null,
      type,
      message,
      link,
    });
    console.log(`Notification saved: ${notif._id}`);
  } catch (dbError) {
    console.error("Failed to save notification:", dbError);
    throw dbError;
  }

  // 2) Emit notification via socket.io if provided
  try {
    if (io) {
      io.to(`user_${recipientId}`).emit("notification", notif);
    } else if (typeof global !== 'undefined' && global.io) {
      global.io.to(`user_${recipientId}`).emit("notification", notif);
    } else {
      console.warn("No socket.io instance available for notification");
    }
  } catch (e) {
    console.error("Socket emit failed", e);
  }

  // 3) Send Web Push notifications
  try {
    const subscriptions = await PushSubscription.find({
      userId: new mongoose.Types.ObjectId(recipientId),
    });

    console.log(`Found ${subscriptions.length} push subscriptions for user ${recipientId}`);

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title: "New Notification", message, url: link || "/" })
        );
        console.log("Push notification sent successfully");
      } catch (err) {
        console.error("Error sending web push", err);
        if (err.statusCode === 410 || err.body?.includes("not a valid")) {
          await PushSubscription.deleteOne({ _id: sub._id });
          console.log(`Removed invalid subscription ${sub._id}`);
        }
      }
    }
  } catch (err) {
    console.error("Failed to send push notifications", err);
  }

  return notif;
}
