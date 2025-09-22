import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/app/models/User';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { setSession, getSession, deleteSession } from '@/lib/session';

// LOGIN HANDLER
export async function POST(req) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    // 1. Admin Login
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      let adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });
      if (!adminUser) {
        adminUser = await User.create({
          email: process.env.ADMIN_EMAIL,
          name: 'Admin User',
          role: 'admin',
          profileState: 'active',
          password: await bcrypt.hash('dummy-password', 10),
          gender: 'other',
          phoneNumber: '0000000000',
          dateOfBirth: '1990-01-01',
          profileImgUrl: '/user.png',
        });
      }

      const adminSession = {
        _id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        profileState: adminUser.profileState,
        profileImgUrl: adminUser.profileImgUrl,
      };

      await setSession(adminSession);

      const token = signToken({
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role,
      });

      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      return NextResponse.json({
        success: true,
        token,
        role: 'admin',
        user: adminSession,
      });
    }

    // 2. Regular User Login
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    if (user.profileState !== 'active') {
      return NextResponse.json(
        { success: false, message: `Your account is ${user.profileState}. Contact support.` },
        { status: 403 }
      );
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    const userSession = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileState: user.profileState,
      profileImgUrl: user.profileImgUrl,
    };

    await setSession(userSession);

    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      token,
      role: user.role,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        profileImgUrl: user.profileImgUrl,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// GET SESSION HANDLER
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    _id: session._id,
    name: session.name,
    email: session.email,
    role: session.role,
    profileState: session.profileState,
    profileImgUrl: session.profileImgUrl,
  });
}

// LOGOUT HANDLER
export async function DELETE() {
  await deleteSession();
  cookies().set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return NextResponse.json({ message: 'Logged out' });
}
