// /api/user/[email]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";

// GET user by email
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const email = decodeURIComponent(params.email);
    const user = await User.findOne({ email }).select("-password");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH (update) user by email
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const email = decodeURIComponent(params.email);
    const data = await request.json();
    const user = await User.findOneAndUpdate(
      { email },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const email = decodeURIComponent(params.email);
    const user = await User.findOneAndDelete({ email });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    // Success: return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}