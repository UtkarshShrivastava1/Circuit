// scripts/test-send-email.mjs
import transporter from "../lib/mailer.js";

async function run() {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER, // MUST match SMTP auth user for many providers
      to: process.env.SMTP_USER, // send to yourself for testing
      subject: "Test SMTP delivery",
      text: `Test message at ${new Date().toISOString()}`,
      html: `<p>Test message at <strong>${new Date().toISOString()}</strong></p>`,
    });

    console.log("sendMail info:", {
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      messageId: info.messageId,
      envelope: info.envelope,
    });

    // nodemailer.getTestMessageUrl(info) works only for Ethereal
    if (info && info.response) console.log("SMTP response:", info.response);
  } catch (err) {
    console.error("sendMail error:", err && err.stack ? err.stack : err);
  } finally {
    process.exit(0);
  }
}

run();
