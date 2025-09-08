import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Task from "@/app/models/Tasks";
import { verifyToken } from "@/lib/auth";

export async function PATCH(req, { params }) {
  const { taskId, itemId } = params;
  const { isCompleted } = await req.json();

  if (typeof isCompleted !== "boolean") {
    return NextResponse.json({ error: "'isCompleted' must be boolean" }, { status: 400 });
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    // Extract token from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const checklistItem = task.checklist.id(itemId);
    if (!checklistItem) return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });

    // Optional: You may check if user is authorized (assigned) to update here

    checklistItem.isCompleted = isCompleted;

    // Update completion meta (optional)
    if (isCompleted) {
      checklistItem.completedBy = new mongoose.Types.ObjectId(user.id); // Assuming user.id exists
      checklistItem.completedAt = new Date();
    } else {
      checklistItem.completedBy = undefined;
      checklistItem.completedAt = undefined;
    }

    // Calculate overall progress (checklist + subtasks)
    const totalChecklist = task.checklist.length;
    const completedChecklist = task.checklist.filter(i => i.isCompleted).length;
    const totalSubtasks = task.subtasks.length;
    const completedSubtasks = task.subtasks.filter(st => st.status === "completed").length;

    task.progress = totalChecklist + totalSubtasks === 0
      ? 0
      : Math.round(((completedChecklist + completedSubtasks) / (totalChecklist + totalSubtasks)) * 100);

    await task.save();

    return NextResponse.json({ message: "Checklist updated", progress: task.progress }, { status: 200 });
  } catch (error) {
    console.error("Checklist PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
