import { NextResponse } from "next/server";

// Dormant webpush route - functionality disabled as requested
export async function POST(req) {
  // Return success response without doing anything
  return NextResponse.json({
    success: true,
    message: "Webpush functionality is disabled",
  });
}
