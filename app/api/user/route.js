import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Mark route as dynamic due to request.url usage

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      const user = await User.findOne({ email }).select('-password');
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    // Fetch all users if no email query
    const users = await User.find().select('-password');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
