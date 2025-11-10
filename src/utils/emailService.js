const nodemailer = require("nodemailer");

// Debug environment variables
console.log("📧 Email Configuration Check:");
console.log(
  "EMAIL_USER:",
  process.env.EMAIL_USER ? "*** Set ***" : "❌ Missing"
);
console.log(
  "EMAIL_PASS:",
  process.env.EMAIL_PASS ? "*** Set ***" : "❌ Missing"
);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SKIP_EMAILS:", process.env.SKIP_EMAILS);

const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async (to, subject, html) => {
  console.log(`📨 Attempting to send email to: ${to}`);
  console.log(`📝 Subject: "${subject}"`);

  try {
    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", {
      messageId: result.messageId,
      to: to,
      response: result.response,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", {
      error: error.message,
      code: error.code,
      to: to,
    });
    return { success: false, error: error.message };
  }
};

const emailService = {
  async sendVerificationEmail(email, token, fullName) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipping verification email to ${email}`);
      return { success: true, skipped: true };
    }

    const subject = "Verify Your Email - FRENTAL";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - FRENTAL</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">FRENTAL</h1>
        </div>
        
        <h2 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 20px;">Email Verification Code</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">Your verification code is:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: #0ea5e9; color: white; padding: 25px; border-radius: 12px; 
                      font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
            ${token}
          </div>
        </div>
        
        <p style="text-align: center; color: #666; font-size: 14px;">
          This code expires in 24 hours.
        </p>
      </body>
      </html>
    `;

    return await sendEmail(email, subject, html);
  },

  async sendPasswordResetEmail(email, token, fullName) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipping password reset email to ${email}`);
      return { success: true, skipped: true };
    }

    const subject = "Reset Your Password - FRENTAL";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - FRENTAL</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">FRENTAL</h1>
        </div>
        
        <h2 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Reset Code</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">Your password reset code is:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 10px; 
                      font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
            ${token}
          </div>
        </div>
        
        <p style="text-align: center; color: #666; font-size: 14px;">
          This code expires in 1 hour.
        </p>
      </body>
      </html>
    `;

    return await sendEmail(email, subject, html);
  },

  async sendPasswordChangedEmail(email, fullName) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipping password changed email to ${email}`);
      return { success: true, skipped: true };
    }

    const subject = "Password Changed Successfully - FRENTAL";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed - FRENTAL</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">FRENTAL</h1>
        </div>
        
        <h2 style="color: #16a34a; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Changed Successfully</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">Your FRENTAL account password has been successfully changed.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center; margin: 25px 0;">
          <p style="margin: 0; color: #166534; font-size: 14px;">
            🔒 If you didn't make this change, please contact our support team immediately.
          </p>
        </div>
      </body>
      </html>
    `;

    return await sendEmail(email, subject, html);
  },
};

module.exports = emailService;
