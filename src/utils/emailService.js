// emailService.js
const brevo = require("@getbrevo/brevo");
const nodemailer = require("nodemailer");

// ---------------------------
// Environment Check Logs
// ---------------------------
console.log("📧 Email Configuration Check:");
console.log(
  "BREVO_API_KEY:",
  process.env.BREVO_API_KEY ? "*** Set ***" : "❌ Missing"
);
console.log(
  "BREVO_SENDER_EMAIL:",
  process.env.BREVO_SENDER_EMAIL || "❌ Missing"
);
console.log(
  "BREVO_SENDER_NAME:",
  process.env.BREVO_SENDER_NAME || "❌ Missing"
);
console.log(
  "EMAIL_USER:",
  process.env.EMAIL_USER ? "*** Set ***" : "❌ Missing"
);
console.log(
  "EMAIL_PASS:",
  process.env.EMAIL_PASS ? "*** Set ***" : "❌ Missing"
);
console.log("SKIP_EMAILS:", process.env.SKIP_EMAILS);

// ---------------------------
// Brevo Client Setup - CORRECT WAY
// ---------------------------
let apiInstance = new brevo.TransactionalEmailsApi();
let apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// ---------------------------
// Fallback Transporter
// ---------------------------
const createFallbackTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("❌ No fallback SMTP credentials");
    return null;
  }

  console.log("✅ Fallback SMTP available");
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

// ---------------------------
// Email Sending Functions
// ---------------------------
const sendEmailWithBrevo = async (to, subject, html) => {
  try {
    // Check if we should skip emails
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipped email to ${to}`);
      return { success: true, skipped: true, provider: "brevo" };
    }

    // Validate Brevo configuration
    if (!process.env.BREVO_API_KEY) {
      console.log("⚠️ Brevo API key missing, switching to fallback");
      return await sendEmailWithFallback(to, subject, html);
    }

    if (!process.env.BREVO_SENDER_EMAIL) {
      console.log("⚠️ Brevo sender email missing, switching to fallback");
      return await sendEmailWithFallback(to, subject, html);
    }

    console.log(`📨 Sending via Brevo → ${to}`);
    console.log(`📝 Subject: "${subject}"`);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "FRENTAL",
      email: process.env.BREVO_SENDER_EMAIL,
    };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("✅ Brevo → Email sent successfully", {
      messageId: response.messageId,
      to: to,
    });

    return {
      success: true,
      messageId: response.messageId,
      provider: "brevo",
    };
  } catch (error) {
    console.error("❌ Brevo API Error:", {
      message: error.message,
      statusCode: error.code,
      response: error.response?.body,
    });

    // Fallback to SMTP
    console.log("🔄 Falling back to SMTP...");
    return await sendEmailWithFallback(to, subject, html);
  }
};

const sendEmailWithFallback = async (to, subject, html) => {
  console.log("🔄 Attempting fallback SMTP...");

  const transporter = createFallbackTransporter();
  if (!transporter) {
    console.error("❌ No fallback email configuration available");
    return {
      success: false,
      provider: "none",
      error: "No email provider configured",
    };
  }

  try {
    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const mailOptions = {
      from: `"${process.env.BREVO_SENDER_NAME || "FRENTAL"}" <${
        process.env.EMAIL_USER
      }>`,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log("✅ Fallback SMTP → Email sent successfully", {
      messageId: result.messageId,
      to: to,
    });

    return {
      success: true,
      messageId: result.messageId,
      provider: "nodemailer",
    };
  } catch (error) {
    console.error("❌ Fallback SMTP failed:", {
      error: error.message,
      code: error.code,
    });

    return {
      success: false,
      provider: "nodemailer",
      error: error.message,
    };
  }
};

// ---------------------------
// Enhanced Email Templates
// ---------------------------
const emailService = {
  async sendVerificationEmail(email, token, fullName) {
    const subject = "Verify Your Email - FRENTAL";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - FRENTAL</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">FRENTAL</h1>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Property Management</p>
        </div>
        
        <h2 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 20px;">Verify Your Email</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">Welcome to FRENTAL! Use the verification code below to complete your registration:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: linear-gradient(135deg, #0ea5e9, #0c8ac9); color: white; padding: 25px; border-radius: 12px; 
                      font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block;
                      border: 3px solid #0c8ac9; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
            ${token}
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0ea5e9;">
          <p style="margin: 0; color: #666; text-align: center; font-size: 14px;">
            <strong>Instructions:</strong><br>
            1. Open your FRENTAL app<br>
            2. Enter this verification code<br>
            3. Complete your registration
          </p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border: 1px solid #ffeaa7; margin: 20px 0;">
          <p style="margin: 0; color: #856404; text-align: center; font-size: 14px;">
            ⚠️ <strong>This code expires in 24 hours.</strong><br>
            If you didn't request this, please ignore this email.
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
        
        <h2 style="color: #333; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Reset</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">You requested to reset your password. Use the code below:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; border-radius: 10px; 
                      font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;
                      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
            ${token}
          </div>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 20px 0;">
          <p style="margin: 0; color: #dc2626; text-align: center; font-size: 14px;">
            ⚠️ <strong>This code expires in 1 hour.</strong><br>
            If you didn't request this, please secure your account.
          </p>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithBrevo(email, subject, html);
  },

  async sendPasswordChangedEmail(email, fullName) {
    const subject = "Password Changed - FRENTAL";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Updated - FRENTAL</title>
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
        
        <h2 style="color: #16a34a; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Updated</h2>
        
        <p style="font-size: 16px;">Hello <strong style="color: #0ea5e9;">${fullName}</strong>,</p>
        
        <p style="font-size: 16px;">Your FRENTAL password has been changed successfully.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center; margin: 25px 0;">
          <p style="margin: 0; color: #166534; font-size: 14px;">
            🔒 <strong>Security Note:</strong> If you didn't make this change, contact support immediately.
          </p>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithBrevo(email, subject, html);
  },

  // Test method for debugging
  async testEmailService(email) {
    console.log("🧪 Testing email service...");
    return await this.sendVerificationEmail(email, "999999", "Test User");
  },
};

module.exports = emailService;
