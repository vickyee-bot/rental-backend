const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const emailService = {
  // Send verification email
  sendVerificationEmail: async (email, token, fullName) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"FRENTAL" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Verify Your Email - FRENTAL",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Welcome to FRENTAL!</h2>
          <p>Hello ${fullName},</p>
          <p>Thank you for registering with FRENTAL. Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0ea5e9; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <br>
          <p>Best regards,<br>The FRENTAL Team</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, error: error.message };
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email, token, fullName) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"FRENTAL" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Reset Your Password - FRENTAL",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Password Reset Request</h2>
          <p>Hello ${fullName},</p>
          <p>We received a request to reset your password for your FRENTAL account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #0ea5e9; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br>The FRENTAL Team</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, error: error.message };
    }
  },

  // Send password changed confirmation
  sendPasswordChangedEmail: async (email, fullName) => {
    const mailOptions = {
      from: `"FRENTAL" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Password Changed - FRENTAL",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Password Changed Successfully</h2>
          <p>Hello ${fullName},</p>
          <p>Your FRENTAL account password has been successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <br>
          <p>Best regards,<br>The FRENTAL Team</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, error: error.message };
    }
  },
};

module.exports = emailService;
