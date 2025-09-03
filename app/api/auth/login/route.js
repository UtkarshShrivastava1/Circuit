import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { signToken } from "@/lib/auth";

export async function POST(req) {
  try {
    await dbConnect();
    
    const { email, password } = await req.json();
    
    // Debug log
    console.log('Login attempt for:', email);

    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: "Invalid credentials" }, 
        { status: 401 }
      );
    }

    // Create payload for token
    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name, 
    };

    // Generate token
    const token = signToken(tokenPayload);
    
    // Debug log
    console.log('Generated token:', token ? 'Token created' : 'Token creation failed');

    return NextResponse.json({
      success: true,
      token: token,
      role: user.role,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}