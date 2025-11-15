// src/utils/emailService.js
const sibApiV3Sdk = require("@getbrevo/brevo");
const nodemailer = require("nodemailer");

// Check environment
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

// Initialize Brevo client
const brevoClient = new sibApiV3Sdk.TransactionalEmailsApi();
brevoClient.apiClient.authentications["apiKey"].apiKey =
  process.env.BREVO_API_KEY;

// Fallback SMTP transporter
const createFallbackTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

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

const sendEmailWithFallback = async (to, subject, html) => {
  const transporter = createFallbackTransporter();
  if (!transporter) {
    console.error("❌ Fallback SMTP not configured");
    return {
      success: false,
      provider: "none",
      error: "No fallback SMTP available",
    };
  }

  try {
    await transporter.verify();
    const result = await transporter.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME || "FRENTAL"}" <${
        process.env.EMAIL_USER
      }>`,
      to,
      subject,
      html,
    });

    console.log("✅ Fallback SMTP sent successfully", {
      to,
      messageId: result.messageId,
    });
    return {
      success: true,
      provider: "nodemailer",
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("❌ Fallback SMTP failed", { error: error.message });
    return { success: false, provider: "nodemailer", error: error.message };
  }
};

const sendEmailWithBrevo = async (to, subject, html) => {
  if (process.env.SKIP_EMAILS === "true") {
    console.log(`[DEV MODE] Skipping email to ${to}`);
    return { success: true, skipped: true, provider: "brevo" };
  }

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
    console.log("❌ Brevo not configured, falling back to SMTP");
    return await sendEmailWithFallback(to, subject, html);
  }

  try {
    const sendSmtpEmail = new sibApiV3Sdk.SendSmtpEmail({
      to: [{ email: to }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "FRENTAL",
      },
      subject,
      htmlContent: html,
    });

    const data = await brevoClient.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Brevo sent successfully", { uuid: data?.uuid, to });

    return { success: true, provider: "brevo", messageId: data?.uuid || null };
  } catch (error) {
    console.error("❌ Brevo failed", {
      error: error.message,
      status: error.response?.status,
    });
    return await sendEmailWithFallback(to, subject, html);
  }
};

// Core email functions
const emailService = {
  sendVerificationEmail: async (email, token, fullName) => {
    const subject = "Verify Your Email - FRENTAL";
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hello ${fullName},</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; background: #0ea5e9; color: white; padding: 20px; text-align:center;">${token}</div>
        <p>This code expires in 24 hours.</p>
      </div>
    `;
    return await sendEmailWithBrevo(email, subject, html);
  },

  sendPasswordResetEmail: async (email, token, fullName) => {
    const subject = "Reset Your Password - FRENTAL";
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hello ${fullName},</h2>
        <p>Your password reset code is:</p>
        <div style="font-size: 32px; font-weight: bold; background: #dc2626; color: white; padding: 20px; text-align:center;">${token}</div>
        <p>This code expires in 1 hour.</p>
      </div>
    `;
    return await sendEmailWithBrevo(email, subject, html);
  },

  sendPasswordChangedEmail: async (email, fullName) => {
    const subject = "Password Changed Successfully - FRENTAL";
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hello ${fullName},</h2>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, contact support immediately.</p>
      </div>
    `;
    return await sendEmailWithBrevo(email, subject, html);
  },
};

module.exports = emailService;
