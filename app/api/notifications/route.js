import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Notification from "@/app/models/Notification";


export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // console.log('Searching for notifications with email:', email);

    const notifications = await Notification.find({
      "toEmail.email": email
    })
    .sort({ createdAt: -1 })
    .lean();

    // console.log(`Found ${notifications.length} notifications`);

    return NextResponse.json(notifications);
    
  } catch (error) {
    console.error("Error in notifications GET route:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch notifications",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
}
export async function POST(req) {
  try {
    await dbConnect();

    const data = await req.json();
    console.log('Received notification data:', data);

    // Improved validation
    if (!data.fromEmail) {
      return NextResponse.json({ error: "Sender email is required" }, { status: 400 });
    }
    if (!data.msg?.msgcontent) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }
    if (!Array.isArray(data.toEmail) || data.toEmail.length === 0) {
      return NextResponse.json({ error: "Recipients are required" }, { status: 400 });
    }

    // Create new notification with validation
    const notification = await Notification.create({
      fromEmail: data.fromEmail,
      msg: {
        msgcontent: data.msg.msgcontent,
        source: data.msg.source || "No Files"
      },
      dataTo: data.dataTo || "private",
      toEmail: data.toEmail.map(recipient => ({
        email: recipient.email,
        state: "unread"
      })),
      date: data.date || new Date().toISOString()
    });

    console.log('Notification created:', notification);

    return NextResponse.json(
      { message: "Notification created successfully", notification },
      { status: 201 }
    );
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { 
        error: "Failed to create notification",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}