const sibApiV3Sdk = require("@getbrevo/brevo");
const nodemailer = require("nodemailer");

// Debug environment variables
console.log("📧 Brevo Configuration Check:");
console.log(
  "BREVO_API_KEY:",
  process.env.BREVO_API_KEY ? "*** Set ***" : "❌ Missing"
);
console.log(
  "BREVO_SENDER_EMAIL:",
  process.env.BREVO_SENDER_EMAIL || "❌ Missing"
);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SKIP_EMAILS:", process.env.SKIP_EMAILS);

// Initialize Brevo API client
let apiInstance = new sibApiV3Sdk.TransactionalEmailsApi();
let apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Fallback transporter (Gmail)
const createFallbackTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

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

const sendEmailWithBrevo = async (to, subject, html, text = null) => {
  if (process.env.SKIP_EMAILS === "true") {
    console.log(`[DEV MODE] Skipping email to ${to}`);
    return { success: true, skipped: true, provider: "brevo" };
  }

  try {
    console.log(`📨 Sending Brevo email to: ${to}`);
    console.log(`📝 Subject: "${subject}"`);

    const sendSmtpEmail = new sibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "FRENTAL",
      email: process.env.BREVO_SENDER_EMAIL,
    };
    sendSmtpEmail.to = [{ email: to }];

    if (text) {
      sendSmtpEmail.textContent = text;
    }

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("✅ Brevo email sent successfully:", {
      messageId: data.messageId,
      to: to,
      provider: "brevo",
    });

    return {
      success: true,
      messageId: data.messageId,
      provider: "brevo",
    };
  } catch (error) {
    console.error("❌ Brevo email failed:", {
      error: error.message,
      statusCode: error.code,
      to: to,
    });

    // Fallback to nodemailer
    console.log("🔄 Attempting fallback to nodemailer...");
    return await sendEmailWithFallback(to, subject, html);
  }
};

const sendEmailWithFallback = async (to, subject, html) => {
  const transporter = createFallbackTransporter();

  if (!transporter) {
    return {
      success: false,
      error: "No fallback email configuration available",
      provider: "none",
    };
  }

  try {
    console.log(`📨 Sending fallback email to: ${to}`);

    await transporter.verify();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Fallback email sent successfully:", {
      messageId: result.messageId,
      to: to,
      provider: "nodemailer",
    });

    return {
      success: true,
      messageId: result.messageId,
      provider: "nodemailer",
    };
  } catch (fallbackError) {
    console.error("❌ Fallback email also failed:", fallbackError.message);
    return {
      success: false,
      error: fallbackError.message,
      provider: "nodemailer",
    };
  }
};

const emailService = {
  async sendVerificationEmail(email, token, fullName) {
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
          <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Property Management App</p>
        </div>
        
        <h2 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 20px;">Email Verification Code</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">Welcome to FRENTAL! Use the verification code below in your mobile app to complete your registration:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: linear-gradient(135deg, #0ea5e9, #0c8ac9); color: white; padding: 25px; border-radius: 12px; 
                      font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block;
                      border: 3px solid #0c8ac9; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
            ${token}
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0ea5e9;">
          <p style="margin: 0; color: #666; text-align: center; font-size: 14px;">
            <strong style="color: #0ea5e9;">Instructions:</strong><br>
            1. Open your FRENTAL app<br>
            2. Enter this verification code<br>
            3. Complete your registration
          </p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border: 1px solid #ffeaa7; margin: 20px 0;">
          <p style="margin: 0; color: #856404; text-align: center; font-size: 14px;">
            ⚠️ <strong>This code will expire in 24 hours.</strong><br>
            If you didn't request this verification, please ignore this email.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            Need help? Contact our support team at 
            <a href="mailto:support@frental.com" style="color: #0ea5e9; text-decoration: none;">support@frental.com</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 5px;">
            &copy; 2024 FRENTAL. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithBrevo(email, subject, html);
  },

  async sendPasswordResetEmail(email, token, fullName) {
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
        
        <p style="font-size: 16px;">You requested to reset your password. Use the reset code below:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; border-radius: 10px; 
                      font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;
                      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
            ${token}
          </div>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 20px 0;">
          <p style="margin: 0; color: #dc2626; text-align: center; font-size: 14px;">
            ⚠️ <strong>This code will expire in 1 hour.</strong><br>
            If you didn't request this reset, please secure your account immediately.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            Need help? Contact: 
            <a href="mailto:support@frental.com" style="color: #0ea5e9; text-decoration: none;">support@frental.com</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithBrevo(email, subject, html);
  },

  async sendPasswordChangedEmail(email, fullName) {
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
        
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="background: #16a34a; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">
            ✓
          </div>
        </div>
        
        <h2 style="color: #16a34a; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Changed Successfully</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">Your FRENTAL account password has been successfully changed.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center; margin: 25px 0;">
          <p style="margin: 0; color: #166534; font-size: 14px;">
            🔒 <strong>Security Alert:</strong> If you didn't make this change, please contact our support team immediately.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #666; font-size: 14px;">
            Need help? <a href="mailto:support@frental.com" style="color: #0ea5e9; text-decoration: none;">Contact Support</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithBrevo(email, subject, html);
  },
};

module.exports = emailService;
