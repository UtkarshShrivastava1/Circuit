import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Task from "@/app/models/Tasks";
import { authenticate } from "@/lib/middleware/authenticate";
import { checkRole } from "@/lib/middleware/checkRole";
import { verifyAuth } from "@/lib/auth";


// 🔹 POST → Create ticket (only admin/manager)
// /app/api/tasks/[taskId]/tickets/route.js

export async function POST(req, { params }) {
  const { taskId } = params;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const user = await verifyAuth(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      issueTitle,
      description,
      assignedTo = null,
      priority = "medium",
      estimatedHours = 0,
      tag = "other"
    } = body;

    if (!issueTitle || typeof issueTitle !== "string") {
      return NextResponse.json({ error: "Issue title is required" }, { status: 400 });
    }

    // Validate and ensure estimatedHours is a number
    let estimatedHoursNum = Number(estimatedHours);
    if (isNaN(estimatedHoursNum) || estimatedHoursNum < 0) {
      return NextResponse.json({ error: "Estimated hours must be a non-negative number" }, { status: 400 });
    }

    await dbConnect();

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const newTicket = {
      issueTitle: issueTitle.trim(),
      description: description?.trim() || "",
      assignedTo: assignedTo ? assignedTo : null,
      priority,
      estimatedHours: estimatedHoursNum,
      tag,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    task.tickets.push(newTicket);
    await task.save();

    const addedTicket = task.tickets[task.tickets.length - 1].toObject();
    return NextResponse.json({ ticket: addedTicket }, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket. Server error." },
      { status: 500 }
    );
  }
}


// 🔹 GET → Fetch tickets (role based)
export async function GET(req, { params }) {
  await dbConnect();
  const { taskId } = params;
 

  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const task = await Task.findById(taskId)
      .populate("tickets.assignedTo")
      // .populate("tickets.createdBy");

      // console.log("task: ", task);

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // ✅ Admin/Manager → can view all tickets
    if (["admin", "manager"].includes(user.role)) {
      return NextResponse.json(task.tickets, { status: 200 });
    }

    // ✅ Member → can only see tickets if assigned to the task
    if (user.role === "member") {
      if (task.assignedTo.toString() !== user._id.toString()) {
        return NextResponse.json({ error: "Forbidden: Not your task" }, { status: 403 });
      }
      console.log("Member accessing tickets for their task" , task.tickets);
      return NextResponse.json(task.tickets, { status: 200 });

    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (err) {
    console.error("GET /tasks/[taskId]/tickets error:", err);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

// 🔹 PUT → Update a ticket (admin/manager only)
export async function PUT(req, { params }) {
  await dbConnect();
  const { taskId } = params;
  const { ticketId, ...updates } = await req.json();

  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roleCheck = checkRole(user, ["admin", "manager"]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.message }, { status: roleCheck.status });
    }

    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const ticket = task.tickets.id(ticketId);
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    Object.assign(ticket, updates);
    await task.save();

    return NextResponse.json(ticket, { status: 200 });
  } catch (err) {
    console.error("PUT /tasks/[taskId]/tickets error:", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

// Delete a ticket (admin only)


export async function DELETE(req, { params }) {
  const { ticketId } = params;
  await dbConnect();

  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roleCheck = checkRole(user, "admin");
    if (!roleCheck.ok) return NextResponse.json({ error: roleCheck.message }, { status: roleCheck.status });

    // Find task containing the ticket
    const task = await Task.findOne({ "tickets._id": ticketId });
    if (!task) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Remove the ticket subdocument by id
    task.tickets = task.tickets.filter(t => t._id.toString() !== ticketId);
    await task.save();

    return NextResponse.json({ message: "Ticket deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}

