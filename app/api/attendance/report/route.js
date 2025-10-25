import Attendance from "@/app/models/Attendance";
import User from "@/app/models/User";
import { verifyToken } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // Get current user
    const currentUser = await User.findById(decoded.id);
    if (!currentUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Parse filters
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

    // User filter (if provided)
    if (userId) {
      filters.userId = userId;
    } else if (currentUser.role === "member") {
      // Member can only see own records
      filters.userId = currentUser._id;
    }
    // Admin & manager can see all records unless filtered

    // Status filter
    if (status) {
      filters.approvalStatus = status;
    }

    // Fetch attendance
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
