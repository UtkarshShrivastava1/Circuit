// app/api/auth/otp/generate/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/app/models/User';
import { generateOTP, hashOTP, calculateOTPExpiry } from '@/lib/otp';
import { sendEmail } from '@/lib/mailer';

export async function POST(req) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user account is active
    if (user.profileState !== 'active') {
      return NextResponse.json(
        { success: false, message: `Your account is ${user.profileState}. Contact support.` },
        { status: 403 }
      );
    }

    // Generate OTP
    const otp = generateOTP(6);
    const otpHash = await hashOTP(otp);
    const otpExpires = calculateOTPExpiry(10); // OTP expires in 10 minutes

    // Update user with OTP hash and expiry
    user.otpHash = otpHash;
    user.otpExpires = otpExpires;
    user.otpAttempts = 0;
    await user.save();

    // Send OTP via email
    await sendEmail({
      to: user.email,
      subject: 'Your Login OTP for Circuit',
      text: `Your OTP for login is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Your Login OTP</h2>
          <p>Hello ${user.name},</p>
          <p>Your one-time password (OTP) for login to Circuit is:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you did not request this OTP, please ignore this email or contact support.</p>
          <p>Thank you,<br>The Circuit Team</p>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}