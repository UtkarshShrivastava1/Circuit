import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import User from "@/app/models/User";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    // 🔹 Extract token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 🔹 Get logged in user
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    let filters = {};

    // Date filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filters.date = { $gte: start, $lte: end };
    }

    // User filter (only if provided)
    if (userId) {
      filters.userId = userId;
    }

    // Status filter
    if (status) {
      filters.approvalStatus = status;
    }

    // 🔹 Role-based access
    if (currentUser.role === "member") {
      filters.userId = currentUser._id;
    } else if (currentUser.role === "manager") {
      const teamMembers = await User.find({ manager: currentUser._id }).select("_id");
      filters.userId = { $in: teamMembers.map((u) => u._id) };
    }

    // 🔹 Fetch attendance
    const report = await Attendance.find(filters)
      .populate("userId", "name email role")
      .populate("approvedBy", "name role")
      .sort({ date: -1 })
      .select("date approvalStatus workMode userId approvedBy");
      
    return NextResponse.json(report);
  } catch (err) {
    console.error("Attendance Report error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
