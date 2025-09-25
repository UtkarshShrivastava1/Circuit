// app/api/tasks/[taskId]/tickets/[ticketId]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import Task from "@/app/models/Tasks";
import User from "@/app/models/User";
import { authenticate } from "@/lib/middleware/authenticate";
import { checkRole } from "@/lib/middleware/checkRole";
import { sendEmail } from "@/lib/mailer";

const ensureObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

export async function DELETE(req, { params }) {
  const { taskId, ticketId } = params || {};

  if (!ensureObjectId(taskId) || !ensureObjectId(ticketId)) {
    return NextResponse.json({ error: "Invalid id(s)" }, { status: 400 });
  }

  await dbConnect();

  try {
    const user = await authenticate(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // allow admin or manager
    const roleCheck = checkRole(user, ["admin", "manager"]);
    const allowed = typeof roleCheck === "object" ? roleCheck.ok : !!roleCheck;
    if (!allowed) {
      const message =
        typeof roleCheck === "object" ? roleCheck.message : "Forbidden";
      const status =
        typeof roleCheck === "object" ? roleCheck.status || 403 : 403;
      return NextResponse.json({ error: message }, { status });
    }

    // Find task with ticket
    const task = await Task.findOne({ "tickets._id": ticketId });
    if (!task)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Keep a copy of the ticket for email after deletion
    const ticketObj = task.tickets.find(
      (t) => String(t._id) === String(ticketId)
    );
    if (!ticketObj)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const ticketTitle = ticketObj.issueTitle || "Untitled ticket";
    const assignedToId = ticketObj.assignedTo
      ? String(ticketObj.assignedTo)
      : null;
    const taskTitle = task.title || task.projectName || String(task._id);

    // Remove ticket and save
    task.tickets = task.tickets.filter(
      (t) => String(t._id) !== String(ticketId)
    );
    await task.save();

    // Fire-and-forget email to assigned user (if exists)
    (async () => {
      try {
        if (!assignedToId) return;

        const recipient = await User.findById(assignedToId).select(
          "name email"
        );
        if (!recipient || !recipient.email) return;

        const deleterName = user.name || user.email || "Administrator";
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "Circuit App";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

        const subject = `Ticket removed: "${ticketTitle}" (Task: ${taskTitle})`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2>Ticket Removed</h2>
            <p>Hello <strong>${recipient.name || recipient.email}</strong>,</p>
            <p>The ticket titled <strong>"${ticketTitle}"</strong> for task <strong>${taskTitle}</strong> was removed by <strong>${deleterName}</strong>.</p>
            <p style="margin-top:12px;color:#666;font-size:12px;">This is an automated message from ${appName}.</p>
            ${
              appUrl
                ? `<p><a href="${appUrl}/dashboard/tasks/${task._id}">View Task</a></p>`
                : ""
            }
          </div>
        `;
        const text = `Ticket removed: "${ticketTitle}" (Task: ${taskTitle})\nDeleted by: ${deleterName}`;

        await sendEmail({ to: recipient.email, subject, text, html });
      } catch (emailErr) {
        console.error("Failed to send ticket deletion email:", emailErr);
      }
    })();

    return NextResponse.json(
      { message: "Ticket deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /tasks/:taskId/tickets/:ticketId error:", err);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}
