import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import Alert from "@/app/models/Notification.model";

/**
 * sendNotification
 * Saves a notification to the DB and emits it via socket.io (if available).
 *
 * Params:
 * - recipientId (string) : required
 * - senderId (string|null)
 * - type (string) default "system"
 * - message (string) required
 * - link (string|null)
 * - io (socket.io instance|null) optional
 */
export async function sendNotification({
  recipientId,
  senderId = null,
  type = "system",
  message,
  link = null,
  io = null,
}) {
  if (!recipientId) {
    throw new Error("recipientId is required");
  }
  if (!message) {
    throw new Error("message is required");
  }

  await dbConnect();

  console.log(
    `Preparing notification -> recipient: ${recipientId}, type: ${type}`
  );

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

  // 2) Emit notification via socket.io if provided (or global.io fallback)
  try {
    const channel = `user_${recipientId}`;
    if (io && typeof io.to === "function") {
      io.to(channel).emit("notification", notif);
      console.log(
        `Emitted notification to socket.io (provided instance) on ${channel}`
      );
    } else if (
      typeof global !== "undefined" &&
      global.io &&
      typeof global.io.to === "function"
    ) {
      global.io.to(channel).emit("notification", notif);
      console.log(
        `Emitted notification to socket.io (global.io) on ${channel}`
      );
    } else {
      console.log("No socket.io instance available — skipping emit");
    }
  } catch (emitErr) {
    console.error("Socket emit failed:", emitErr);
  }

  // 3) Return the saved notification so callers can use it
  return notif;
}
