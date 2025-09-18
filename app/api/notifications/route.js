import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Notification from "@/app/models/Notification";


// ------------------ GET ------------------
export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const role = searchParams.get("role"); // 👈 pass role from frontend
console.log(role)
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    let notifications;

    if (role === "admin") {
      // 👑 Admins see everything
      notifications = await Notification.find({})
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // Regular users see only public + their private ones
      notifications = await Notification.find({
        $or: [
          { dataTo: "public" },
          { "toEmail.email": email }
        ]
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error in notifications GET route:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch notifications",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}



// ------------------ POST ------------------
export async function POST(req) {
  try {
    await dbConnect();

    const data = await req.json();
    console.log("Received notification data:", data);

    // Validation
    if (!data.fromEmail) {
      return NextResponse.json(
        { error: "Sender email is required" },
        { status: 400 }
      );
    }
    if (!data.msg?.msgcontent) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }
    if (!data.dataTo || !["public", "private"].includes(data.dataTo)) {
      return NextResponse.json(
        { error: "dataTo must be 'public' or 'private'" },
        { status: 400 }
      );
    }

    let toEmail = [];

    if (data.dataTo === "private") {
      if (!Array.isArray(data.toEmail) || data.toEmail.length === 0) {
        return NextResponse.json(
          { error: "Recipients are required for private messages" },
          { status: 400 }
        );
      }
      toEmail = data.toEmail.map((recipient) => ({
        email: recipient.email,
        state: "unread",
      }));
    }

    // Create notification
    const notification = await Notification.create({
      fromEmail: data.fromEmail,
      msg: {
        msgcontent: data.msg.msgcontent,
        source: data.msg.source || "No Files",
      },
      dataTo: data.dataTo, // "public" or "private"
      toEmail, // empty if public
      date: data.date || new Date().toISOString(),
    });

    console.log("Notification created:", notification);

    return NextResponse.json(
      { message: "Notification created successfully", notification },
      { status: 201 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      {
        error: "Failed to create notification",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}