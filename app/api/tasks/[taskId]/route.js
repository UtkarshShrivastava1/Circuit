// app/api/tasks/[taskId]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/app/models/Tasks";
import { authenticate } from "@/lib/middleware/authenticate"; // ✅ JWT helper
import { checkRole } from "@/lib/middleware/checkRole"; // ✅ role helper
import mongoose from "mongoose";

// 🔹 GET → fetch single task
export async function GET(req, { params }) {
  const { taskId } = params;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return NextResponse.json({ error: 'Invalid Task ID' }, { status: 400 });
  }

  try {
    await dbConnect();

    const task = await Task.findById(taskId)
      .populate('assignees.user', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('GET /api/tasks/[taskId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}


// 🔹 PUT → update task (Admin + Manager, Members only if assigned)
export async function PUT(req, { params }) {
  await dbConnect();
  const { taskId } = params;

  try {
    const user = await authenticate(req); // ✅ JWT check
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // ✅ Members can update ONLY their own assigned task
    if (user.role === "member" && task.assignedTo.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Forbidden: Cannot update others' tasks" }, { status: 403 });
    }

    // ✅ Admin + Manager can update any task
    if (!["admin", "manager", "member"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Invalid role" }, { status: 403 });
    }

    const body = await req.json();
    const updated = await Task.findByIdAndUpdate(taskId, body, {
      new: true,
      runValidators: true,
    })
      .populate("subtasks")
      .populate("tickets.assignedTo")
      .populate("tickets.createdBy");

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT /tasks/[taskId] error:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// 🔹 DELETE → only Admin
export async function DELETE(req, { params }) {
  await dbConnect();
  const { taskId } = params;

  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRole(user, ["admin"])) {
      return NextResponse.json({ error: "Forbidden: Only admin can delete tasks" }, { status: 403 });
    }

    const deleted = await Task.findByIdAndDelete(taskId);

    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /tasks/[taskId] error:", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}