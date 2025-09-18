// app/api/socket/route.js
import { NextResponse } from "next/server";
import { getIO } from "@/lib/socket";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ status: "Socket running" });
}
