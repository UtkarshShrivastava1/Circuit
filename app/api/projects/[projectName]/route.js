import mongoose from "mongoose";
import Project from "@/app/models/project";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";

export async function GET(request, { params }) {
  await dbConnect();

  const projectName = params.projectName;

  // Check if the param looks like an ObjectId
  if (mongoose.Types.ObjectId.isValid(projectName)) {
    const project = await Project.findById(projectName);
    if (!project) {
      return NextResponse.json(
        { message: "Not found (by _id)" },
        { status: 404 }
      );
    }
    return NextResponse.json(project);
  }

  // Otherwise, treat as string slug (projectName)
  const project = await Project.findOne({ projectName });
  if (!project) {
    return NextResponse.json(
      { message: "Not found (by projectName)" },
      { status: 404 }
    );
  }
  return NextResponse.json(project);
}

// ---------------------------UPDATE CODE------------------------------------------------------------
export async function PUT(req, { params }) {
  await dbConnect();

  const { projectName } = params;
  // console.log('project data : ',projectName)
  const data = await req.json();

  try {
    const updatedProject = await Project.findOneAndUpdate(
      { projectName },
      {
        projectState: data.projectState,
        projectDomain: data.projectDomain,
        startDate: data.startDate,
        endDate: data.endDate,
        participants: data.participants, // ✅ Always replace with latest list
      },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 }
      );
    }

    return new Response(JSON.stringify(updatedProject), { status: 200 });
  } catch (err) {
    console.error("Error updating project:", err);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
}

//Delete the project
export async function DELETE(req, { params }) {
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

    if (!["admin", "manager"].includes(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { projectName } = params;
    if (!projectName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const project = await Project.findOne({ projectName });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Optional: Only admin or project manager can delete
    if (authUser.role !== "admin" && !project.manager.equals(authUser.id)) {
      return NextResponse.json(
        { error: "You do not have permission to delete this project" },
        { status: 403 }
      );
    }

    await Project.findOneAndDelete({ projectName });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
