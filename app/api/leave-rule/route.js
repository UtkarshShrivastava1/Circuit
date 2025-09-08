import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LeaveRule from '@/app/models/LeaveRule';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  await dbConnect();
  const rule = await LeaveRule.getRule();
  return NextResponse.json(rule);
}

export async function PUT(req) {
  await dbConnect();

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user || user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = await req.json();
  let rule = await LeaveRule.getRule();

  rule.maxPaidLeavesPerMonth = data.maxPaidLeavesPerMonth ?? rule.maxPaidLeavesPerMonth;
  rule.notes = data.notes ?? rule.notes;
  rule.updatedBy = user.id;
  rule.updatedAt = new Date();

  await rule.save();

  return NextResponse.json(rule);
}
