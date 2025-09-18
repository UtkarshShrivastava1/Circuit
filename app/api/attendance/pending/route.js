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
    console.log('user',user)

    if (!["manager", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pending = await Attendance.find({ approvalStatus: "pending" })
      .populate("userId", "name email role")
      .select("date workMode approvalStatus userId");

    return NextResponse.json({ success: true, pending });
  } catch (error) {
    console.error("Fetch Pending Attendance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending attendance" },
      { status: 500 }
    );
  }
}
