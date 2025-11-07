const nodemailer = require("nodemailer");

console.log("Email Service Configuration:");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_FROM:", process.env.SMTP_FROM);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SKIP_EMAILS:", process.env.SKIP_EMAILS);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper function for consistent email templates
const buildTemplate = (title, content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0ea5e9; margin: 0;">FRENTAL</h1>
      <p style="color: #666; margin: 5px 0 0 0;">Property Management App</p>
    </div>
    <h2 style="color: #333; text-align: center;">${title}</h2>
    ${content}
    <p style="color: #888; text-align: center; margin-top: 40px; font-size: 12px;">
      &copy; ${new Date().getFullYear()} FRENTAL. All rights reserved.
    </p>
  </div>
`;

const emailService = {
  async sendVerificationEmail(email, token, fullName, retryCount = 0) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`Email sending skipped for: ${email}`);
      return { success: true, skipped: true };
    }

    console.log(`Sending verification email to: ${email}`);
    const htmlContent = `
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Welcome to FRENTAL! Use the verification code below to verify your email address:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="background: #0ea5e9; color: white; padding: 20px; border-radius: 10px; 
                    font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
          ${token}
        </div>
      </div>
      <p style="text-align: center; color: #555;">This code will expire in 24 hours.</p>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verify Your Email - FRENTAL",
      html: buildTemplate("Email Verification Code", htmlContent),
    };

    try {
      console.log(
        `Attempting to send verification email (Attempt ${retryCount + 1})`
      );
      const info = await transporter.sendMail(mailOptions);

      console.log("Verification email sent successfully:", {
        to: email,
        messageId: info.messageId,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        `Email sending failed (Attempt ${retryCount + 1}):`,
        error.message
      );

      if (retryCount < 2) {
        console.log("Retrying in 3 seconds...");
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
      console.log(`Email sending skipped for: ${email}`);
      return { success: true, skipped: true };
    }

    console.log(`Sending password reset email to: ${email}`);
    const htmlContent = `
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Use the reset code below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 10px; 
                    font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
          ${token}
        </div>
      </div>
      <p style="text-align: center; color: #555;">This code will expire in 1 hour.</p>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Reset Your Password - FRENTAL",
      html: buildTemplate("Password Reset Code", htmlContent),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Password reset email sent successfully.");
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Password reset email failed:`, error.message);

      if (retryCount < 2) {
        console.log("Retrying in 3 seconds...");
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
      console.log(`Email sending skipped for: ${email}`);
      return { success: true, skipped: true };
    }

    console.log(`Sending password changed confirmation to: ${email}`);
    const htmlContent = `
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Your FRENTAL account password has been changed successfully.</p>
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #166534;">
          <strong>Security Alert:</strong> If you did not make this change, please contact support immediately.
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Password Changed Successfully - FRENTAL",
      html: buildTemplate("Password Changed Confirmation", htmlContent),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Password changed confirmation sent successfully.");
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Password changed email failed:`, error.message);

      if (retryCount < 2) {
        console.log("Retrying in 3 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return this.sendPasswordChangedEmail(email, fullName, retryCount + 1);
      }

      return { success: false, error: error.message };
    }
  },
};

module.exports = emailService;
