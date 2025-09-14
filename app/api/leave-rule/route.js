import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import LeaveRule from '@/app/models/LeaveRule';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const rule = await LeaveRule.getRule();
    return NextResponse.json(rule);
  } catch (error) {
    console.error('GET /api/leave-rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token ? 'Present' : 'Missing');
    
    const data = await req.json();
    
    // Check if this is actually a PUT request via _method
    if (data._method === 'PUT') {
      delete data._method;
      
      console.log('Verifying token...');
      const user = await verifyToken(token);
      console.log('User verified:', user ? `User ID: ${user.id}, Role: ${user.role}` : 'Failed');
      
      if (!user) {
        console.log('Token verification failed');
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      
      if (user.role !== 'admin') {
        console.log('User role insufficient:', user.role);
        return NextResponse.json({ error: 'Forbidden - Admin role required' }, { status: 403 });
      }

      // Your existing policy update logic...
      let rule = await LeaveRule.getRule();
      rule.maxPaidLeavesPerMonth = data.maxPaidLeavesPerMonth ?? rule.maxPaidLeavesPerMonth;
      rule.notes = data.notes ?? rule.notes;
      rule.updatedBy = user.id;
      rule.updatedAt = new Date();

      await rule.save();
      return NextResponse.json(rule);
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('POST /api/leave-rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// Keep your original PUT method as backup
export async function PUT(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[22];
    
    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    let rule = await LeaveRule.getRule();

    rule.maxPaidLeavesPerMonth = data.maxPaidLeavesPerMonth ?? rule.maxPaidLeavesPerMonth;
    rule.notes = data.notes ?? rule.notes;
    rule.updatedBy = user.id;
    rule.updatedAt = new Date();

    await rule.save();

    return NextResponse.json(rule);
  } catch (error) {
    console.error('PUT /api/leave-rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
