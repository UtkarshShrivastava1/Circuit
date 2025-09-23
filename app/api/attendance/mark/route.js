// app/api/attendance/mark/route.js  (or wherever your route file is)
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import User from "@/app/models/User";
import { verifyToken } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

export async function POST(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { status, workMode } = await req.json();

    if (!workMode) {
      return NextResponse.json(
        { error: "Work mode is required (office or wfh)" },
        { status: 400 }
      );
    }

    // Create date range for today (start and end of day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Use current time for storing
    const currentTime = new Date();

    // Check for existing attendance within today's date range
    const existing = await Attendance.findOne({
      userId: decoded.id,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Attendance already marked for today" },
        { status: 400 }
      );
    }

    const attendance = await Attendance.create({
      userId: decoded.id,
      status: status || "present",
      workMode,
      date: currentTime,
    });

    // --- Send notification email to attendance administrator ---
    (async () => {
      try {
        // Try to get user info for nicer email content
        let userName = decoded.name || decoded.username || null;
        let userEmail = decoded.email || null;

        try {
          const user = await User.findById(decoded.id).select("name email");
          if (user) {
            userName = user.name || userName;
            userEmail = user.email || userEmail;
          }
        } catch (uErr) {
          console.warn(
            "Could not fetch user details for attendance email:",
            uErr
          );
        }

        const adminEmail = process.env.ADMIN_EMAIL || "utkarshzager@gmail.com";

        const when = currentTime.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

        const subject = `Attendance marked by ${userName || decoded.id}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2 style="margin:0 0 10px 0;">Attendance Notification</h2>
            <p><strong>${
              userName || decoded.id
            }</strong> has marked attendance.</p>
            <table style="width:100%; border-collapse:collapse; margin-top:10px;">
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Name</strong></td><td style="padding:6px; border:1px solid #eee;">${
                userName || "-"
              }</td></tr>
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Email</strong></td><td style="padding:6px; border:1px solid #eee;">${
                userEmail || "-"
              }</td></tr>
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Time</strong></td><td style="padding:6px; border:1px solid #eee;">${when}</td></tr>
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Work Mode</strong></td><td style="padding:6px; border:1px solid #eee;">${workMode}</td></tr>
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Status</strong></td><td style="padding:6px; border:1px solid #eee;">${
                status || "present"
              }</td></tr>
            </table>
            <p style="margin-top:16px;">This is an automated notification from your attendance system.</p>
          </div>
        `;

        const text = `
Attendance Notification

${userName || decoded.id} has marked attendance.

Name: ${userName || "-"}
Email: ${userEmail || "-"}
Time: ${when}
Work Mode: ${workMode}
Status: ${status || "present"}

This is an automated notification.
        `.trim();

        console.log(
          `Sending attendance email to ${adminEmail} for user ${decoded.id}`
        );
        const emailResult = await sendEmail({
          to: adminEmail,
          subject,
          text,
          html,
        });

        console.log("Attendance email send result:", emailResult);
      } catch (emailErr) {
        console.error("Failed to send attendance email:", emailErr);
      }
    })();
    // --- end email send (fire-and-forget, errors logged) ---

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error("Mark Attendance error:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}
