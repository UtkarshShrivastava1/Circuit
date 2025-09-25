// app/api/tasks/[taskId]/tickets/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/app/models/Tasks";
import User from "@/app/models/User";
import { authenticate } from "@/lib/middleware/authenticate";
import { checkRole } from "@/lib/middleware/checkRole";
import mongoose from "mongoose";
import { sendEmail } from "@/lib/mailer";

/**
 * Tickets route (ticket subdocuments stored on Task.tickets)
 *
 * POST   /api/tasks/:taskId/tickets         -> create ticket (auth required)
 * GET    /api/tasks/:taskId/tickets         -> list tickets (role-based)
 * PUT    /api/tasks/:taskId/tickets         -> update ticket (body must include ticketId)
 * DELETE /api/tasks/:taskId/tickets/:ticketId -> delete ticket (admin/manager only here)
 *
 * Notes:
 * - Next.js dynamic API `params` must be awaited before using properties.
 * - Defensive tag sanitization: if your Task schema defines an enum for tickets.tag,
 *   this handler validates against that enum and falls back to a safe value.
 *
 * This version includes verbose console logging around email sending for debugging.
 */

const ensureObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

async function readParams(params) {
  // params is a Promise-like in new Next.js — await it before using.
  return (await params) || {};
}

// Helper to read ticket tag enum values from Task schema (if present)
function getTicketTagEnumValues() {
  try {
    const ticketsPath = Task.schema.path("tickets");
    if (
      ticketsPath &&
      ticketsPath.caster &&
      typeof ticketsPath.caster.path === "function"
    ) {
      const tagPath = ticketsPath.caster.path("tag");
      if (tagPath && Array.isArray(tagPath.enumValues)) {
        return tagPath.enumValues;
      }
    }
  } catch (e) {
    // ignore schema-read errors
  }
  return [];
}

// Helper: resolve a user document by id-like value
async function resolveUser(userIdentifier) {
  if (!userIdentifier) return null;
  let id = userIdentifier;
  // if an object was passed, try to extract ._id or .id
  if (typeof userIdentifier === "object") {
    if (userIdentifier._id) id = userIdentifier._id;
    else if (userIdentifier.id) id = userIdentifier.id;
  }
  if (!ensureObjectId(id)) return null;
  try {
    const u = await User.findById(String(id)).select("name email");
    return u || null;
  } catch (e) {
    console.error("resolveUser: DB lookup failed for id:", id, e);
    return null;
  }
}

export async function POST(request, context) {
  const { params } = context;
  const { taskId } = await readParams(params);

  if (!ensureObjectId(taskId)) {
    return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
  }

  try {
    await dbConnect();

    const user = await authenticate(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      issueTitle,
      description = "",
      assignedTo = null,
      priority = "medium",
      estimatedHours,
      tag = "",
    } = body || {};

    if (!issueTitle || !issueTitle.trim()) {
      return NextResponse.json(
        { error: "issueTitle is required" },
        { status: 400 }
      );
    }

    const task = await Task.findById(taskId);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Sanitize/validate tag against schema enum if present
    let finalTag = (tag || "").toString().trim();
    const tagEnumValues = getTicketTagEnumValues();
    if (Array.isArray(tagEnumValues) && tagEnumValues.length > 0) {
      if (!finalTag || !tagEnumValues.includes(finalTag)) {
        // fallback: use first enum value or empty string
        finalTag = tagEnumValues[0] || "";
      }
    } else {
      // no enum defined, accept trimmed value or empty
      finalTag = finalTag || "";
    }

    const newTicket = {
      issueTitle: issueTitle.trim(),
      description: description?.trim() || "",
      assignedTo: assignedTo || null,
      priority,
      estimatedHours:
        typeof estimatedHours === "number"
          ? estimatedHours
          : estimatedHours
          ? Number(estimatedHours)
          : undefined,
      tag: finalTag,
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user._id ? user._id : null,
    };

    task.tickets.push(newTicket);
    await task.save();

    // the last pushed ticket
    const addedTicket = task.tickets[task.tickets.length - 1].toObject();

    // FIRE-AND-FORGET EMAIL to assigned user (if any) with verbose logs
    (async () => {
      try {
        console.log(
          "EMAIL DEBUG: starting notification flow for ticket creation"
        );
        console.log(
          "EMAIL DEBUG: env EMAIL_HOST/EMAIL_USER present?",
          !!process.env.EMAIL_HOST,
          !!process.env.EMAIL_USER
        );

        // Resolve assignedTo user (may be id string or object)
        const recipient = await resolveUser(
          addedTicket.assignedTo || task.assignedTo || null
        );
        console.log(
          "EMAIL DEBUG: resolved recipient:",
          recipient && {
            id: recipient._id?.toString(),
            email: recipient?.email,
            name: recipient?.name,
          }
        );

        if (!recipient || !recipient.email) {
          console.log(
            "EMAIL DEBUG: no recipient or recipient.email - skipping email."
          );
          return;
        }

        // Try to resolve author (creator)
        const author = (await resolveUser(user._id || user.id)) || {
          name: user.name || user.email,
          email: user.email || "",
        };
        console.log("EMAIL DEBUG: resolved author:", {
          id: author._id?.toString?.(),
          name: author.name,
          email: author.email,
        });

        const appName = process.env.NEXT_PUBLIC_APP_NAME || "Circuit App";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        const ticketLink = appUrl ? `${appUrl}/dashboard/tasks/${taskId}` : "";
        const createdAt = new Date(
          addedTicket.createdAt || Date.now()
        ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        const subject = `New Ticket assigned: ${addedTicket.issueTitle}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2 style="margin:0 0 12px 0;">New Ticket Assigned</h2>
            <p>Hello <strong>${recipient.name || recipient.email}</strong>,</p>
            <p>A new ticket has been created${
              author?.name ? ` by ${author.name}` : ""
            } for task <strong>${
          task.title || task.projectName || task._id
        }</strong>.</p>

            <table style="width:100%; border-collapse:collapse; margin-top:10px;">
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Title</strong></td><td style="padding:8px; border:1px solid #eee;">${
                addedTicket.issueTitle
              }</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Description</strong></td><td style="padding:8px; border:1px solid #eee;">${
                addedTicket.description || "-"
              }</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Priority</strong></td><td style="padding:8px; border:1px solid #eee;">${
                addedTicket.priority
              }</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Estimated Hours</strong></td><td style="padding:8px; border:1px solid #eee;">${
                addedTicket.estimatedHours ?? "-"
              }</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Tag</strong></td><td style="padding:8px; border:1px solid #eee;">${
                addedTicket.tag || "-"
              }</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Created At</strong></td><td style="padding:8px; border:1px solid #eee;">${createdAt}</td></tr>
            </table>

            ${
              ticketLink
                ? `<p style="margin-top:12px;">View ticket: <a href="${ticketLink}" target="_blank" rel="noopener noreferrer">${ticketLink}</a></p>`
                : ""
            }
            <p style="margin-top:16px; color:#666; font-size:12px;">This is an automated message from ${appName}.</p>
          </div>
        `;

        const text = `
New Ticket: ${addedTicket.issueTitle}

${addedTicket.description || "-"}

Priority: ${addedTicket.priority}
Estimated Hours: ${addedTicket.estimatedHours ?? "-"}
Tag: ${addedTicket.tag || "-"}
Created At: ${createdAt}
${ticketLink ? `View: ${ticketLink}` : ""}

This is an automated message from ${appName}.
        `.trim();

        console.log("EMAIL DEBUG: prepared email", {
          to: recipient.email,
          subject,
          htmlLength: html.length,
          textLength: text.length,
        });

        // Attempt to send and log result / errors
        try {
          const result = await sendEmail({
            to: recipient.email,
            subject,
            text,
            html,
          });
          console.log("EMAIL DEBUG: sendEmail returned:", result);
        } catch (sendErr) {
          console.error("EMAIL DEBUG: sendEmail threw error:", sendErr);
        }
        console.log("EMAIL DEBUG: ticket-created email flow completed");
      } catch (emailErr) {
        console.error(
          "EMAIL DEBUG: unexpected error in ticket-created email flow:",
          emailErr
        );
      }
    })();

    return NextResponse.json({ ticket: addedTicket }, { status: 201 });
  } catch (err) {
    console.error("POST /tasks/:taskId/tickets error:", err);
    if (err && err.name === "ValidationError") {
      const errors = Object.keys(err.errors || {}).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  const { params } = context;
  const { taskId } = await readParams(params);

  if (!ensureObjectId(taskId)) {
    return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
  }

  try {
    await dbConnect();

    const user = await authenticate(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const task = await Task.findById(taskId).lean();
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Role-based visibility:
    // - admin/manager => all tickets
    // - member => only if assigned to task (or assigned ticket)
    if (["admin", "manager"].includes(user.role)) {
      return NextResponse.json(
        Array.isArray(task.tickets) ? task.tickets : [],
        { status: 200 }
      );
    }

    if (user.role === "member") {
      const isAssignedToTask =
        Array.isArray(task.assignees) &&
        task.assignees.some((a) => {
          const uid = a.user?._id || a.user;
          return String(uid) === String(user._id || user.id);
        });

      if (!isAssignedToTask) {
        return NextResponse.json(
          { error: "Forbidden: Not your task" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        Array.isArray(task.tickets) ? task.tickets : [],
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (err) {
    console.error("GET /tasks/:taskId/tickets error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  const { params } = context;
  const { taskId } = await readParams(params);

  if (!ensureObjectId(taskId)) {
    return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
  }

  try {
    await dbConnect();

    const user = await authenticate(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { ticketId, ...updates } = body || {};

    if (!ticketId || !ensureObjectId(ticketId)) {
      return NextResponse.json({ error: "Invalid ticketId" }, { status: 400 });
    }

    const task = await Task.findById(taskId);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const ticket = task.tickets.id(ticketId);
    if (!ticket)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // role check:
    if (!["admin", "manager", "member"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Invalid role" },
        { status: 403 }
      );
    }

    if (user.role === "member") {
      const assignedToId = ticket.assignedTo ? String(ticket.assignedTo) : null;
      const userId = String(user._id || user.id);
      if (!assignedToId || assignedToId !== userId) {
        return NextResponse.json(
          { error: "Forbidden: Cannot update others' tickets" },
          { status: 403 }
        );
      }
    }

    // If tag is being updated, sanitize against enum
    if (Object.prototype.hasOwnProperty.call(updates, "tag")) {
      const candidate = (updates.tag || "").toString().trim();
      const allowed = getTicketTagEnumValues();
      if (Array.isArray(allowed) && allowed.length > 0) {
        updates.tag = allowed.includes(candidate)
          ? candidate
          : allowed[0] || "";
      } else {
        updates.tag = candidate || "";
      }
    }

    const allowed = [
      "issueTitle",
      "description",
      "assignedTo",
      "priority",
      "estimatedHours",
      "tag",
      "status",
      "comments",
    ];

    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        if (key === "issueTitle" && typeof updates[key] === "string")
          ticket.issueTitle = updates[key].trim();
        else if (key === "description" && typeof updates[key] === "string")
          ticket.description = updates[key].trim();
        else if (key === "estimatedHours")
          ticket.estimatedHours =
            updates[key] === null || updates[key] === undefined
              ? undefined
              : Number(updates[key]);
        else ticket[key] = updates[key];
      }
    });

    ticket.updatedAt = new Date();
    await task.save();

    const updatedTicket = task.tickets.id(ticketId).toObject();
    return NextResponse.json({ ticket: updatedTicket }, { status: 200 });
  } catch (err) {
    console.error("PUT /tasks/:taskId/tickets error:", err);
    if (err && err.name === "ValidationError") {
      const errors = Object.keys(err.errors || {}).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  const { params } = context;
  const { taskId, ticketId } = await readParams(params);

  if (!ensureObjectId(taskId) || !ensureObjectId(ticketId)) {
    return NextResponse.json({ error: "Invalid id(s)" }, { status: 400 });
  }

  try {
    await dbConnect();

    const user = await authenticate(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // only admin/manager allowed to delete tickets
    const roleCheck = checkRole(user, ["admin", "manager"]);
    if (!roleCheck?.ok) {
      return NextResponse.json(
        { error: roleCheck?.message || "Forbidden" },
        { status: roleCheck?.status || 403 }
      );
    }

    const task = await Task.findOne({ "tickets._id": ticketId });
    if (!task)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // find the ticket BEFORE removing it
    const ticket = task.tickets.find((t) => String(t._id) === String(ticketId));
    if (!ticket)
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // resolve assigned user (if any) for email
    const assignedUser = await resolveUser(ticket.assignedTo || null);
    console.log(
      "EMAIL DEBUG: assignedUser resolved for deletion:",
      assignedUser && {
        id: assignedUser._id?.toString(),
        email: assignedUser.email,
      }
    );

    // remove ticket
    task.tickets = task.tickets.filter(
      (t) => String(t._id) !== String(ticketId)
    );
    await task.save();

    // send deletion email (fire-and-forget) with verbose logs
    (async () => {
      try {
        console.log("EMAIL DEBUG: starting ticket deletion email flow");
        if (!assignedUser || !assignedUser.email) {
          console.log(
            "EMAIL DEBUG: no assigned user/email found - skipping deletion email."
          );
          return;
        }

        const deleterName = user.name || user.email || "Administrator";
        const appName = process.env.NEXT_PUBLIC_APP_NAME || "Circuit App";
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
        const taskTitle = task.title || task.projectName || task._id;

        const subject = `Ticket removed: "${ticket.issueTitle}" (Task: ${taskTitle})`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <h2 style="margin:0 0 12px 0;">Ticket Removed</h2>
            <p>Hello <strong>${
              assignedUser.name || assignedUser.email
            }</strong>,</p>
            <p>The ticket titled <strong>"${
              ticket.issueTitle
            }"</strong> for task <strong>${taskTitle}</strong> was removed by <strong>${deleterName}</strong>.</p>
            <table style="width:100%; border-collapse:collapse; margin-top:12px;">
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Ticket</strong></td><td style="padding:8px; border:1px solid #eee;">${
                ticket.issueTitle
              }</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Task</strong></td><td style="padding:8px; border:1px solid #eee;">${taskTitle}</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>Deleted By</strong></td><td style="padding:8px; border:1px solid #eee;">${deleterName}</td></tr>
              <tr><td style="padding:8px; border:1px solid #eee;"><strong>When</strong></td><td style="padding:8px; border:1px solid #eee;">${new Date().toLocaleString(
                "en-IN",
                { timeZone: "Asia/Kolkata" }
              )}</td></tr>
            </table>
            ${
              appUrl
                ? `<p style="margin-top:12px;">View task: <a href="${appUrl}" target="_blank" rel="noopener noreferrer">${appUrl}/dashboard/tasks/${task._id}</a></p>`
                : ""
            }
            <p style="margin-top:16px; color:#666; font-size:12px;">This is an automated message from ${appName}.</p>
          </div>
        `;

        const text = `
Ticket removed: "${ticket.issueTitle}" (Task: ${taskTitle})

Hello ${assignedUser.name || assignedUser.email},

The ticket "${
          ticket.issueTitle
        }" for task ${taskTitle} was removed by ${deleterName}.

When: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

${appUrl ? `View task: ${appUrl}/dashboard/tasks/${task._id}` : ""}

This is an automated message from ${appName}.
        `.trim();

        console.log("EMAIL DEBUG: prepared deletion email", {
          to: assignedUser.email,
          subject,
          htmlLength: html.length,
          textLength: text.length,
        });

        try {
          const result = await sendEmail({
            to: assignedUser.email,
            subject,
            text,
            html,
          });
          console.log("EMAIL DEBUG: sendEmail returned (deletion):", result);
        } catch (sendErr) {
          console.error(
            "EMAIL DEBUG: sendEmail threw error (deletion):",
            sendErr
          );
        }

        console.log("EMAIL DEBUG: ticket-deleted email flow completed");
      } catch (emailErr) {
        console.error(
          "EMAIL DEBUG: unexpected error in ticket-deleted email flow:",
          emailErr
        );
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
