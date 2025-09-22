// scripts/debug-email.js
import dotenv from "dotenv";
dotenv.config();

// Fix for mongodb connection
process.env.MONGODB_URI =
  process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;

import dbConnect from "../lib/mongodb.js";
import Task from "../app/models/Tasks.js";
import User from "../app/models/User.js";
import Project from "../app/models/project.js";
import { sendTaskAssignmentEmails } from "../lib/emailUtils.js";

async function debugEmail() {
  try {
    console.log("Connecting to database...");
    await dbConnect();
    console.log("Database connected successfully");

    // Try to find a sample task
    const task = await Task.findOne()
      .populate("projectId")
      .populate("assignees.user")
      .lean();
    if (!task) {
      console.log("No tasks found in database");
      return;
    }

    console.log("Found task:", task.title);
    console.log("Project ID:", task.projectId);

    // Try to get project details
    const project = await Project.findById(task.projectId);
    if (!project) {
      console.log("Project not found");
      return;
    }
    console.log("Project found:", project.projectName);

    // Try to get assignee details
    const assigneeIds = task.assignees.map((a) => a.user._id);
    console.log("Assignee IDs:", assigneeIds);

    const assigneeUsers = await User.find({
      _id: { $in: assigneeIds },
    }).select("name email");
    console.log("Assignee users:", assigneeUsers);

    // Try to get assignedBy user
    const assignedByUser = await User.findById(task.assignedBy).select(
      "name email"
    );
    console.log("Assigned by user:", assignedByUser);

    // Try to send emails
    if (project && assigneeUsers.length > 0 && assignedByUser) {
      console.log("Sending emails...");
      await sendTaskAssignmentEmails(
        task,
        project,
        assignedByUser,
        assigneeUsers
      );
      console.log("Emails sent successfully");
    } else {
      console.log("Missing required data for sending emails");
      console.log("Project:", !!project);
      console.log("Assignee users:", assigneeUsers.length);
      console.log("Assigned by user:", !!assignedByUser);
    }
  } catch (error) {
    console.error("Debug error:", error);
  } finally {
    process.exit(0);
  }
}

debugEmail();
