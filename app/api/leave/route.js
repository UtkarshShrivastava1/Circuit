import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Leave from '@/app/models/Leave';
import LeaveRule from '@/app/models/LeaveRule';
import User from '@/app/models/User';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
  await dbConnect();

  const authHeader = req.headers.get('authorization');
  if (!authHeader) 
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) 
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  // Fetch user from DB (optional extra security)
  const user = await User.findById(decoded.id);
  if (!user) 
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const report = searchParams.get('report') === 'true';

  let query = {};
  let populateFields = [
    { path: 'userId', select: 'name email' },
    { path: 'decision.by', select: 'name email' } 
  ];
  
  if (report && ['admin', 'manager'].includes(user.role)) {
    populateFields.push({ path: 'decision.by', select: 'name email' });
  } else {
    query.userId = user._id;
  }

  const leaves = await Leave.find(query)
    .populate(populateFields)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ success: true, data: leaves });
}

export async function POST(req) {
  await dbConnect();

  const authHeader = req.headers.get('authorization');
  if (!authHeader)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id)
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

  const user = await User.findById(decoded.id);
  console.log("Leave :",user);
  if (!user)
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });

  const payload = await req.json();
  // Basic validation
  if (!payload.leaveType || !payload.startDate || !payload.endDate) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Paid quota check
  if (payload.leaveType === 'paid') {
    const rule = await LeaveRule.getRule();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidUsedCount = await Leave.countDocuments({
      userId: user._id,
      leaveType: 'paid',
      startDate: { $gte: monthStart, $lte: now },
      status: 'approved',
    });
    if (paidUsedCount >= rule.maxPaidLeavesPerMonth) {
      return NextResponse.json(
        { success: false, error: 'Paid leave quota exceeded' },
        { status: 400 }
      );
    }
  }

  // Create and return new leave
  const leave = await Leave.create({ ...payload, userId: user._id });
  // You do not need to update user.leaveHistory!
  return NextResponse.json({ success: true, data: leave });
}
