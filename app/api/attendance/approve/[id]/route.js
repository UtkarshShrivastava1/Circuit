import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import { verifyToken } from "@/lib/auth";
import User from "@/app/models/User";

export async function POST(req, { params }) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { action } = await req.json(); // approve or reject
    const user = await User.findById(decoded.id);

    if (!["manager", "admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Not authorized to approve attendance" },
        { status: 403 }
      );
    }

    const attendance = await Attendance.findById(params.id);
    if (!attendance) {
      return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    }

    attendance.approvalStatus = action === "approve" ? "approved" : "rejected";
    attendance.approvedBy = user._id;

    await attendance.save();

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error("Approve Attendance error:", error);
    return NextResponse.json(
      { error: "Failed to approve attendance" },
      { status: 500 }
    );
  }
}
