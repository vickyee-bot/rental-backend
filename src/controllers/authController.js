const { PrismaClient } = require("@prisma/client");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");
const emailService = require("../utils/emailService");
const tokenUtils = require("../utils/tokenUtils");

const prisma = new PrismaClient();

const authController = {
  // ✅ Landlord Registration with Email Verification (Mobile App)
  registerLandlord: async (req, res) => {
    try {
      const { fullName, phoneNumber, email, password } = req.body;

      // Validate required fields
      if (!fullName || !phoneNumber || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Check password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Check if landlord exists by phone number
      const existingByPhone = await prisma.landlord.findUnique({
        where: { phoneNumber },
      });

      if (existingByPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number already registered",
        });
      }

      // Check if landlord exists by email
      const existingByEmail = await prisma.landlord.findFirst({
        where: { email },
      });

      if (existingByEmail) {
        // If user exists but is not verified, allow resending verification
        if (!existingByEmail.isVerified) {
          return res.status(400).json({
            success: false,
            message:
              "Email already registered but not verified. Please verify your email or use resend verification.",
            requiresVerification: true,
          });
        }
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Generate 6-digit verification code
      const verifyToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verifyExpires = tokenUtils.generateExpiry(
        parseInt(process.env.VERIFY_TOKEN_EXPIRY) || 24
      );

      // Create landlord
      const landlord = await prisma.landlord.create({
        data: {
          fullName,
          phoneNumber,
          email,
          passwordHash,
          verifyToken,
          verifyExpires,
          isVerified: false,
        },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          isVerified: true,
          createdAt: true,
        },
      });

      // Generate temporary token
      const token = generateToken(landlord.id, "landlord");

      // ✅ Send email with retry logic
      const emailResult = await emailService.sendVerificationEmail(
        email,
        verifyToken,
        fullName
      );

      if (!emailResult.success) {
        console.error(
          "❌ Email sending failed after retries:",
          emailResult.error
        );
        // Still return success to user, but log the error
        console.log("⚠️ User registered but verification email failed to send");
      }

      res.status(201).json({
        success: true,
        message: emailResult.success
          ? "Registration successful. Check your email for verification code."
          : "Registration successful, but verification email may be delayed. You can request a new code if needed.",
        data: {
          landlord,
          token,
          requiresVerification: true,
          emailSent: emailResult.success,
          verificationCode:
            process.env.NODE_ENV === "development" ? verifyToken : undefined,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Error during registration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ Verify Email with Code (Mobile App)
  verifyEmail: async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: "Email and verification code are required",
        });
      }

      // Find landlord with valid verification code
      const landlord = await prisma.landlord.findFirst({
        where: {
          email: email,
          verifyToken: code,
          verifyExpires: {
            gt: new Date(),
          },
        },
      });

      if (!landlord) {
        // Check if code exists but expired
        const expiredLandlord = await prisma.landlord.findFirst({
          where: {
            email: email,
            verifyToken: code,
          },
        });

        if (expiredLandlord) {
          return res.status(400).json({
            success: false,
            message: "Verification code has expired. Please request a new one.",
            codeExpired: true,
          });
        }

        return res.status(400).json({
          success: false,
          message: "Invalid verification code",
        });
      }

      // Update landlord as verified and clear verification token
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          isVerified: true,
          verifyToken: null,
          verifyExpires: null,
        },
      });

      // Generate new full-access token
      const token = generateToken(landlord.id, "landlord");

      res.json({
        success: true,
        message: "Email verified successfully",
        data: {
          landlord: {
            id: landlord.id,
            fullName: landlord.fullName,
            email: landlord.email,
            isVerified: true,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying email",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ Resend Verification Code with improved logic (Mobile App)
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Find landlord by email
      const landlord = await prisma.landlord.findFirst({
        where: { email },
      });

      if (!landlord) {
        return res.status(404).json({
          success: false,
          message: "No account found with this email",
        });
      }

      if (landlord.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Check if we should wait before resending (prevent spam)
      // FIX: Use verifyExpires to calculate time since last verification
      const lastVerificationSent = landlord.verifyExpires;
      const now = new Date();

      // Calculate how much time has passed since the verification was sent
      const timeSinceLastVerification = now - lastVerificationSent;
      const minResendInterval = 1 * 60 * 1000; // 1 minute in milliseconds

      console.log("🔍 Resend verification debug:", {
        email,
        lastVerificationSent,
        now,
        timeSinceLastVerification,
        minResendInterval,
      });

      // If timeSinceLastVerification is negative, it means verifyExpires is in the future
      // If it's positive but less than minResendInterval, user needs to wait
      if (
        timeSinceLastVerification < minResendInterval &&
        timeSinceLastVerification > 0
      ) {
        const waitTime = Math.ceil(
          (minResendInterval - timeSinceLastVerification) / 1000
        );
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting a new verification code`,
          retryAfter: waitTime,
        });
      }

      // If the verification code has expired (more than 24 hours old), allow immediate resend
      const verificationExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (timeSinceLastVerification > verificationExpiry) {
        console.log(
          "🔄 Verification code expired, generating new one immediately"
        );
      }

      // Generate new 6-digit verification code
      const verifyToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verifyExpires = tokenUtils.generateExpiry(
        parseInt(process.env.VERIFY_TOKEN_EXPIRY) || 24
      );

      // Update landlord with new code
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          verifyToken,
          verifyExpires,
        },
      });

      // ✅ Send email with retry logic
      const emailResult = await emailService.sendVerificationEmail(
        email,
        verifyToken,
        landlord.fullName
      );

      if (!emailResult.success) {
        console.error(
          "❌ Resend verification failed after retries:",
          emailResult.error
        );
        return res.status(500).json({
          success: false,
          message: "Failed to send verification code. Please try again later.",
        });
      }

      res.json({
        success: true,
        message: "Verification code sent successfully",
        data: {
          emailSent: true,
          verificationCode:
            process.env.NODE_ENV === "development" ? verifyToken : undefined,
        },
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: "Error resending verification code",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ Landlord Login (Mobile App)
  loginLandlord: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const landlord = await prisma.landlord.findFirst({
        where: { email },
      });

      if (
        !landlord ||
        !(await comparePassword(password, landlord.passwordHash))
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = generateToken(landlord.id, "landlord");

      res.json({
        success: true,
        message: "Login successful",
        data: {
          landlord: {
            id: landlord.id,
            fullName: landlord.fullName,
            phoneNumber: landlord.phoneNumber,
            email: landlord.email,
            isVerified: landlord.isVerified,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Error during login",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ Forgot Password - Send Reset Code (Mobile App)
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Find landlord by email
      const landlord = await prisma.landlord.findFirst({
        where: { email },
      });

      if (!landlord) {
        // Return success even if email not found to prevent email enumeration
        return res.json({
          success: true,
          message:
            "If an account exists with this email, a reset code has been sent",
        });
      }

      // Generate 6-digit reset code
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const resetExpires = tokenUtils.generateExpiry(
        parseInt(process.env.RESET_TOKEN_EXPIRY) || 1 // 1 hour expiry
      );

      // Update landlord with reset code
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          resetToken,
          resetExpires,
        },
      });

      // ✅ Send email with retry logic
      const emailResult = await emailService.sendPasswordResetEmail(
        email,
        resetToken,
        landlord.fullName
      );

      if (!emailResult.success) {
        console.error(
          "❌ Password reset email failed after retries:",
          emailResult.error
        );
        // Still return success to prevent email enumeration
        return res.json({
          success: true,
          message:
            "If an account exists with this email, a reset code has been sent",
        });
      }

      res.json({
        success: true,
        message:
          "If an account exists with this email, a reset code has been sent",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Error processing request",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ Reset Password with Code (Mobile App)
  resetPassword: async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Email, code, and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Find landlord with valid reset code
      const landlord = await prisma.landlord.findFirst({
        where: {
          email: email,
          resetToken: code,
          resetExpires: {
            gt: new Date(),
          },
        },
      });

      if (!landlord) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset code",
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update landlord password and clear reset token
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          passwordHash,
          resetToken: null,
          resetExpires: null,
        },
      });

      // ✅ Send confirmation email with retry logic
      const emailResult = await emailService.sendPasswordChangedEmail(
        landlord.email,
        landlord.fullName
      );

      if (!emailResult.success) {
        console.error(
          "❌ Password changed email failed after retries:",
          emailResult.error
        );
        // Still proceed with password reset
        console.log(
          "⚠️ Password reset successful but confirmation email failed"
        );
      }

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Error resetting password",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ Admin Login (Mobile App)
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const admin = await prisma.admin.findUnique({
        where: { email },
      });

      if (!admin || !(await comparePassword(password, admin.passwordHash))) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = generateToken(admin.id, "admin");

      res.json({
        success: true,
        message: "Admin login successful",
        data: {
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        message: "Error during admin login",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};

module.exports = authController;
