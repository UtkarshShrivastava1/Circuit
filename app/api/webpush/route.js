import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import NotificationPermission from "@/app/models/NotificationPermission";
import webpush from "@/lib/webpush";

export async function POST(req) {
  await dbConnect();
  const { userId, title, message, url } = await req.json();

  const permissions = await NotificationPermission.find({ user: userId });

  for (const perm of permissions) {
    try {
      await webpush.sendNotification(
        perm.subscription,
        JSON.stringify({ title, message, url })
      );
    } catch (err) {
      console.error("Push error", err);
    }
  }

  return NextResponse.json({ success: true });
}
