import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Attendance from "@/app/models/Attendance";
import { verifyToken } from "@/lib/auth";
import User from "@/app/models/User";

export async function GET(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!["manager", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get today’s date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Count attendance
    const presentCount = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      approvalStatus: "approved",
    });

    const pendingCount = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      approvalStatus: "pending",
    });

    const rejectedCount = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      approvalStatus: "rejected",
    });

    const officeCount = await Attendance.countDocuments({
  date: { $gte: today, $lt: tomorrow },
  approvalStatus: "approved",
  workMode: "office",
});

const wfhCount = await Attendance.countDocuments({
  date: { $gte: today, $lt: tomorrow },
  approvalStatus: "approved",
  workMode: "wfh",
});

    return NextResponse.json({
      present: presentCount,
      pending: pendingCount,
      office: officeCount,
      wfh: wfhCount,
      rejected: rejectedCount,
    });
  } catch (error) {
    console.error("Today summary error:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
