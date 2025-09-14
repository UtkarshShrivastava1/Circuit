import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/app/models/project";
import { verifyAuth } from "@/lib/auth";
import { checkRole } from "@/lib/middleware/checkRole";

export async function DELETE(req, { params }) {
  await dbConnect();

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const authUser = await verifyAuth(token);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    const roleCheck = checkRole(authUser, ["admin", "manager"]);
    if (!roleCheck.ok) {
      return NextResponse.json(
        { error: roleCheck.message },
        { status: roleCheck.status }
      );
    }

    const { id } = params; // announcement _id from route

    // Find project containing this announcement
    const project = await Project.findOne({ "announcements._id": id });
    if (!project) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Remove announcement by id
    project.announcements = project.announcements.filter(
      (a) => a._id.toString() !== id
    );

    await project.save();

    return NextResponse.json({ message: "Announcement deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Failed to delete announcement:", err);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
