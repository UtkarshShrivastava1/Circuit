// lib/notifications.js
/**
 * Safe notifications utility.
 *
 * - When imported in the browser, this module provides a no-op sendNotification
 *   to avoid bundling server-only dependencies (mongodb, mongoose, models).
 * - When called on the server, it dynamically imports server-side modules and
 *   performs DB save + socket emit as before.
 */

let sendNotification;

if (typeof window !== "undefined") {
  // Running in browser: provide a safe no-op implementation
  sendNotification = async function (opts = {}) {
    console.warn(
      "[notifications] sendNotification called from browser — no-op. Args:",
      opts
    );
    // Return a shape similar to the server result but empty
    return null;
  };
} else {
  // Running on server: real implementation (dynamic imports to avoid top-level server-only imports)
  sendNotification = async function ({
    recipientId,
    senderId = null,
    type = "system",
    message,
    link = null,
    io = null,
  } = {}) {
    if (!recipientId) throw new Error("recipientId is required");
    if (!message) throw new Error("message is required");

    // Dynamic imports so bundlers don't try to include these in client builds
    const [
      { default: dbConnect },
      mongooseModule,
      NotificationModule,
      PermissionModule,
    ] = await Promise.all([
      import("./mongodb"),
      import("mongoose"),
      import("@/app/models/Notification.model"),
      import("@/app/models/NotificationPermission"),
    ]);

    const mongoose = mongooseModule.default || mongooseModule;
    const Notification = NotificationModule.default || NotificationModule;
    const NotificationPermission = PermissionModule.default || PermissionModule;

    await dbConnect();

    console.log("[notifications] Preparing to send notification", {
      recipientId,
      senderId,
      type,
      message: message.length > 200 ? message.slice(0, 200) + "..." : message,
      link,
    });

    // 1) Save notification in DB
    let notif;
    try {
      notif = await Notification.create({
        recipient: new mongoose.Types.ObjectId(recipientId),
        sender: senderId ? new mongoose.Types.ObjectId(senderId) : null,
        type,
        message,
        link,
        read: false,
      });
      console.log("[notifications] Saved notification:", notif._id.toString());
    } catch (dbErr) {
      console.error("[notifications] Failed to save notification:", dbErr);
      throw dbErr;
    }

    // 2) Emit via socket.io if available
    try {
      const channel = `user_${recipientId}`;
      if (io && typeof io.to === "function") {
        io.to(channel).emit("notification", notif);
        console.log("[notifications] Emitted via provided io to", channel);
      } else if (
        typeof global !== "undefined" &&
        global.io &&
        typeof global.io.to === "function"
      ) {
        global.io.to(channel).emit("notification", notif);
        console.log("[notifications] Emitted via global.io to", channel);
      } else {
        console.log(
          "[notifications] No socket.io instance available; skipping real-time emit"
        );
      }
    } catch (emitErr) {
      console.error("[notifications] Socket emit failed:", emitErr);
    }

    // 3) Optionally: log NotificationPermission records for debugging (no push)
    try {
      const perms = await NotificationPermission.find({
        user: recipientId,
      }).lean();
      console.log(
        `[notifications] Found ${perms.length} NotificationPermission records for ${recipientId}`
      );
    } catch (permErr) {
      console.warn(
        "[notifications] Failed to read NotificationPermission:",
        permErr
      );
    }

    return notif;
  };
}

export { sendNotification };
export default { sendNotification };
