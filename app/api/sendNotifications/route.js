// /app/api/notifications/route.js
import dbConnect from "@/lib/mongodb";
import Alert from "@/app/models/Notification.model";

export async function POST(req) {
  await dbConnect();
  const { senderId, receiverId, message } = await req.json();

  const notification = await Alert.create({ senderId, receiverId, message });
  return new Response(JSON.stringify(notification), { status: 201 });
}

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const notifications = await Alert.find({ receiverId: userId }).sort({ createdAt: -1 });
  return new Response(JSON.stringify(notifications), { status: 200 });
}
