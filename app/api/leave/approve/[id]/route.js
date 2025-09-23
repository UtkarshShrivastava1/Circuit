// app/api/leave/approve/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Leave from "@/app/models/Leave";
import User from "@/app/models/User";
import { verifyToken } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

export async function POST(req, { params }) {
  try {
    await dbConnect();

    // 1. Check Authorization Header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Extract and Verify Token
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 3. Check User Role (Admin/Manager Only)
    const approver = await User.findById(decoded.id).select("name email role");
    if (!approver || !["manager", "admin"].includes(approver.role)) {
      return NextResponse.json(
        { error: "Not authorized to approve leave" },
        { status: 403 }
      );
    }

    // 4. Find and Populate Leave
    const leave = await Leave.findById(params.id)
      .populate("userId", "name email")
      .populate("decision.by", "name email");
    if (!leave) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // 5. Update Status and Decision
    const { action } = await req.json();
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    leave.status = action === "approve" ? "approved" : "rejected";
    leave.decision = { by: approver._id, at: new Date() };
    await leave.save();

    // repopulate so response contains populated fields
    await leave.populate("userId", "name email");
    await leave.populate("decision.by", "name email");

    // 6. Send email to the member (fire-and-forget)
    (async () => {
      try {
        const member = leave.userId;
        if (!member || !member.email) {
          console.warn(
            "Approve Leave: target member or email missing, skipping email."
          );
          return;
        }

        const appName = process.env.NEXT_PUBLIC_APP_NAME || "Circuit App";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        const approverName = approver.name || approver.email || "Approver";
        const memberName = member.name || member.email || "User";
        const whenStart = leave.startDate
          ? new Date(leave.startDate).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : "-";
        const whenEnd = leave.endDate
          ? new Date(leave.endDate).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
          : "-";
        const leaveType = leave.leaveType || "leave";
        const reason = leave.reason || "No reason provided";
        const statusLabel =
          leave.status === "approved" ? "APPROVED" : "REJECTED";

        const subject = `Your leave request has been ${statusLabel}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2 style="margin:0 0 12px 0;">Leave ${statusLabel}</h2>
            <p>Hello <strong>${memberName}</strong>,</p>
            <p>Your leave request has been <strong style="text-transform:uppercase">${statusLabel}</strong> by <strong>${approverName}</strong>.</p>
            <table style="width:100%; border-collapse:collapse; margin-top:12px;">
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Leave Type</strong></td><td style="padding:8px; border:1px solid #eee;">${leaveType}</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Start Date</strong></td><td style="padding:8px; border:1px solid #eee;">${whenStart}</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>End Date</strong></td><td style="padding:8px; border:1px solid #eee;">${whenEnd}</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Reason</strong></td><td style="padding:8px; border:1px solid #eee;">${reason}</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Decision By</strong></td><td style="padding:8px; border:1px solid #eee;">${approverName}</td></tr>
            </table>
            ${
              appUrl
                ? `<p style="margin-top:12px;">View details: <a href="${appUrl}" target="_blank" rel="noopener noreferrer">${appUrl}</a></p>`
                : ""
            }
            <p style="margin-top:16px; color:#666; font-size:12px;">This is an automated message from ${appName}. Please do not reply to this email.</p>
          </div>
        `;

        const text = `
Your leave request has been ${statusLabel}

Hello ${memberName},

Your leave request has been ${statusLabel} by ${approverName}.

Leave Type: ${leaveType}
Start Date: ${whenStart}
End Date: ${whenEnd}
Reason: ${reason}

${appUrl ? `View details: ${appUrl}` : ""}

This is an automated message from ${appName}.
        `.trim();

        console.log(
          `Sending leave ${statusLabel.toLowerCase()} email to ${
            member.email
          } (leave id: ${leave._id})`
        );
        await sendEmail({
          to: member.email,
          subject,
          text,
          html,
        });
        console.log("Leave notification email sent.");
      } catch (emailErr) {
        console.error("Failed to send leave notification email:", emailErr);
      }
    })();

    // 7. Return Success with Updated Leave (Populated)
    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error("Approve Leave error:", error);
    return NextResponse.json(
      { error: "Failed to approve leave" },
      { status: 500 }
    );
  }
}
