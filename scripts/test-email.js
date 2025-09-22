import { sendEmail } from "../lib/mailer.js";
import {
  generateTaskAssignmentTemplate,
  generateTaskCompletionTemplate,
} from "../lib/emailUtils.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testEmail() {
  try {
    // Test data
    const task = {
      _id: "test-task-id",
      title: "Test Task",
      description: "This is a test task for email notifications",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: "high",
    };

    const project = {
      projectName: "Test Project",
    };

    const assignedBy = {
      name: "Test Manager",
      email: "manager@example.com",
    };

    const assignee = {
      name: "Test Employee",
      email: process.env.TEST_EMAIL || "employee@example.com",
    };

    const completedBy = {
      name: "Test Employee",
      email: process.env.TEST_EMAIL || "employee@example.com",
    };

    // Generate templates
    const assignmentTemplate = generateTaskAssignmentTemplate(
      task,
      project,
      assignedBy,
      assignee
    );
    const completionTemplate = generateTaskCompletionTemplate(
      task,
      project,
      completedBy,
      assignedBy
    );

    console.log("Testing assignment email...");

    // Send assignment email
    await sendEmail({
      to: assignee.email,
      subject: `New Task Assigned: ${task.title} - ${project.projectName}`,
      html: assignmentTemplate,
    });

    console.log("Assignment email sent successfully!");

    console.log("Testing completion email...");

    // Send completion email
    await sendEmail({
      to: assignedBy.email,
      subject: `Task Completed: ${task.title} - ${project.projectName}`,
      html: completionTemplate,
    });

    console.log("Completion email sent successfully!");
  } catch (error) {
    console.error("Error testing email:", error);
  }
}

testEmail();
