import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/app/models/Tasks";
import { authenticate } from "@/lib/middleware/authenticate";
import { checkRole } from "@/lib/middleware/checkRole";


// 🔹 DELETE → Remove a ticket (admin only)
export async function DELETE(req, { params }) {
  await dbConnect();
  // console.log("req params:", params);
  const { taskId,ticketId } = params;
  
  // console.log("DELETE ticketId: ", ticketId);
  // console.log("DELETE taskId: ", taskId);

  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roleCheck = checkRole(user, "admin");
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.message }, { status: roleCheck.status });
    }

    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const ticket = task.tickets.id(ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    
    // ticket.remove();
    task.tickets = task.tickets.filter(t => t._id.toString() !== ticketId);
    await task.save();

    return NextResponse.json({ message: "Ticket deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /tasks/[taskId]/tickets error:", err);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}