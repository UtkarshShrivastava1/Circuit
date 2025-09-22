// Existing content...

export async function sendTaskCompletionEmail(
  task,
  project,
  completedBy,
  assignedBy
) {
  // Existing implementation...
}

export async function sendStatusUpdateNotification(task, project, updatedBy) {
  try {
    const emailTemplate = `
      <h2>Task Status Update Notification</h2>
      <p>A task you're managing has been updated:</p>
      <ul>
        <li><strong>Task Name:</strong> ${task.title}</li>
        <li><strong>Previous Status:</strong> ${task.previousStatus}</li>
        <li><strong>New Status:</strong> ${task.status}</li>
        <li><strong>Updated By:</strong> ${updatedBy.name}</li>
      </ul>
      <p>Project: ${project.projectName}</p>
    `;

    await sendEmail({
      to: project.managerEmail,
      subject: `Task Status Update: ${task.title}`,
      html: emailTemplate,
    });
  } catch (error) {
    console.error("Failed to send status update email:", error);
  }
}
