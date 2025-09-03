import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/session";

// ✅ Change from GET to POST to match your frontend request
export async function POST(request) {
  try {
    // ✅ Clear the session
    await deleteSession();
    
    // ✅ Create response
    const response = NextResponse.json({
      message: "Logout successful",
      success: true,
    });

    // ✅ Clear the token cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Set expiration to the past to clear the cookie
    });

    return response;
    
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
