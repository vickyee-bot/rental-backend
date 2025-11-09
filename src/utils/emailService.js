const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  console.log(`Sending email to ${to} with subject "${subject}"`);

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

const emailService = {
  async sendVerificationEmail(email, token, fullName) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipping email to ${email}`);
      return { success: true, skipped: true };
    }

    const subject = "Verify Your Email - FRENTAL";
    const html = `
      <h2>Hello ${fullName},</h2>
      <p>Your verification code is:</p>
      <h1 style="background:#0ea5e9;color:white;padding:10px;text-align:center;border-radius:8px;">
        ${token}
      </h1>
      <p>This code expires in 24 hours.</p>
    `;

    try {
      await sendEmail(email, subject, html);
      console.log("✅ Verification email sent successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Failed to send verification email:", err.message);
      return { success: false, error: err.message };
    }
  },

  async sendPasswordResetEmail(email, token, fullName) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipping password reset email to ${email}`);
      return { success: true, skipped: true };
    }

    const subject = "Reset Your Password - FRENTAL";
    const html = `
      <h2>Hello ${fullName},</h2>
      <p>Your password reset code is:</p>
      <h1 style="background:#dc2626;color:white;padding:10px;text-align:center;border-radius:8px;">
        ${token}
      </h1>
      <p>This code expires in 1 hour.</p>
    `;

    try {
      await sendEmail(email, subject, html);
      console.log("✅ Password reset email sent successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Failed to send password reset email:", err.message);
      return { success: false, error: err.message };
    }
  },

  async sendPasswordChangedEmail(email, fullName) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipping password changed email to ${email}`);
      return { success: true, skipped: true };
    }

    const subject = "Password Changed Successfully - FRENTAL";
    const html = `
      <h2>Hello ${fullName},</h2>
      <p>Your FRENTAL account password has been successfully changed.</p>
      <p>If you didn't make this change, please contact our support team immediately.</p>
    `;

    try {
      await sendEmail(email, subject, html);
      console.log("✅ Password changed email sent successfully");
      return { success: true };
    } catch (err) {
      console.error("❌ Failed to send password changed email:", err.message);
      return { success: false, error: err.message };
    }
  },
};

module.exports = emailService;
