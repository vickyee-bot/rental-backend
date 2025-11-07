const nodemailer = require("nodemailer");

console.log("📧 Email Service Configuration:");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_FROM:", process.env.SMTP_FROM);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SKIP_EMAILS:", process.env.SKIP_EMAILS);

// Create transporter with optimized settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Optimized timeouts
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
  // Better TLS handling
  tls: {
    rejectUnauthorized: false,
    ciphers: "SSLv3",
  },
});

// Test connection
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ SMTP Connection Error:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    // Specific error guidance
    if (error.code === "EAUTH") {
      console.log("🔐 AUTH ERROR: Please check your Gmail App Password");
      console.log(
        "💡 Tip: Use 16-character App Password, not your regular password"
      );
    } else if (error.code === "ECONNECTION") {
      console.log(
        "🌐 CONNECTION ERROR: Check SMTP settings or try different port"
      );
    }
  } else {
    console.log("✅ SMTP Connection Successful - Ready to send emails");
  }
});

const emailService = {
  // Send verification email
  sendVerificationEmail: async (email, token, fullName, retryCount = 0) => {
    console.log(`📨 Sending verification email to: ${email}`);
    console.log(`🔑 Verification Code: ${token}`);

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verify Your Email - FRENTAL",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0ea5e9; margin: 0;">FRENTAL</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Property Management App</p>
        </div>
        
        <h2 style="color: #333; text-align: center;">Email Verification Code</h2>
        
        <p>Hello <strong>${fullName}</strong>,</p>
        
        <p>Welcome to FRENTAL! Use the verification code below in your mobile app:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: #0ea5e9; color: white; padding: 25px; border-radius: 12px; 
                      font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
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
        
        <p style="color: #666; text-align: center;">
          This code will expire in 24 hours.
        </p>
      </div>
      `,
    };

    try {
      console.log(`📤 Attempting to send email (Attempt ${retryCount + 1})...`);

      const info = await transporter.sendMail(mailOptions);

      console.log("✅ Email sent successfully!", {
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
        return emailService.sendVerificationEmail(
          email,
          token,
          fullName,
          retryCount + 1
        );
      }

      return { success: false, error: error.message };
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email, token, fullName, retryCount = 0) => {
    console.log(`📨 Sending password reset email to: ${email}`);
    console.log(`🔑 Reset Code: ${token}`);

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
          This code will expire in 1 hour.
        </p>
      </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent successfully!");
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Password reset email failed:`, error.message);

      if (retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return emailService.sendPasswordResetEmail(
          email,
          token,
          fullName,
          retryCount + 1
        );
      }

      return { success: false, error: error.message };
    }
  },

  // Send password changed confirmation
  sendPasswordChangedEmail: async (email, fullName, retryCount = 0) => {
    console.log(`📨 Sending password changed confirmation to: ${email}`);

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Password Changed Successfully - FRENTAL",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0ea5e9; margin: 0;">FRENTAL</h1>
        </div>
        
        <h2 style="color: #16a34a; text-align: center;">✅ Password Changed Successfully</h2>
        
        <p>Hello <strong>${fullName}</strong>,</p>
        
        <p>Your FRENTAL account password has been successfully changed.</p>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #166534;">
            <strong>Security Alert:</strong> If you didn't make this change, please contact support.
          </p>
        </div>
      </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Password changed confirmation sent successfully!");
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Password changed email failed:`, error.message);

      if (retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return emailService.sendPasswordChangedEmail(
          email,
          fullName,
          retryCount + 1
        );
      }

      return { success: false, error: error.message };
    }
  },
};

module.exports = emailService;
