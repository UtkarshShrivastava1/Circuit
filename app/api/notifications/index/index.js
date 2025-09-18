// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import jwt from "jsonwebtoken";
// import dbConnect from "@/lib/mongodb";
// import Alert from "@/app/models/Notification.model";

// export async function GET() {
//   await dbConnect();
//   const token = cookies().get("token")?.value;
//   if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const decoded = jwt.verify(token, process.env.JWT_SECRET);
//   const notifications = await Alert.find({ recipient: decoded.id }).sort({ createdAt: -1 }).limit(50);
//   return NextResponse.json(notifications);
// }
