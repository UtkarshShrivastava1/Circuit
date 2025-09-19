import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import Project from "@/app/models/project";
import { verifyAuth } from "@/lib/auth";
// import mongoose from "mongoose";
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
     

    const {
      projectName,
      projectState = "ongoing",
      projectDomain = "",
      startDate,
      endDate,
      managerId,
      participants = [],
      announcements = [], // NEW: optional array of announcements
    } = body;
    console.log('body : ',body)

    // Existing validation as before ...

    // Validate announcements if provided
    for (const a of announcements) {
      if (
        !a.msg ||
        !a.postedBy ||
        !a.postedBy._id ||
        !a.postedBy.name ||
        !a.postedBy.email
      ) {
        return NextResponse.json(
          { error: "Announcement missing required fields" },
          { status: 400 }
        );
      }
      if (!a.date) {
        a.date = new Date();
      } else {
        a.date = new Date(a.date);
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
        email: p.email.toLowerCase(), // normalize email for consistent filtering
        username: p.username,
        roleInProject: p.roleInProject,
        responsibility: p.responsibility,
      })),
      announcements: announcements.map((a) => ({
        msg: a.msg,
        date: a.date,
        postedBy: {
          _id: a.postedBy._id,
          name: a.postedBy.name,
          email: a.postedBy.email,
        },
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
    // Extract token from Authorization header
    const authHeader = req.headers.get("authorization");
    // console.log("Auth Header received:", authHeader);

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
      // console.log("Token decoded successfully:", decoded.email);
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
const projects = await Project.find({}) // Remove the filter object
      .populate('manager', 'name email') // Add manager population for better display
      .populate('participants.userId', 'name email') // Add participant details
      .sort({ createdAt: -1 })
      .lean();

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
