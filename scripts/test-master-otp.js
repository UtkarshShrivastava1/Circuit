// scripts/test-master-otp.js

/**
 * This script tests the master OTP functionality by making a direct API call
 * to the OTP verification endpoint with the master OTP.
 */

const fetch = require('node-fetch');
require('dotenv').config();

async function testMasterOTP() {
  const email = process.argv[2] || 'test@example.com';
  const masterOTP = process.env.MASTER_OTP;
  
  if (!masterOTP) {
    console.error('MASTER_OTP not found in environment variables');
    process.exit(1);
  }

  console.log(`Testing master OTP login for email: ${email}`);
  console.log(`Using master OTP: ${masterOTP}`);

  try {
    const response = await fetch('http://localhost:3000/api/auth/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        otp: masterOTP,
      }),
    });

    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Master OTP login successful!');
    } else {
      console.log('❌ Master OTP login failed:', data.message);
    }
  } catch (error) {
    console.error('Error testing master OTP:', error);
  }
}

testMasterOTP();