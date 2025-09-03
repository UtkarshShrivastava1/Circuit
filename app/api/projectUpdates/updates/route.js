import dbConnect from "@/lib/mongodb";
import ProjectUpdate from "@/app/models/ProjectUpdate";

export const dynamic = 'force-dynamic'; // Explicitly mark as dynamic

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");

    if (!projectName) {
      return new Response(JSON.stringify({ updates: [] }), { status: 200 });
    }

    const project = await ProjectUpdate.findOne({ projectName }).lean();

    if (!project || !project.updates) {
      return new Response(JSON.stringify({ updates: [] }), { status: 200 });
    }

    return new Response(JSON.stringify({ updates: project.updates }), { status: 200 });
  } catch (err) {
    console.error("Error fetching updates:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
