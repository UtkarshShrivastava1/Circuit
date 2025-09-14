// /app/api/downloadFile/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/app/models/project";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");
    const fileId = searchParams.get("fileId");

    if (!projectName || !fileId) {
      return new Response("Missing parameters", { status: 400 });
    }

    const project = await Project.findOne({ projectName }).lean();
    if (!project) return new Response("Project not found", { status: 404 });

    const announcement = project.announcements.find(a => a._id.toString() === fileId);
    if (!announcement || !announcement.file) return new Response("File not found", { status: 404 });

    // Assuming announcement.file stores a buffer or URL to file
    // If it's a URL to storage (S3, Cloudinary, etc.), you may redirect:
    return NextResponse.redirect(announcement.file);

    // If it's a buffer, you can do:
    // return new Response(announcement.file.buffer, {
    //   headers: {
    //     "Content-Type": "application/pdf",
    //     "Content-Disposition": `attachment; filename="${announcement.fileName}"`,
    //   },
    // });
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
