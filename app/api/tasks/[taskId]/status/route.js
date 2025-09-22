import Task from "@/app/models/Tasks";
import User from "@/app/models/User";
import Project from "@/app/models/project";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { authenticate } from "@/lib/middleware/authenticate";
import { sendEmail } from "@/lib/mailer";

/* ---------- helpers ---------- */
function isValidEmail(email) {
  return typeof email === "string" && /^\S+@\S+\.\S+$/.test(email);
}

function extractManagerIdsFromProject(project) {
  if (!project) return [];
  const ids = new Set();

  const candidates = [
    project.manager,
    project.managers,
    project.projectManager,
    project.projectManagers,
    project.owner,
    project.owners,
    project.managersIds,
    project.managerId,
    project.projectManagerId,
  ];

  candidates.forEach((c) => {
    if (!c) return;
    if (Array.isArray(c)) {
      c.forEach((id) => {
        if (!id) return;
        if (typeof id === "object" && id._id) ids.add(String(id._id));
        else ids.add(String(id));
      });
    } else {
      if (typeof c === "object" && c._id) ids.add(String(c._id));
      else ids.add(String(c));
    }
  });

  if (ids.size === 0 && Array.isArray(project.members)) {
    project.members.forEach((m) => {
      const role = (m?.role || "").toString().toLowerCase();
      if (role.includes("manager")) {
        const mid = m._id || m.user;
        if (mid) ids.add(String(mid));
      }
    });
  }

  return Array.from(ids).filter(Boolean);
}

async function sendStatusUpdateEmails(
  task,
  project,
  updatedByUser,
  previousStatus,
  newStatus
) {
  try {
    console.log("Preparing status update emails for task:", task._id);

    const managerIds = extractManagerIdsFromProject(project);
    console.log("Detected manager IDs:", managerIds);

    if (!managerIds || managerIds.length === 0) {
      console.log("No managers found on project — skipping notifications.");
      return [];
    }

    const managers = await User.find({ _id: { $in: managerIds } }).select(
      "name email"
    );
    const validManagers = managers.filter((m) => m && isValidEmail(m.email));

    if (validManagers.length === 0) {
      console.log("No valid manager emails found — skipping notifications.");
      return [];
    }

    const subject = `Task Status Updated: ${
      task.title
    } — ${newStatus.toUpperCase()}`;

    const sendPromises = validManagers.map(async (manager) => {
      console.log(`Preparing email -> ${manager.name} <${manager.email}>`);
      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px;padding:20px">
          <h2>Task Status Updated</h2>
          <p>Hello <strong>${manager.name}</strong>,</p>
          <p>The status of the task <strong>${
            task.title
          }</strong> in project <strong>${
        project.projectName || project.name || "Unnamed Project"
      }</strong> has been updated.</p>
          <div style="background:#f8f9fa;padding:16px;border-radius:8px;">
            <p><strong>Task:</strong> ${task.title}</p>
            <p><strong>Updated by:</strong> ${updatedByUser.name} (${
        updatedByUser.email || "no-email"
      })</p>
            <p><strong>Previous status:</strong> ${previousStatus}</p>
            <p><strong>New status:</strong> ${newStatus}</p>
            ${
              task.dueDate
                ? `<p><strong>Due:</strong> ${new Date(
                    task.dueDate
                  ).toLocaleDateString()}</p>`
                : ""
            }
          </div>
          <p>Please sign in to the dashboard to view the task details.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#666">Automated message from ${
            process.env.NEXT_PUBLIC_APP_NAME || "Circuit App"
          }</p>
        </div>
      `;

      const text = `
Task Status Updated

Hello ${manager.name},

The status of task "${task.title}" in project "${
        project.projectName || project.name || "Unnamed Project"
      }" was updated by ${updatedByUser.name} (${
        updatedByUser.email || "no-email"
      }).

Previous status: ${previousStatus}
New status: ${newStatus}

Sign in to the dashboard to view details.
      `.trim();

      try {
        const result = await sendEmail({
          to: manager.email,
          subject,
          text,
          html,
        });
        console.log(
          `✅ Email sent to manager ${manager.email}`,
          result?.messageId ? `messageId=${result.messageId}` : ""
        );
        return { success: true, email: manager.email, result };
      } catch (err) {
        console.error(
          `❌ Failed to send to manager ${manager.email}:`,
          err?.message || err
        );
        return {
          success: false,
          email: manager.email,
          error: err?.message || String(err),
        };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    console.log(
      "Status update emails settled:",
      results.map((r) => r.status)
    );
    return results;
  } catch (err) {
    console.error("Critical error in sendStatusUpdateEmails:", err);
    throw err;
  }
}

async function sendAssignmentEmailsBatch(
  task,
  project,
  assignedByUser,
  assigneeUsers
) {
  try {
    if (!Array.isArray(assigneeUsers) || assigneeUsers.length === 0) {
      console.log("No assignees provided for assignment emails.");
      return [];
    }

    const validAssignees = assigneeUsers.filter(
      (u) => u && isValidEmail(u.email)
    );
    if (validAssignees.length === 0) {
      console.log("No valid assignee emails found.");
      return [];
    }

    console.log(
      "Sending assignment emails to:",
      validAssignees.map((u) => u.email)
    );

    const subject = `New Task Assigned: ${task.title}`;
    const promises = validAssignees.map(async (assignee) => {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px;padding:20px">
          <h2>New Task Assignment</h2>
          <p>Hello <strong>${assignee.name}</strong>,</p>
          <p>You have been assigned a task by <strong>${
            assignedByUser.name
          }</strong>.</p>
          <div style="background:#f8f9fa;padding:16px;border-radius:8px;">
            <p><strong>Title:</strong> ${task.title}</p>
            <p><strong>Description:</strong> ${
              task.description || "No description provided"
            }</p>
            <p><strong>Project:</strong> ${
              project.projectName || project.name || "Unnamed Project"
            }</p>
            <p><strong>Priority:</strong> ${(
              task.priority || "medium"
            ).toUpperCase()}</p>
            ${
              task.dueDate
                ? `<p><strong>Due Date:</strong> ${new Date(
                    task.dueDate
                  ).toLocaleDateString()}</p>`
                : ""
            }
          </div>
          <p>Please sign in to your dashboard to view details.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="font-size:12px;color:#666">Automated message from ${
            process.env.NEXT_PUBLIC_APP_NAME || "Circuit App"
          }</p>
        </div>
      `;

      const text = `
New Task Assignment

Hello ${assignee.name},
You have been assigned a task by ${assignedByUser.name}.

Title: ${task.title}
Description: ${task.description || "No description provided"}
Project: ${project.projectName || project.name || "Unnamed Project"}
Priority: ${(task.priority || "medium").toUpperCase()}
${
  task.dueDate ? `Due Date: ${new Date(task.dueDate).toLocaleDateString()}` : ""
}

Sign in to view details.
      `.trim();

      try {
        const res = await sendEmail({
          to: assignee.email,
          subject,
          text,
          html,
        });
        console.log(
          `✅ Assignment email sent to ${assignee.email}`,
          res?.messageId ? `messageId=${res.messageId}` : ""
        );
        return { success: true, email: assignee.email, result: res };
      } catch (err) {
        console.error(
          `❌ Failed assignment email to ${assignee.email}:`,
          err?.message || err
        );
        return {
          success: false,
          email: assignee.email,
          error: err?.message || String(err),
        };
      }
    });

    const settled = await Promise.allSettled(promises);
    console.log(
      "Assignment email results:",
      settled.map((s) => s.status)
    );
    return settled;
  } catch (err) {
    console.error("Error in sendAssignmentEmailsBatch:", err);
    throw err;
  }
}

/* ---------------- PATCH: update status ---------------- */
export async function PATCH(req, { params }) {
  const { taskId } = await params;
  console.log("PATCH /api/tasks/[taskId]/status called", { taskId });

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    console.error("Invalid Task ID format:", taskId);
    return NextResponse.json(
      { error: "Invalid Task ID format" },
      { status: 400 }
    );
  }

  // parse body
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("Invalid JSON body:", err?.message || err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { status } = body || {};
  if (typeof status === "undefined") {
    console.error("Missing 'status' in body");
    return NextResponse.json(
      { error: "Missing 'status' in body" },
      { status: 400 }
    );
  }
  const validStatuses = ["pending", "ongoing", "completed"];
  if (!validStatuses.includes(status)) {
    console.error("Invalid status:", status);
    return NextResponse.json(
      { error: "Invalid status value", allowed: validStatuses },
      { status: 400 }
    );
  }

  // authenticate
  const user = await authenticate(req);
  if (!user) {
    console.error("Unauthenticated request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("Authenticated user:", {
    id: user._id || user.id,
    role: user.role,
    email: user.email,
  });

  try {
    await dbConnect();

    const currentTask = await Task.findById(taskId)
      .populate("assignedBy", "name email")
      .populate("projectId", "projectName");

    if (!currentTask) {
      console.error("Task not found:", taskId);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAssignee = currentTask.assignees.some(
      (a) => a.user.toString() === (user._id || user.id).toString()
    );
    if (user.role === "member" && !isAssignee) {
      console.error("Forbidden: member trying to update others' task", {
        user: user._id || user.id,
      });
      return NextResponse.json(
        { error: "Forbidden: Cannot update others' tasks" },
        { status: 403 }
      );
    }

    // update
    const previousStatus = currentTask.status;
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { status },
      { new: true }
    );
    console.log(
      `Task ${taskId} status updated: ${previousStatus} -> ${status}`
    );

    // send completion email (if newly completed)
    if (status === "completed" && previousStatus !== "completed") {
      try {
        const projectId =
          currentTask.projectId?._id?.toString?.() ||
          currentTask.projectId?.toString?.();
        console.log("🔎 Completion email: projectId =", projectId);

        const project = projectId
          ? await Project.findById(projectId).select("projectName")
          : null;

        const userId = (user._id || user.id)?.toString?.();
        const completedByUser = userId
          ? await User.findById(userId).select("name email")
          : null;

        const assignedById =
          currentTask.assignedBy?._id?.toString?.() ||
          currentTask.assignedBy?.toString?.();
        const assignedByUser = assignedById
          ? await User.findById(assignedById).select("name email")
          : null;

        console.log("🧩 Completion email parts:", {
          hasProject: !!project,
          hasCompletedByUser: !!completedByUser,
          hasAssignedByUser: !!assignedByUser,
        });

        if (project && completedByUser && assignedByUser?.email) {
          const subject = `Task Completed: ${updatedTask.title}`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width:600px;padding:20px">
              <h2>Task Completed</h2>
              <p>The task <strong>${
                updatedTask.title
              }</strong> was marked completed by <strong>${
            completedByUser.name
          }</strong>.</p>
              <p><strong>Project:</strong> ${
                project.projectName || "Unnamed Project"
              }</p>
              <p><strong>Previous status:</strong> ${previousStatus}</p>
              <p><strong>New status:</strong> ${status}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
              <p style="font-size:12px;color:#666">Automated message from ${
                process.env.NEXT_PUBLIC_APP_NAME || "Circuit App"
              }</p>
            </div>
          `;
          const text = `Task "${updatedTask.title}" marked completed by ${
            completedByUser.name
          } in project "${project.projectName || "Unnamed Project"}".`;

          console.log("📤 Sending completion email to:", assignedByUser.email);
          const res = await sendEmail({
            to: assignedByUser.email,
            subject,
            text,
            html,
          });
          console.log(
            "✅ Completion email sent",
            res?.messageId ? `messageId=${res.messageId}` : ""
          );
        } else {
          console.log("⏭️ Skipping completion email: missing data", {
            project: !!project,
            completedByUser: !!completedByUser,
            assignedByUserEmail: !!assignedByUser?.email,
          });
        }
      } catch (emailError) {
        console.error("💥 Error sending completion email:", emailError);
      }
    }

    // notify project managers for any status change
    try {
      const projectId =
        currentTask.projectId?._id?.toString?.() ||
        currentTask.projectId?.toString?.();
      const userId = (user._id || user.id)?.toString?.();

      console.log("🔎 Manager notify: resolving project & updatedBy", {
        projectId,
        userId,
      });

      const project = projectId ? await Project.findById(projectId) : null;
      const updatedByUser = userId
        ? await User.findById(userId).select("name email")
        : null;

      console.log("🧩 Manager notify parts:", {
        hasProject: !!project,
        hasUpdatedByUser: !!updatedByUser,
      });

      if (project && updatedByUser) {
        console.log("🚀 Starting manager email notifications...");
        const results = await sendStatusUpdateEmails(
          updatedTask,
          project,
          { name: updatedByUser.name, email: updatedByUser.email },
          previousStatus,
          status
        );
        console.log("📧 Manager email send results:", results);
      } else {
        console.log(
          "⏭️ Skipping manager notifications: missing project or updater info"
        );
      }
    } catch (notifyErr) {
      console.error(
        "💥 Failed to send status update emails to managers:",
        notifyErr
      );
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (err) {
    console.error("Failed to update task status:", err);
    return NextResponse.json(
      {
        error: "Failed to update status",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

/* ---------------- POST: resend assignment emails ---------------- */
export async function POST(req, { params }) {
  const { taskId } = await params;
  console.log("POST /api/tasks/[taskId]/status (resend assignments) called", {
    taskId,
  });

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return NextResponse.json({ error: "Invalid Task ID" }, { status: 400 });
  }

  try {
    await dbConnect();

    const task = await Task.findById(taskId)
      .populate("assignedBy", "name email")
      .populate("projectId", "projectName")
      .populate("assignees.user");

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const creator = await User.findById(task.createdBy).select("name email");
    if (!creator) {
      console.error("Creator not found for task", taskId);
    }

    if (task.assignees.length > 0 && creator) {
      const assigneeUsers = task.assignees
        .map((a) => a.user)
        .filter((u) => u && isValidEmail(u.email))
        .map((u) => ({ name: u.name, email: u.email, _id: u._id }));

      console.log(
        "Resending assignment emails to:",
        assigneeUsers.map((a) => a.email)
      );
      const results = await sendAssignmentEmailsBatch(
        task,
        task.projectId,
        creator,
        assigneeUsers
      );
      console.log("Assignment email send results:", results);
    } else {
      console.log("No assignees or creator missing — nothing to resend");
    }

    return NextResponse.json(task, { status: 200 });
  } catch (err) {
    console.error("Failed to resend assignment emails:", err);
    return NextResponse.json(
      {
        error: "Failed to resend assignment emails",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
