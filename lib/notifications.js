// import dbConnect from "./mongodb";
// import mongoose from "mongoose";
// import Alert from "@/app/models/Notification.model";
// import PushSubscription from "@/app/models/PushSubscription";
// import webpush from "./webpush";

// // call getIO via server res.socket.server.io or import getIO if you exported it.

// export async function sendNotification({
//   recipientId,
//   senderId = null,
//   type = "system",
//   message,
//   link = null,
//   io = null,
// }) {
//   await dbConnect();
//   console.log(`Sending notification to: ${recipientId}`);
//   console.log(`Notification type: ${type}`);
//   console.log(`Message: ${message}`);

//   // 1) save in DB
//   try {
//     const notif = await Alert.create({
//       recipient: new mongoose.Types.ObjectId(recipientId),
//       sender: senderId ? new mongoose.Types.ObjectId(senderId) : null,
//       type,
//       message,
//       link,
//     });
//     console.log(`Notification saved: ${notif._id}`);
//   } catch (dbError) {
//     console.error("Failed to save notification:", dbError);
//     throw dbError;
//   }

//   // 2) emit via socket.io to a user room (if io provided)
//   try {
//     if (io) {
//       console.log(
//         `Emitting socket notification via passed io to user_${recipientId}`
//       );
//       io.to(`user_${recipientId}`).emit("notification", notif);
//     } else if (global?.This?.io) {
//       console.log(
//         `Emitting socket notification via global io to user_${recipientId}`
//       );
//       global.This.io.to(`user_${recipientId}`).emit("notification", notif);
//     } else {
//       console.warn("No socket.io instance available for notification");
//     }
//   } catch (e) {
//     console.error("Socket emit failed", e);
//   }

//   // 3) find push subscriptions and send web push
//   console.log("Checking for push subscriptions...");
//   const subs = await PushSubscription.find({
//     userId: new mongoose.Types.ObjectId(recipientId),
//   });

//   console.log(`Found ${subs.length} subscriptions for user: ${recipientId}`);

//   for (const s of subs) {
//     try {
//       console.log(`Sending push to subscription: ${s._id}`);
//       await webpush.sendNotification(
//         s.subscription,
//         JSON.stringify({ title: "New Notification", message, url: link || "/" })
//       );
//       console.log("Push notification sent successfully");
//     } catch (err) {
//       console.error("webpush error", err);
//       // remove invalid subscription (410 / NotRegistered) to clean DB
//       if (err.statusCode === 410 || err.body?.includes("not a valid")) {
//         try {
//           await PushSubscription.deleteOne({ _id: s._id });
//         } catch (deleteErr) {
//           console.error("Failed to delete invalid subscription", deleteErr);
//         }
//       }
//     }
//   }

//   return notif;
// }


import dbConnect from "./mongodb";
import mongoose from "mongoose";
import Alert from "@/app/models/Notification.model";
import PushSubscription from "@/app/models/PushSubscription";
import webpush from "./webpush";

// call getIO via server res.socket.server.io or import getIO if you exported it.

export async function sendNotification({
  recipientId,
  senderId = null,
  type = "system",
  message,
  link = null,
  io = null,
}) {
  await dbConnect();
  console.log(`Sending notification to: ${recipientId}`);
  console.log(`Notification type: ${type}`);
  console.log(`Message: ${message}`);

  // 1) save in DB
  try {
    const notif = await Alert.create({
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

  // 2) emit via socket.io to a user room (if io provided)
  try {
    if (io) {
      console.log(
        `Emitting socket notification via passed io to user_${recipientId}`
      );
      io.to(`user_${recipientId}`).emit("notification", notif);
    } else if (global?.This?.io) {
      console.log(
        `Emitting socket notification via global io to user_${recipientId}`
      );
      global.This.io.to(`user_${recipientId}`).emit("notification", notif);
    } else {
      console.warn("No socket.io instance available for notification");
    }
  } catch (e) {
    console.error("Socket emit failed", e);
  }

  // 3) find push subscriptions and send web push
  console.log("Checking for push subscriptions...");
  const subs = await PushSubscription.find({
    userId: new mongoose.Types.ObjectId(recipientId),
  });

  console.log(`Found ${subs.length} subscriptions for user: ${recipientId}`);

  for (const s of subs) {
    try {
      console.log(`Sending push to subscription: ${s._id}`);
      await webpush.sendNotification(
        s.subscription,
        JSON.stringify({ title: "New Notification", message, url: link || "/" })
      );
      console.log("Push notification sent successfully");
    } catch (err) {
      console.error("webpush error", err);
      // remove invalid subscription (410 / NotRegistered) to clean DB
      if (err.statusCode === 410 || err.body?.includes("not a valid")) {
        try {
          await PushSubscription.deleteOne({ _id: s._id });
        } catch (deleteErr) {
          console.error("Failed to delete invalid subscription", deleteErr);
        }
      }
    }
  }

  return notif;
}
