import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/app/models/project";
import { verifyAuth } from "@/lib/auth";
import { checkRole } from "@/lib/middleware/checkRole";

export async function POST(req) {
  await dbConnect();

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const authUser = await verifyAuth(token);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
// console.log('authUser :',authUser)
    const roleCheck = checkRole(authUser, ["admin", "manager"]);
    if (!roleCheck.ok) {
      return NextResponse.json({ error: roleCheck.message }, { status: roleCheck.status });
    }

    const body = await req.json();
    // console.log('body: ',body);
    const { projectName, announcement } = body;


    if (!projectName || !announcement || !announcement.post || !announcement.post.msg) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const project = await Project.findOne({ projectName });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Parse date from string, fallback to now if invalid
    let  parsedDate = announcement.date ? new Date(announcement.date) : new Date();
    if (isNaN(parsedDate.getTime())) {
      // Invalid date string fallback
      parsedDate = new Date();
    }

    const newAnnouncement = {
      projectName, 
      msg: announcement.post.msg,
      date: parsedDate,
      postedBy: {
        _id: authUser.id,
        name: authUser.role,
        email: authUser.email,
      },
      file: announcement.post.file,
      originalName: announcement.post.originalName, // add this
    };

    console.log('newAnnouncement :',newAnnouncement)

    project.announcements.push(newAnnouncement);
    await project.save();

    return NextResponse.json(
      { message: "Announcement posted", announcement: newAnnouncement },
      { status: 201 }
    );
  } catch (err) {
    console.error("Failed to post announcement:", err);
    return NextResponse.json({ error: "Failed to post announcement" }, { status: 500 });
  }
}
