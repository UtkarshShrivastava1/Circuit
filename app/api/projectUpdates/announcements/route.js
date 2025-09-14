import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/app/models/project";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");

    if (!projectName) {
      return new Response(JSON.stringify({ projectName: null, announcements: [] }), { status: 200 });
    }

    // Select projectName and announcements only (file is nested inside announcements)
    const project = await Project.findOne({ projectName }).select("projectName announcements").lean();

    if (!project) {
      return new Response(JSON.stringify({ projectName: null, announcements: [] }), { status: 200 });
    }

    const announcements = Array.isArray(project.announcements) ? project.announcements : [];
        // console.log('announcement :',announcements);
    // Sort announcements by createdAt descending (newest first)
    const sortedAnnouncements = announcements.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Return announcements including nested 'file' field inside each announcement
    return new Response(
      JSON.stringify({ projectName: project.projectName, announcements: sortedAnnouncements }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching announcements:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
