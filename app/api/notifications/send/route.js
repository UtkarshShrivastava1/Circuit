import { sendNotification } from "@/lib/notifications";

export async function POST(req) {
  try {
    const { recipientId, ...notificationData } = await req.json();
    await sendNotification(recipientId, notificationData);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return Response.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
