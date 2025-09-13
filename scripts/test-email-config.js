// scripts/test-email-config.js
import { sendEmail } from '../lib/mailer.js';

async function testEmailConfig() {
  console.log('Testing email configuration...');
  
  try {
    // Send a test email to the same address
    const result = await sendEmail({
      to: process.env.EMAIL_USER,
      subject: 'Test Email Configuration',
      text: `This is a test email sent at ${new Date().toISOString()}`,
      html: `<p>This is a test email sent at <strong>${new Date().toISOString()}</strong></p>`,
    });
    
    console.log('Email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('Response:', result.response);
  } catch (error) {
    console.error('Failed to send email:');
    console.error(error);
    
    if (error.code === 'EAUTH') {
      console.log('\nAuthentication Error: Your Gmail account rejected the login attempt.');
      console.log('\nPossible solutions:');
      console.log('1. Make sure you\'re using an App Password, not your regular Gmail password');
      console.log('2. Generate a new App Password in your Google Account:');
      console.log('   - Go to https://myaccount.google.com/apppasswords');
      console.log('   - Select "Mail" as the app and your device');
      console.log('   - Copy the generated 16-character password (no spaces)');
      console.log('   - Update EMAIL_PASSWORD in your .env file');
      console.log('3. Make sure 2-Step Verification is enabled on your Google account');
      console.log('4. Check if "Less secure app access" is turned off (it should be)');
    }
  } finally {
    process.exit(0);
  }
}

testEmailConfig();