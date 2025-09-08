import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Leave from '@/app/models/Leave';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
  await dbConnect();

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const leaves = await Leave.find({ status: 'pending' })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  return NextResponse.json({ leaves });
}
