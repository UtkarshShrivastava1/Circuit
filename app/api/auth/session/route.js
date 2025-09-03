import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { setSession, getSession, deleteSession } from "@/lib/session";

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    // Admin login check
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // ✅ Find or create admin user in database
      let adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });
      
      if (!adminUser) {
        // Create admin user in database
        adminUser = await User.create({
          email: process.env.ADMIN_EMAIL,
          name: "Admin User",
          role: "admin",
          profileState: "active",
          password: await bcrypt.hash("dummy-password", 10), // Not used for auth
          gender: "other",
          phoneNumber: "0000000000",
          dateOfBirth: "1990-01-01",
          profileImgUrl: "/user.png"
        });
        // console.log("Created admin user in database:", adminUser._id);
      }

      // ✅ Store complete admin user info with _id
      const adminSession = {
        _id: adminUser._id, // ✅ Now includes MongoDB _id
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        profileState: adminUser.profileState
      };

      await setSession(adminSession);
      
      const token = signToken({
        id: adminUser._id, // ✅ Use database _id, not 'admin'
        email: adminUser.email,
        role: adminUser.role
      });

      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400
      });

      return NextResponse.json({ 
        success: true, 
        token,
        role: "admin",
        user: adminSession // ✅ Return user with _id
      });
    }

    // Regular user login
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid credentials" 
      }, { status: 401 });
    }

    // Create token
    const token = signToken({ 
      id: user._id,
      email: user.email,
      role: user.role 
    });

    // ✅ Set session with _id for regular users too
    const userSession = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileState: user.profileState
    };

    await setSession(userSession);

    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400
    });

    return NextResponse.json({
      success: true,
      token,
      role: user.role,
      user: {
        _id: user._id, // ✅ Include _id in response
        id: user._id,
        email: user.email,
        name: user.name
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

export async function GET() {
  const session = await getSession();
  // console.log("Session from session route:", session);
  
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  // ✅ Session now includes _id for both admin and regular users
  return NextResponse.json({
    _id: session._id, // ✅ This will now exist
    name: session.name,
    email: session.email,
    role: session.role,
    profileState: session.profileState
  });
}

// DELETE session (for logout)
export async function DELETE() {
  await deleteSession();
  cookies().set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0 // ✅ Clear the cookie
  });
  return NextResponse.json({ message: "Logged out" });
}
