import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function PATCH(req) {
  await dbConnect();
  const token = cookies().get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const { notificationId } = await req.json();

  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: decoded.id },
    { read: true },
    { new: true }
  );

  if (!notif) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, notif });
}
