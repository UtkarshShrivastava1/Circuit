import Task from '@/app/models/Tasks';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function PATCH(req, { params }) {
  const { taskId } = params;
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return NextResponse.json({ error: 'Invalid Task ID' }, { status: 400 });
  }

  const { status } = await req.json();
  const validStatuses = ['pending', 'ongoing', 'completed'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  try {
    await dbConnect();
    // Here you should authenticate user and check if role === "member"
    // This example assumes auth middleware or logic before

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { status },
      { new: true }
    );

    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Failed to update task status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
