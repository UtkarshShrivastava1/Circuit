// app/api/attendance/approve/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import { verifyToken } from "@/lib/auth";
import User from "@/app/models/User";
import { sendEmail } from "@/lib/mailer";

export async function POST(req, { params }) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { action } = await req.json(); // "approve" or "reject"

    // approver info
    const approver = await User.findById(decoded.id).select("name email role");
    if (!approver) {
      return NextResponse.json(
        { error: "Approver not found" },
        { status: 404 }
      );
    }

    if (!["manager", "admin"].includes(approver.role)) {
      return NextResponse.json(
        { error: "Not authorized to approve attendance" },
        { status: 403 }
      );
    }

    const attendance = await Attendance.findById(params.id);
    if (!attendance) {
      return NextResponse.json(
        { error: "Attendance not found" },
        { status: 404 }
      );
    }

    attendance.approvalStatus = action === "approve" ? "approved" : "rejected";
    attendance.approvedBy = approver._id;
    await attendance.save();

    // --- send email to the member who requested attendance ---
    (async () => {
      try {
        // Fetch the member/user who owns this attendance
        const member = await User.findById(attendance.userId).select(
          "name email"
        );
        if (!member || !member.email) {
          console.warn(
            "Approve Attendance: member or member.email missing, skipping email."
          );
          return;
        }

        const adminName = approver.name || approver.email || "Administrator";
        const memberName = member.name || member.email || "User";
        const adminEmail = approver.email || "";
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "Circuit App";
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "";

        const when = attendance.date
          ? new Date(attendance.date).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const statusLabel =
          attendance.approvalStatus === "approved" ? "APPROVED" : "REJECTED";
        const subject = `Your attendance on ${when} has been ${statusLabel}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2 style="margin:0 0 12px 0;">Attendance ${statusLabel}</h2>
            <p>Hello <strong>${memberName}</strong>,</p>
            <p>Your attendance recorded for <strong>${when}</strong> has been <strong style="text-transform:uppercase">${statusLabel}</strong> by <strong>${adminName}</strong>.</p>
            <table style="width:100%; border-collapse:collapse; margin-top:10px;">
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Date & Time</strong></td><td style="padding:6px; border:1px solid #eee;">${when}</td></tr>
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Work Mode</strong></td><td style="padding:6px; border:1px solid #eee;">${
                attendance.workMode || "-"
              }</td></tr>
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Status</strong></td><td style="padding:6px; border:1px solid #eee;">${statusLabel}</td></tr>
              <tr><td style="padding:6px; border:1px solid #eee;"><strong>Approved By</strong></td><td style="padding:6px; border:1px solid #eee;">${adminName} ${
          adminEmail ? `(&lt;${adminEmail}&gt;)` : ""
        }</td></tr>
            </table>
            ${
              siteUrl
                ? `<p style="margin-top:12px;">You can view your attendance history <a href="${siteUrl}" target="_blank" rel="noopener noreferrer">here</a>.</p>`
                : ""
            }
            <p style="margin-top:16px; color:#666; font-size:12px;">This is an automated message from ${appName}. Please do not reply to this email.</p>
          </div>
        `;

        const text = `
Attendance ${statusLabel}

Hello ${memberName},

Your attendance recorded for ${when} has been ${statusLabel} by ${adminName}.

Date & Time: ${when}
Work Mode: ${attendance.workMode || "-"}
Status: ${statusLabel}
Approved By: ${adminName} ${adminEmail ? `(${adminEmail})` : ""}

${siteUrl ? `View: ${siteUrl}` : ""}

This is an automated message from ${appName}.
        `.trim();

        console.log(
          `Sending attendance approval email to ${member.email} (attendance ${attendance._id})`
        );
        await sendEmail({
          to: member.email,
          subject,
          text,
          html,
        });
        console.log("Attendance approval email sent.");
      } catch (emailErr) {
        console.error("Failed to send attendance approval email:", emailErr);
      }
    })();
    // --- end fire-and-forget email ---

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error("Approve Attendance error:", error);
    return NextResponse.json(
      { error: "Failed to approve attendance" },
      { status: 500 }
    );
  }
}
