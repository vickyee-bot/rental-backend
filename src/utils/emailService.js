const nodemailer = require("nodemailer");

console.log("📧 Email Service Configuration:");
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Must be 16-character App Password
  },
  // Add timeout settings
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    // Specific guidance based on error
    if (error.code === "EAUTH") {
      console.log("🔐 AUTH ERROR: Please check your Gmail App Password");
      console.log(
        "💡 Tip: Use 16-character App Password from Google Account settings"
      );
    }
  } else {
    console.log("✅ Gmail SMTP ready to send emails");
  }
});

// Helper for consistent templates
const buildTemplate = (title, content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0ea5e9; margin: 0;">FRENTAL</h1>
      <p style="color: #666; margin: 5px 0 0 0;">Property Management App</p>
    </div>
    <h2 style="color: #333; text-align: center;">${title}</h2>
    ${content}
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
      <p style="color: #888; font-size: 12px;">
        Need help? Contact: <a href="mailto:support@frental.com" style="color: #0ea5e9;">support@frental.com</a>
      </p>
      <p style="color: #888; font-size: 12px; margin-top: 5px;">
        &copy; ${new Date().getFullYear()} FRENTAL. All rights reserved.
      </p>
    </div>
  </div>
`;

const emailService = {
  async sendVerificationEmail(email, token, fullName, retryCount = 0) {
    // Development mode check
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`🎯 [DEV MODE] Verification email to: ${email}`);
      console.log(`🎯 [DEV MODE] Verification Code: ${token}`);
      return { success: true, skipped: true };
    }

    console.log(`📨 Sending verification email to: ${email}`);
    console.log(`🔑 Verification Code: ${token}`);

    const htmlContent = `
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Welcome to FRENTAL! Use the verification code below in your mobile app to complete your registration:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #0c8ac9); color: white; padding: 25px; border-radius: 12px; 
                    font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block;
                    box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);">
          ${token}
        </div>
      </div>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #666; text-align: center;">
          <strong>Instructions:</strong><br>
          1. Open your FRENTAL app<br>
          2. Enter this verification code<br>
          3. Complete your registration
        </p>
      </div>
      <p style="text-align: center; color: #555; font-size: 14px;">
        ⚠️ This code will expire in 24 hours.<br>
        If you didn't request this verification, please ignore this email.
      </p>
    `;

    const mailOptions = {
      from: `FRENTAL <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email - FRENTAL",
      html: buildTemplate("Email Verification Code", htmlContent),
    };

    try {
      console.log(`📤 Attempting to send (Attempt ${retryCount + 1})...`);
      const info = await transporter.sendMail(mailOptions);

      console.log("✅ Verification email sent successfully!", {
        to: email,
        messageId: info.messageId,
        response: info.response,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Email sending failed (Attempt ${retryCount + 1}):`, {
        error: error.message,
        code: error.code,
      });

      // Retry logic
      if (retryCount < 2) {
        console.log(`🔄 Retrying in 3 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return this.sendVerificationEmail(
          email,
          token,
          fullName,
          retryCount + 1
        );
      }

      return { success: false, error: error.message };
    }
  },

  async sendPasswordResetEmail(email, token, fullName, retryCount = 0) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`🎯 [DEV MODE] Password reset email to: ${email}`);
      console.log(`🎯 [DEV MODE] Reset Code: ${token}`);
      return { success: true, skipped: true };
    }

    console.log(`📨 Sending password reset email to: ${email}`);
    console.log(`🔑 Reset Code: ${token}`);

    const htmlContent = `
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Use the reset code below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
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
    `;

    const mailOptions = {
      from: `FRENTAL <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - FRENTAL",
      html: buildTemplate("Password Reset Code", htmlContent),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent successfully!");
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Password reset email failed:`, error.message);

      if (retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return this.sendPasswordResetEmail(
          email,
          token,
          fullName,
          retryCount + 1
        );
      }

      return { success: false, error: error.message };
    }
  },

  async sendPasswordChangedEmail(email, fullName, retryCount = 0) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`🎯 [DEV MODE] Password changed email to: ${email}`);
      return { success: true, skipped: true };
    }

    console.log(`📨 Sending password changed confirmation to: ${email}`);

    const htmlContent = `
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Your FRENTAL account password has been successfully changed.</p>
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center; margin: 25px 0;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          🔒 <strong>Security Alert:</strong> If you didn't make this change, please contact our support team immediately.
        </p>
      </div>
    `;

    const mailOptions = {
      from: `FRENTAL <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Changed Successfully - FRENTAL",
      html: buildTemplate("Password Changed Successfully", htmlContent),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password changed confirmation sent successfully!");
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Password changed email failed:`, error.message);

      if (retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return this.sendPasswordChangedEmail(email, fullName, retryCount + 1);
      }

      return { success: false, error: error.message };
    }
  },
};

module.exports = emailService;
