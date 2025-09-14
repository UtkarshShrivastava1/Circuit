import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Task from '@/app/models/Tasks';
import { authenticate } from '@/lib/middleware/authenticate';
import { checkRole } from '@/lib/middleware/checkRole';

export async function DELETE(req, { params }) {
  const { ticketId } = params;
  console.log(`Deleting ticket ${ticketId}`);

  await dbConnect();

  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const roleCheck = checkRole(user, ['admin', 'manager']);
    if (!roleCheck.ok) return NextResponse.json({ error: roleCheck.message }, { status: roleCheck.status });

    // Find task containing the ticket
    const task = await Task.findOne({ "tickets._id": ticketId });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Remove the ticket
    task.tickets = task.tickets.filter(t => t._id.toString() !== ticketId);
    await task.save();

    return NextResponse.json({ message: 'Ticket deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('Error deleting ticket:', err);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
