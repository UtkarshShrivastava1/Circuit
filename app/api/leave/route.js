import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Leave from "@/app/models/Leave";
import LeaveRule from "@/app/models/LeaveRule";
import User from "@/app/models/User";
import { verifyToken } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

export async function GET(req) {
  await dbConnect();

  const authHeader = req.headers.get("authorization");
  if (!authHeader)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id)
    return NextResponse.json(
      { success: false, error: "Invalid token" },
      { status: 401 }
    );

  // Fetch user from DB (optional extra security)
  const user = await User.findById(decoded.id);
  if (!user)
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 401 }
    );

  const { searchParams } = new URL(req.url);
  const report = searchParams.get("report") === "true";

  let query = {};
  let populateFields = [
    { path: "userId", select: "name email" },
    { path: "decision.by", select: "name email" },
  ];

  if (report && ["admin", "manager"].includes(user.role)) {
    populateFields.push({ path: "decision.by", select: "name email" });
  } else {
    query.userId = user._id;
  }

  const leaves = await Leave.find(query)
    .populate(populateFields)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, data: leaves });
}

export async function POST(req) {
  await dbConnect();

  const authHeader = req.headers.get("authorization");
  if (!authHeader)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id)
    return NextResponse.json(
      { success: false, error: "Invalid token" },
      { status: 401 }
    );

  const user = await User.findById(decoded.id);
  if (!user)
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 401 }
    );

  const payload = await req.json();
  // Basic validation
  if (!payload.leaveType || !payload.startDate || !payload.endDate) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Paid quota check
  if (payload.leaveType === "paid") {
    const rule = await LeaveRule.getRule();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidUsedCount = await Leave.countDocuments({
      userId: user._id,
      leaveType: "paid",
      startDate: { $gte: monthStart, $lte: now },
      status: "approved",
    });
    if (paidUsedCount >= rule.maxPaidLeavesPerMonth) {
      return NextResponse.json(
        { success: false, error: "Paid leave quota exceeded" },
        { status: 400 }
      );
    }
  }

  // Create and return new leave
  const leave = await Leave.create({ ...payload, userId: user._id });

  // Fire-and-forget: send email to attendance admin
  (async () => {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "utkarshzager@gmail.com";
      if (!adminEmail) {
        console.warn(
          "No admin email configured for leave notifications, skipping email."
        );
        return;
      }

      const appName = process.env.NEXT_PUBLIC_APP_NAME || "Circuit App";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const applicantName = user.name || user.email || "Applicant";
      const applicantEmail = user.email || "";
      const start = new Date(payload.startDate).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
      const end = new Date(payload.endDate).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
      const leaveType = payload.leaveType;
      const reason = payload.reason || "No reason provided";

      const subject = `Leave request: ${applicantName} (${leaveType})`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
          <h2 style="margin:0 0 12px 0;">New Leave Request</h2>
          <p><strong>${applicantName}</strong> has applied for leave.</p>
          <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <tr><td style="padding:6px; border:1px solid #eee;"><strong>Name</strong></td><td style="padding:6px; border:1px solid #eee;">${applicantName}</td></tr>
            <tr><td style="padding:6px; border:1px solid #eee;"><strong>Email</strong></td><td style="padding:6px; border:1px solid #eee;">${applicantEmail}</td></tr>
            <tr><td style="padding:6px; border:1px solid #eee;"><strong>Leave Type</strong></td><td style="padding:6px; border:1px solid #eee;">${leaveType}</td></tr>
            <tr><td style="padding:6px; border:1px solid #eee;"><strong>Start Date</strong></td><td style="padding:6px; border:1px solid #eee;">${start}</td></tr>
            <tr><td style="padding:6px; border:1px solid #eee;"><strong>End Date</strong></td><td style="padding:6px; border:1px solid #eee;">${end}</td></tr>
            <tr><td style="padding:6px; border:1px solid #eee;"><strong>Reason</strong></td><td style="padding:6px; border:1px solid #eee;">${reason}</td></tr>
            <tr><td style="padding:6px; border:1px solid #eee;"><strong>Request ID</strong></td><td style="padding:6px; border:1px solid #eee;">${
              leave._id
            }</td></tr>
          </table>
          ${
            appUrl
              ? `<p style="margin-top:12px;">View request: <a href="${appUrl}" target="_blank" rel="noopener noreferrer">${appUrl}</a></p>`
              : ""
          }
          <p style="margin-top:16px; color:#666; font-size:12px;">This is an automated message from ${appName}. Please do not reply to this email.</p>
        </div>
      `;

      const text = `
New Leave Request

Applicant: ${applicantName}
Email: ${applicantEmail}
Type: ${leaveType}
Start: ${start}
End: ${end}
Reason: ${reason}
Request ID: ${leave._id}

${appUrl ? `View: ${appUrl}` : ""}

This is an automated message from ${appName}.
      `.trim();

      console.log(
        `Sending leave notification email to ${adminEmail} for leave ${leave._id}`
      );
      await sendEmail({
        to: adminEmail,
        subject,
        text,
        html,
      });
      console.log("Leave notification email sent.");
    } catch (err) {
      console.error("Failed to send leave notification email:", err);
    }
  })();

  // You do not need to update user.leaveHistory!
  return NextResponse.json({ success: true, data: leave });
}
