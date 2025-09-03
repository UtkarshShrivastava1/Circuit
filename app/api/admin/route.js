import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const data = await request.json();

    // Required fields validation
    const requiredFields = [
      "email",
      "password",
      "confirmPassword", // Only for validation, not saved
      "name",
      "gender",
      "role",
      "phoneNumber",
      "dateOfBirth",
      "profileState",
      "profileImgUrl",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate password match
    if (data.password !== data.confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Validate email format (basic example)
    if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate phone number (basic example)
    if (!/^\d{10}$/.test(data.phoneNumber)) {
      return NextResponse.json(
        { error: "Phone number must be 10 digits" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Normalize and check for existing user
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user (without confirmPassword)
    const newUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: data.name.trim(),
      gender: data.gender,
      role: data.role,
      phoneNumber: data.phoneNumber,
      dateOfBirth: data.dateOfBirth, // Ensure this is a valid date in your schema
      profileState: data.profileState,
      profileImgUrl: data.profileImgUrl,
    });

    return NextResponse.json({ message: "User created successfully!" });
  } catch (error) {
    console.error("Error in user creation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
