const nodemailer = require("nodemailer");

console.log("📧 Email Service Configuration:");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_FROM:", process.env.SMTP_FROM);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SKIP_EMAILS:", process.env.SKIP_EMAILS);

// ⚡ FASTER Transporter Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // ⚡ CRITICAL: Much faster timeouts for Render.com
  connectionTimeout: 10000, // 10 seconds (was 30000)
  greetingTimeout: 10000, // 10 seconds (was 30000)
  socketTimeout: 10000, // 10 seconds (was 30000)
  // Better handling for Render.com network issues
  tls: {
    rejectUnauthorized: false,
  },
});

// Test the transporter configuration with timeout
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Gmail configuration error:", error.message);
  } else {
    console.log("✅ Gmail SMTP is ready to send emails");
  }
});

const emailService = {
  // 🚀 Send verification email with OPTIMIZED timeouts
  sendVerificationEmail: async (email, token, fullName, retryCount = 0) => {
    // 🎯 DEVELOPMENT MODE: Skip real email sending for instant responses
    if (
      process.env.NODE_ENV === "development" ||
      process.env.SKIP_EMAILS === "true"
    ) {
      console.log(`📧 [DEV MODE] Verification email to: ${email}`);
      console.log(`📧 [DEV MODE] Verification Code: ${token}`);
      console.log(`📧 [DEV MODE] Email would be sent to: ${fullName}`);
      return { success: true, messageId: "dev-mode-skipped" };
    }

    console.log(
      `📨 Attempting to send verification email to: ${email} (Attempt ${
        retryCount + 1
      })`
    );
    console.log("📱 Mobile App - Verification Code:", token);

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
        
        <p>Welcome to FRENTAL! Use the verification code below in your mobile app to complete your registration:</p>
        
        <div style="text-align: center; margin: 40px 0;">
          <div style="background: #0ea5e9; color: white; padding: 25px; border-radius: 12px; 
                      font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block;
                      border: 3px solid #0c8ac9; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
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
        
        <p style="color: #666; text-align: center; font-size: 14px;">
          This code will expire in 24 hours.<br>
          If you didn't request this verification, please ignore this email.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            Need help? Contact: support@frental.com
          </p>
        </div>
      </div>
    `,
    };

    try {
      const emailPromise = transporter.sendMail(mailOptions);
      // ⚡ FASTER TIMEOUT: 10 seconds instead of 30
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Email sending timeout after 10 seconds")),
          10000
        );
      });

      const info = await Promise.race([emailPromise, timeoutPromise]);
      console.log("✅ Verification email sent successfully to:", email);
      console.log("📤 Message ID:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        `❌ Failed to send verification email to ${email} (Attempt ${
          retryCount + 1
        }):`,
        error.message
      );

      // ⚡ OPTIMIZED RETRY: Only 1 retry with shorter delay
      if (retryCount < 1) {
        console.log(`🔄 Retrying email send to ${email} in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds instead of 5
        return emailService.sendVerificationEmail(
          email,
          token,
          fullName,
          retryCount + 1
        );
      } else {
        console.error(`💥 All retry attempts failed for ${email}`);
        return {
          success: false,
          error: error.message,
          retriesAttempted: retryCount + 1,
        };
      }
    }
  },

  // 🚀 Send password reset email with OPTIMIZED timeouts
  sendPasswordResetEmail: async (email, token, fullName, retryCount = 0) => {
    // 🎯 DEVELOPMENT MODE: Skip real email sending
    if (
      process.env.NODE_ENV === "development" ||
      process.env.SKIP_EMAILS === "true"
    ) {
      console.log(`📧 [DEV MODE] Password reset email to: ${email}`);
      console.log(`📧 [DEV MODE] Reset Code: ${token}`);
      return { success: true, messageId: "dev-mode-skipped" };
    }

    console.log(
      `📨 Attempting to send password reset email to: ${email} (Attempt ${
        retryCount + 1
      })`
    );

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
      // ⚡ FASTER TIMEOUT: 10 seconds
      const emailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Email sending timeout after 10 seconds")),
          10000
        );
      });

      const info = await Promise.race([emailPromise, timeoutPromise]);
      console.log("✅ Password reset email sent successfully to:", email);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        `❌ Failed to send password reset email to ${email} (Attempt ${
          retryCount + 1
        }):`,
        error.message
      );

      // ⚡ OPTIMIZED RETRY: Only 1 retry with shorter delay
      if (retryCount < 1) {
        console.log(
          `🔄 Retrying password reset email to ${email} in 2 seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return emailService.sendPasswordResetEmail(
          email,
          token,
          fullName,
          retryCount + 1
        );
      } else {
        console.error(
          `💥 All retry attempts failed for password reset to ${email}`
        );
        return {
          success: false,
          error: error.message,
          retriesAttempted: retryCount + 1,
        };
      }
    }
  },

  // 🚀 Send password changed confirmation with OPTIMIZED timeouts
  sendPasswordChangedEmail: async (email, fullName, retryCount = 0) => {
    // 🎯 DEVELOPMENT MODE: Skip real email sending
    if (
      process.env.NODE_ENV === "development" ||
      process.env.SKIP_EMAILS === "true"
    ) {
      console.log(`📧 [DEV MODE] Password changed email to: ${email}`);
      return { success: true, messageId: "dev-mode-skipped" };
    }

    console.log(
      `📨 Attempting to send password changed email to: ${email} (Attempt ${
        retryCount + 1
      })`
    );

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
      // ⚡ FASTER TIMEOUT: 10 seconds
      const emailPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Email sending timeout after 10 seconds")),
          10000
        );
      });

      const info = await Promise.race([emailPromise, timeoutPromise]);
      console.log("✅ Password changed email sent successfully to:", email);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        `❌ Failed to send password changed email to ${email} (Attempt ${
          retryCount + 1
        }):`,
        error.message
      );

      // ⚡ OPTIMIZED RETRY: Only 1 retry with shorter delay
      if (retryCount < 1) {
        console.log(
          `🔄 Retrying password changed email to ${email} in 2 seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return emailService.sendPasswordChangedEmail(
          email,
          fullName,
          retryCount + 1
        );
      } else {
        console.error(
          `💥 All retry attempts failed for password changed email to ${email}`
        );
        return {
          success: false,
          error: error.message,
          retriesAttempted: retryCount + 1,
        };
      }
    }
  },
};

module.exports = emailService;
