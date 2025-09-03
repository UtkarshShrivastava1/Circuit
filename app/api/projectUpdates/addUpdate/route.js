// app/api/projectUpdates/addUpdate/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ProjectUpdate from "@/app/models/ProjectUpdate";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { projectName, update } = body;

    if (!projectName || !update?.email || !update?.date || !update?.workUpdate?.msg) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Find project update record or create a new one
    let project = await ProjectUpdate.findOne({ projectName });

    if (!project) {
      project = await ProjectUpdate.create({
        projectName,
        updates: [update],
      });
    } else {
      project.updates.push(update);
      await project.save();
    }

    return NextResponse.json(
      { message: "Update added successfully", project },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ERROR] Adding update:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
