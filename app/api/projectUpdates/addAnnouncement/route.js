// app/api/projectUpdates/announcements/route.js

// Use relative imports to avoid alias issues from within app/api/*
// From this file to lib/mongodb.js and models/Announcement.js:
import dbConnect from "@/lib/mongodb";
import Announcement from "@/app/models/Announcement";

export const dynamic = 'force-dynamic'; // Mark route as dynamic due to req.url usage

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");

    // If projectName missing, respond with empty array
    if (!projectName) {
      return new Response(JSON.stringify({ announcement: [] }), { status: 200 });
    }

    // Fetch announcements for the project, sorted newest first
    const docs = await Announcement.find({ projectName })
      .sort({ createdAt: -1 })
      .lean();

    return new Response(
      JSON.stringify({ announcement: Array.isArray(docs) ? docs : [] }),
      { status: 200 }
    );
  } catch (e) {
    console.error("announcements GET error:", e);
    return new Response(JSON.stringify({ msg: "Internal server error" }), { status: 500 });
  }
}


// Optional: If you later need to create announcements via POST from a different page,
// you can add a POST handler here (your UI currently posts to /api/projectUpdates/addAnnouncement).
// Keeping GET only for now to satisfy the listing in your Project Details page.
