import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Leave from '@/app/models/Leave';
import User from '@/app/models/User';
import { verifyToken } from '@/lib/auth';

export async function POST(req, { params }) {
  try {
    await dbConnect();

    // 1. Check Authorization Header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract and Verify Token
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 3. Check User Role (Admin/Manager Only)
    const user = await User.findById(decoded.id);
    if (!user || !['manager', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Not authorized to approve leave' }, { status: 403 });
    }

    // 4. Find and Populate Leave
    const leave = await Leave.findById(params.id)
      .populate('userId', 'name email')
      .populate('decision.by', 'name');
    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // 5. Update Status and Decision
    const { action } = await req.json();
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    leave.status = action === 'approve' ? 'approved' : 'rejected';
    leave.decision = { by: user._id, at: new Date() };
    await leave.save();

    // 6. Return Success with Updated Leave (Populated)
    await leave.populate('userId', 'name email');
    await leave.populate('decision.by', 'name');
    return NextResponse.json({ success: true, leave });

  } catch (error) {
    console.error('Approve Leave error:', error);
    return NextResponse.json({ error: 'Failed to approve leave' }, { status: 500 });
  }
}
