const nodemailer = require("nodemailer");

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

const emailService = {
  async sendVerificationEmail(email, token, fullName) {
    if (process.env.SKIP_EMAILS === "true") {
      console.log(`[DEV MODE] Skipping email to ${email}`);
      return { success: true, skipped: true };
    }

    const html = `
      <h2>Hello ${fullName},</h2>
      <p>Your verification code is:</p>
      <h1 style="background:#0ea5e9;color:white;padding:10px;text-align:center;border-radius:8px;">
        ${token}
      </h1>
      <p>This code expires in 24 hours.</p>
    `;

    const mailOptions = {
      from: `FRENTAL <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email - FRENTAL",
      html,
    };

    const transporter = createTransporter();

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent:", info.messageId);
      return { success: true };
    } catch (err) {
      console.error("❌ Failed to send email:", err.message);
      return { success: false, error: err.message };
    }
  },
};

module.exports = emailService;
