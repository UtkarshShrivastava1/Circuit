// import { NextResponse } from "next/server";
// import bcrypt from "bcryptjs";
// import dbConnect from "@/lib/mongodb";
// import User from "@/app/models/User";
// import { signToken } from "@/lib/auth";

// export async function POST(req) {
//   try {
//     await dbConnect();
//     const { email, password } = await req.json();
//     const emailLower = email.trim().toLowerCase();

//     console.log("Login attempt for:", emailLower);

//     const user = await User.findOne({ email: emailLower }).select("+password");
//     if (!user) {
//       console.log("User not found:", emailLower);
//       return NextResponse.json(
//         { error: "Invalid credentials" },
//         { status: 401 }
//       );
//     }

//     if (user.profileState !== "active") {
//       console.log("Account not active:", user.profileState);
//       return NextResponse.json(
//         { error: `Your account is ${user.profileState}. Contact support.` },
//         { status: 403 }
//       );
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password);
//     if (!isPasswordValid) {
//       console.log("Password mismatch for:", emailLower);
//       return NextResponse.json(
//         { error: "Invalid credentials" },
//         { status: 401 }
//       );
//     }

//     const tokenPayload = {
//       id: user._id.toString(),
//       email: user.email,
//       role: user.role,
//       name: user.name,
//     };

//     const token = signToken(tokenPayload);
//     console.log("Generated token for:", user.email);

//     return NextResponse.json({
//       success: true,
//       token,
//       role: user.role,
//       user: {
//         id: user._id.toString(),
//         email: user.email,
//         name: user.name,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     return NextResponse.json(
//       { error: "Authentication failed" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken"; // or your token generator
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set cookie
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure only in prod
      sameSite: "lax", // lax works for local dev
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return NextResponse.json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
