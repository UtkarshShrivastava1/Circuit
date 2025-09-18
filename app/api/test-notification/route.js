import { initIO } from "@/lib/socket"; // make sure this is your io setup

export async function POST(req) {
  try {
    const { recipientId, message } = await req.json();

    if (!recipientId || !message) {
      return Response.json(
        { error: "recipientId and message required" },
        { status: 400 }
      );
    }

    const io = initIO();
    const notif = {
      id: Date.now(),
      title: "Test Notification",
      message,
      timestamp: new Date(),
    };

    io.to(recipientId).emit("notification", notif);

    return Response.json({ success: true, notif });
  } catch (err) {
    console.error("Error sending POST notification:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const recipientId = searchParams.get("recipientId");
    const message = searchParams.get("message") || "Hello from GET route!";

    if (!recipientId) {
      return Response.json(
        { error: "recipientId is required" },
        { status: 400 }
      );
    }

    const io = initIO();
    const notif = {
      id: Date.now(),
      title: "Test Notification (GET)",
      message,
      timestamp: new Date(),
    };

    io.to(recipientId).emit("notification", notif);

    return Response.json({ success: true, notif });
  } catch (err) {
    console.error("Error sending GET notification:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
