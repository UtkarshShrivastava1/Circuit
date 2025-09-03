import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // ✅ Get the latest attendance of this user
    const latest = await Attendance.findOne({ userId: decoded.id })
      .sort({ date: -1 }) // newest first
      .populate("approvedBy", "name email");

    if (!latest) {
      return NextResponse.json({ message: "No attendance found" }, { status: 404 });
    }

    return NextResponse.json({
      approvalStatus: latest.approvalStatus || "pending",
      date: latest.date,
      workMode: latest.workMode,
      approvedBy: latest.approvedBy || null,
    });
  } catch (error) {
    console.error("Fetch my-latest Attendance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest attendance" },
      { status: 500 }
    );
  }
}
