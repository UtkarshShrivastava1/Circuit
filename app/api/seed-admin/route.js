import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";

export async function POST() {
  try {
    await dbConnect();

    const adminEmail = process.env.ADMIN_EMAIL_DEFAULT;
    const adminPassword = process.env.ADMIN_PASSWORDD_DEFAULT;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      return NextResponse.json({
        message: "Admin already exists",
        user: existingAdmin,
      });
    }

    // Create admin user
    const adminUser = await User.create({
      email: adminEmail,
      name: "Admin User",
      role: "admin",
      profileState: "active",
      password: adminPassword, // Not used since you auth via env
      gender: "other",
      phoneNumber: "0000000000",
      dateOfBirth: "1990-01-01",
      profileImgUrl: "/user.png",
    });

    return NextResponse.json({
      message: "Admin user created successfully",
      user: { _id: adminUser._id, email: adminUser.email },
    });
  } catch (error) {
    console.error("Admin creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
