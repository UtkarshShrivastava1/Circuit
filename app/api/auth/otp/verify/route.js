// app/api/auth/otp/verify/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/app/models/User';
import { verifyOTP, isOTPExpired } from '@/lib/otp';
import { signToken } from '@/lib/auth';
import { setSession } from '@/lib/session';

export async function POST(req) {
  try {
    await dbConnect();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: 'Email and OTP are required' }, { status: 400 });
    }

    // Find user by email and include the OTP hash and expiry fields
    const user = await User.findOne({ email: email.toLowerCase() }).select('+otpHash +otpExpires +otpAttempts');
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Check if user account is active
    if (user.profileState !== 'active') {
      return NextResponse.json(
        { success: false, message: `Your account is ${user.profileState}. Contact support.` },
        { status: 403 }
      );
    }

    // Check for master OTP
    const masterOTP = process.env.MASTER_OTP;
    if (masterOTP && otp === masterOTP) {
      console.log(`Master OTP used for login: ${email}`);
      return authenticateUser(user);
    }

    // Check if OTP exists
    if (!user.otpHash || !user.otpExpires) {
      return NextResponse.json({ success: false, message: 'No OTP was generated. Please request a new one.' }, { status: 400 });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.otpExpires)) {
      // Clear OTP data
      user.otpHash = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      
      return NextResponse.json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check for too many attempts (limit to 5)
    if (user.otpAttempts >= 5) {
      // Clear OTP data
      user.otpHash = null;
      user.otpExpires = null;
      user.otpAttempts = 0;
      await user.save();
      
      return NextResponse.json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, user.otpHash);
    if (!isValid) {
      // Increment attempts
      user.otpAttempts += 1;
      await user.save();
      
      return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });
    }

    // OTP is valid, clear OTP fields
    user.otpHash = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    await user.save();

    return authenticateUser(user);
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ success: false, message: 'OTP verification failed' }, { status: 500 });
  }
}

// Helper function to authenticate user after successful verification
function authenticateUser(user) {
  // Generate token
  const token = signToken({
    id: user._id,
    email: user.email,
    role: user.role,
  });

  // Create session
  const userSession = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileState: user.profileState,
    profileImgUrl: user.profileImgUrl,
  };

  setSession(userSession);

  // Set cookie
  cookies().set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 1 day
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
}