import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { signToken } from "@/lib/auth";

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();
    const emailLower = email.trim().toLowerCase();

    console.log("Login attempt for:", emailLower);

    const user = await User.findOne({ email: emailLower }).select("+password");
    if (!user) {
      console.log("User not found:", emailLower);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.profileState !== "active") {
      console.log("Account not active:", user.profileState);
      return NextResponse.json(
        { error: `Your account is ${user.profileState}. Contact support.` },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Password mismatch for:", emailLower);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = signToken(tokenPayload);
    console.log("Generated token for:", user.email);

    return NextResponse.json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
