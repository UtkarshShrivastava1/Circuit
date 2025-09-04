import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import Project from "@/app/models/project";
import { verifyAuth } from "@/lib/auth";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

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
    if (!["manager", "admin"].includes(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    console.log("Received project creation payload:", body);

    const {
      projectName,
      projectState = "ongoing",
      projectDomain = "",
      startDate,
      endDate,
      managerId,
      participants = [],
    } = body;

    // Input validation
    if (!projectName || !startDate || !managerId) {
      return NextResponse.json(
        { error: "Missing projectName, startDate or managerId" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
      return NextResponse.json(
        { error: "Project name format invalid" },
        { status: 400 }
      );
    }
    if (endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date cannot be after end date" },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      return NextResponse.json({ error: "Invalid managerId" }, { status: 400 });
    }
    const managerUser = await User.findById(managerId);
    if (!managerUser) {
      return NextResponse.json(
        { error: "Manager user not found" },
        { status: 400 }
      );
    }
    if (managerUser.role !== "manager" && authUser.role !== "admin") {
      return NextResponse.json(
        { error: "User is not authorized as manager" },
        { status: 400 }
      );
    }
    for (const p of participants) {
      if (
        !p.userId ||
        !p.email ||
        !p.username ||
        !p.roleInProject ||
        !p.responsibility
      ) {
        return NextResponse.json(
          { error: "Participant missing fields" },
          { status: 400 }
        );
      }
      if (!mongoose.Types.ObjectId.isValid(p.userId)) {
        return NextResponse.json(
          { error: `Participant userId invalid: ${p.userId}` },
          { status: 400 }
        );
      }
      const participantUser = await User.findById(p.userId);
      if (!participantUser) {
        return NextResponse.json(
          { error: `Participant userId not found: ${p.userId}` },
          { status: 400 }
        );
      }
    }

    const existingProject = await Project.findOne({ projectName });
    if (existingProject) {
      return NextResponse.json(
        { error: "Project name already exists" },
        { status: 409 }
      );
    }

    const newProject = new Project({
      projectName: projectName.trim(),
      projectState,
      projectDomain: projectDomain.trim(),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      manager: managerId,
      participants: participants.map((p) => ({
        userId: p.userId,
        email: p.email.toLowerCase(),
        username: p.username,
        roleInProject: p.roleInProject,
        responsibility: p.responsibility,
      })),
    });

    const savedProject = await newProject.save();
    return NextResponse.json(
      { message: "Project successfully created", project: savedProject },
      { status: 201 }
    );
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  await dbConnect();
  try {
    const authHeader = req.headers.get("authorization");
    console.log("Auth Header received:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];
    console.log("Token extracted:", token ? "Present" : "Missing");

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully:", decoded.email);
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Get projects with role-based filtering
    // Admins see all projects; others see only projects with their email in participants
    let filter = {};
    if (decoded.role !== "admin") {
      filter["participants.email"] = {
        $regex: new RegExp(decoded.email, "i"), // case-insensitive match
      };
    }

    const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();

    console.log(`Found ${projects.length} projects for user ${decoded.email}`);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Projects API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
