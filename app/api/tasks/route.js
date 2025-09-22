// /app/api/tasks/route.js

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Task from "@/app/models/Tasks";
import User from "@/app/models/User";
import Project from "@/app/models/project";
import { authenticate } from "@/lib/middleware/authenticate";
import { verifyAuth } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";

// Email utility function for task assignments
async function sendTaskAssignmentEmails(
  task,
  project,
  assignedByUser,
  assigneeUsers
) {
  console.log("=== EMAIL DEBUGGING START ===");
  console.log("Task:", {
    id: task._id,
    title: task.title,
    description: task.description?.substring(0, 50) + "...",
    priority: task.priority,
  });
  console.log("Project:", {
    id: project._id,
    name: project.projectName,
  });
  console.log("Assigned by:", {
    id: assignedByUser._id,
    name: assignedByUser.name,
    email: assignedByUser.email,
  });
  console.log(
    "Assignees:",
    assigneeUsers.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
    }))
  );

  try {
    // Validate email addresses
    const validAssignees = assigneeUsers.filter((assignee) => {
      if (!assignee.email || typeof assignee.email !== "string") {
        console.error(
          `Invalid email for user ${assignee.name}: ${assignee.email}`
        );
        return false;
      }
      return true;
    });

    if (validAssignees.length === 0) {
      console.error("No valid assignee emails found");
      return [];
    }

    const emailPromises = validAssignees.map(async (assignee, index) => {
      try {
        console.log(`Preparing email ${index + 1} for ${assignee.email}`);

        const subject = `New Task Assigned: ${task.title}`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">New Task Assignment</h2>
            <p>Hello <strong>${assignee.name}</strong>,</p>
            
            <p>You have been assigned a new task by <strong>${
              assignedByUser.name
            }</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="color: #333; margin-top: 0;">📋 Task Details</h3>
              <p><strong>Title:</strong> ${task.title}</p>
              <p><strong>Description:</strong> ${
                task.description || "No description provided"
              }</p>
              <p><strong>Project:</strong> ${project.projectName}</p>
              <p><strong>Priority:</strong> <span style="text-transform: uppercase; color: ${
                task.priority === "high" || task.priority === "urgent"
                  ? "#dc3545"
                  : task.priority === "medium"
                  ? "#fd7e14"
                  : "#28a745"
              }">${task.priority}</span></p>
              ${
                task.dueDate
                  ? `<p><strong>Due Date:</strong> ${new Date(
                      task.dueDate
                    ).toLocaleDateString()}</p>`
                  : ""
              }
              ${
                task.estimatedHours
                  ? `<p><strong>Estimated Hours:</strong> ${task.estimatedHours} hours</p>`
                  : ""
              }
            </div>
            
            <p>Please log in to your dashboard to view more details and start working on this task.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated message from ${
                process.env.NEXT_PUBLIC_APP_NAME || "Circuit App"
              }.<br>
              Please do not reply to this email.
            </p>
          </div>
        `;

        const text = `
New Task Assignment

Hello ${assignee.name},

You have been assigned a new task by ${assignedByUser.name}.

Task Details:
- Title: ${task.title}
- Description: ${task.description || "No description provided"}
- Project: ${project.projectName}
- Priority: ${task.priority.toUpperCase()}
${
  task.dueDate
    ? `- Due Date: ${new Date(task.dueDate).toLocaleDateString()}`
    : ""
}
${task.estimatedHours ? `- Estimated Hours: ${task.estimatedHours} hours` : ""}

Please log in to your dashboard to view more details and start working on this task.

---
This is an automated message from ${
          process.env.NEXT_PUBLIC_APP_NAME || "Circuit App"
        }.
        `.trim();

        console.log(`Sending email to: ${assignee.email}`);
        console.log(`Subject: ${subject}`);

        const result = await sendEmail({
          to: assignee.email,
          subject,
          text,
          html,
        });

        console.log(`✅ Email sent successfully to ${assignee.email}`);
        return { success: true, email: assignee.email, result };
      } catch (emailError) {
        console.error(
          `❌ Failed to send email to ${assignee.email}:`,
          emailError
        );
        return {
          success: false,
          email: assignee.email,
          error: emailError.message,
        };
      }
    });

    console.log(`Waiting for ${emailPromises.length} emails to be sent...`);
    const results = await Promise.allSettled(emailPromises);

    // Log detailed results
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          console.log(`✅ Email ${index + 1}: SUCCESS - ${result.value.email}`);
        } else {
          console.error(
            `❌ Email ${index + 1}: FAILED - ${result.value.email} - ${
              result.value.error
            }`
          );
        }
      } else {
        console.error(
          `❌ Email ${index + 1}: PROMISE REJECTED -`,
          result.reason
        );
      }
    });

    console.log("=== EMAIL DEBUGGING END ===");
    return results;
  } catch (error) {
    console.error("❌ Critical error in sendTaskAssignmentEmails:", error);
    console.log("=== EMAIL DEBUGGING END (ERROR) ===");
    throw error;
  }
}

export async function GET(req) {
  try {
    // Authenticate user first
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database with error handling
    try {
      await dbConnect();
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Get projectName from query parameters
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");
    const projectId = searchParams.get("projectId");
    let query = {};

    if (projectName) {
      // Find project by name first, then use its _id
      const Project = (await import("@/app/models/project")).default;
      const project = await Project.findOne({ projectName: projectName });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      query.projectId = project._id;
    }

    // Add role-based filtering
    if (user.role === "member") {
      // Members can only see tasks assigned to them
      query["assignees.user"] = user.id;
    }
    // Admin and Manager can see all tasks

    const tasks = await Task.find(query)
      .populate("createdBy", "name email")
      .populate("assignees.user", "name email")
      .populate("projectId", "name projectName")
      .populate("tickets.assignedTo", "name username email")
      .populate("subtasks")
      .lean()
      .exec();

    return NextResponse.json(tasks, { status: 200 });
  } catch (err) {
    console.error("GET /tasks error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    // Authenticate User
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const user = await verifyAuth(token);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Role Check (Admin and Manager only)
    if (!["admin", "manager"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admin and manager can create tasks" },
        { status: 403 }
      );
    }

    // Connect to DB
    await dbConnect();

    // Parse & Validate Body
    const body = await req.json();
    console.log("Task body name : ", body.projectName);

    const requiredFields = ["title", "description", "projectId", "assignees"];
    for (const field of requiredFields) {
      if (
        !body[field] ||
        (field === "assignees" &&
          (!Array.isArray(body.assignees) || body.assignees.length === 0))
      ) {
        return NextResponse.json(
          { error: `Missing or invalid field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Optional checklist processing
    const checklist = Array.isArray(body.checklist)
      ? body.checklist.map((item) => ({
          item: item.item || "",
          isCompleted: !!item.isCompleted,
        }))
      : [];

    // Create Task
    const task = await Task.create({
      title: body.title,
      description: body.description,
      projectId: new mongoose.Types.ObjectId(body.projectId),
      projectName: body.projectName,
      createdBy: new mongoose.Types.ObjectId(user._id || user.id),
      assignedBy: new mongoose.Types.ObjectId(user._id || user.id),
      assignees: body.assignees.map((a) => ({
        user: new mongoose.Types.ObjectId(a.user),
        state: a.state || "assigned",
      })),
      estimatedHours: body.estimatedHours ? Number(body.estimatedHours) : 0,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      priority: body.priority || "medium",
      checklist,
      status: "pending",
      progress: 0,
    });

    // Send email notifications to assignees
    try {
      console.log("🔍 Starting email notification process...");
      console.log("📧 Email config check:");
      console.log("- EMAIL_HOST:", process.env.EMAIL_HOST);
      console.log("- EMAIL_PORT:", process.env.EMAIL_PORT);
      console.log("- EMAIL_USER:", process.env.EMAIL_USER);
      console.log("- EMAIL_PASSWORD exists:", !!process.env.EMAIL_PASSWORD);

      // Get project details
      console.log("📋 Fetching project details for ID:", body.projectId);
      const project = await Project.findById(body.projectId);
      if (!project) {
        console.error("❌ Project not found!");
        throw new Error("Project not found");
      }
      console.log("✅ Project found:", project.projectName);

      // Get assignee user details
      const assigneeIds = body.assignees.map((a) => a.user);
      console.log("👥 Looking for assignees with IDs:", assigneeIds);

      const assigneeUsers = await User.find({
        _id: { $in: assigneeIds },
      }).select("name email");

      if (assigneeUsers.length === 0) {
        console.error("❌ No assignee users found!");
        throw new Error("No assignee users found");
      }
      console.log(
        `✅ Found ${assigneeUsers.length} assignees:`,
        assigneeUsers.map((u) => ({ name: u.name, email: u.email }))
      );

      // Get assignedBy user details
      console.log("👤 User object from auth:", {
        id: user.id,
        _id: user._id,
        email: user.email,
        name: user.name,
      });

      // Try both user.id and user._id (different auth systems use different field names)
      const userId = user._id || user.id;
      console.log("👤 Using user ID:", userId);

      if (!userId) {
        console.error("❌ No user ID found in authenticated user object");
        throw new Error("No user ID found in authenticated user object");
      }

      const assignedByUser = await User.findById(userId).select("name email");
      if (!assignedByUser) {
        console.error("❌ Assigned by user not found!");
        throw new Error("Assigned by user not found");
      }
      console.log("✅ Assigned by user:", {
        name: assignedByUser.name,
        email: assignedByUser.email,
      });

      // Validate all required data exists
      if (project && assigneeUsers.length > 0 && assignedByUser) {
        console.log("🚀 All data validated. Sending emails...");
        const emailResult = await sendTaskAssignmentEmails(
          task,
          project,
          assignedByUser,
          assigneeUsers
        );

        // Count successful emails
        const successCount = emailResult.filter(
          (r) => r.status === "fulfilled" && r.value?.success
        ).length;
        console.log(
          `📧 Email summary: ${successCount}/${assigneeUsers.length} emails sent successfully`
        );
      } else {
        console.error(
          "❌ Email sending skipped - missing required information:"
        );
        console.error("- Project exists:", !!project);
        console.error("- Assignees count:", assigneeUsers.length);
        console.error("- AssignedBy user exists:", !!assignedByUser);
      }
    } catch (emailError) {
      console.error(
        "💥 Critical error in email notification process:",
        emailError
      );
      console.error("Error stack:", emailError.stack);
      // Don't break the API response if email fails
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create task",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    await dbConnect();

    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, newStatus } = await req.json();
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Member can only update their own assigned tasks
    if (user.role === "member") {
      const isAssigned = task.assignees.some(
        (assignee) => assignee.user.toString() === user._id.toString()
      );
      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: Cannot update tasks not assigned to you" },
          { status: 403 }
        );
      }
    }

    // Admin + Manager can update any task
    if (!["admin", "manager", "member"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Invalid role" },
        { status: 403 }
      );
    }

    task.status = newStatus;
    await task.save();

    return NextResponse.json(task, { status: 200 });
  } catch (err) {
    console.error("PATCH /tasks error:", err);
    return NextResponse.json(
      { error: "Failed to update task status" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();

    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can delete tasks
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin can delete tasks" },
        { status: 403 }
      );
    }

    const { taskId } = await req.json();
    const deleted = await Task.findByIdAndDelete(taskId);

    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /tasks error:", err);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
