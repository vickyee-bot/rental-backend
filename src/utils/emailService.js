const nodemailer = require("nodemailer");

console.log("📧 Gmail SMTP configuration check:");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_FROM:", process.env.SMTP_FROM);

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test the transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Gmail configuration error:", error);
  } else {
    console.log("✅ Gmail SMTP is ready to send emails");
  }
});

const emailService = {
  // Send verification email
  sendVerificationEmail: async (email, token, fullName) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    console.log("📨 Attempting to send verification email to:", email);
    console.log("📎 Verification URL:", verificationUrl);

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verify Your Email - FRENTAL",
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0ea5e9; margin: 0;">FRENTAL</h1>
      <p style="color: #666; margin: 5px 0 0 0;">Property Management</p>
    </div>
    
    <h2 style="color: #333; text-align: center;">Email Verification Code</h2>
    
    <p>Hello <strong>${fullName}</strong>,</p>
    
    <p>Use the verification code below to verify your email address:</p>
    
    <div style="text-align: center; margin: 40px 0;">
      <div style="background: #0ea5e9; color: white; padding: 20px; border-radius: 10px; 
                  font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
        ${token}
      </div>
    </div>
    
    <p style="color: #666; text-align: center;">
      This code will expire in 24 hours.<br>
      If you didn't request this, please ignore this email.
    </p>
  </div>
`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Verification email sent successfully to:", email);
      console.log("📤 Message ID:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Failed to send verification email to:", email);
      console.error("Error details:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email, token, fullName) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    console.log("📨 Attempting to send password reset email to:", email);

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Reset Your Password - FRENTAL",
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0ea5e9; margin: 0;">FRENTAL</h1>
    </div>
    
    <h2 style="color: #333; text-align: center;">Password Reset Code</h2>
    
    <p>Hello <strong>${fullName}</strong>,</p>
    
    <p>Use the reset code below to reset your password:</p>
    
    <div style="text-align: center; margin: 40px 0;">
      <div style="background: #dc2626; color: white; padding: 20px; border-radius: 10px; 
                  font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
        ${token}
      </div>
    </div>
    
    <p style="color: #666; text-align: center;">
      This code will expire in 1 hour.<br>
      If you didn't request this, please ignore this email.
    </p>
  </div>
`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent successfully to:", email);
      console.log("📤 Message ID:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Failed to send password reset email to:", email);
      console.error("Error details:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Send password changed confirmation
  sendPasswordChangedEmail: async (email, fullName) => {
    console.log("📨 Attempting to send password changed email to:", email);

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Password Changed Successfully - FRENTAL",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0ea5e9; margin: 0;">FRENTAL</h1>
          </div>
          
          <h2 style="color: #16a34a; text-align: center;">✅ Password Changed Successfully</h2>
          
          <p>Hello <strong>${fullName}</strong>,</p>
          
          <p>Your FRENTAL account password has been successfully changed.</p>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center;">
            <p style="margin: 0; color: #166534;">
              <strong>Security Alert:</strong> If you didn't make this change, please contact our support team immediately.
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <p>Need help? <a href="mailto:support@frental.com" style="color: #0ea5e9;">Contact Support</a></p>
          </div>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password changed email sent successfully to:", email);
      console.log("📤 Message ID:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Failed to send password changed email to:", email);
      console.error("Error details:", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = emailService;
