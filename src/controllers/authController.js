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
  // ✅ Landlord Registration with Email Verification (Mobile App) - UPDATED
  registerLandlord: async (req, res) => {
    try {
      const { fullName, phoneNumber, email, password, confirmPassword } =
        req.body;

      // Validate required fields
      if (
        !fullName ||
        !phoneNumber ||
        !email ||
        !password ||
        !confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Passwords do not match",
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

      // ✅ CRITICAL FIX: Send email in background without waiting for response
      emailService
        .sendVerificationEmail(email, verifyToken, fullName)
        .then((result) => {
          if (result.success) {
            console.log("✅ Verification email sent in background to:", email);
          } else {
            console.error("❌ Background email failed:", result.error);
          }
        })
        .catch((error) => {
          console.error("❌ Background email error:", error.message);
        });

      // ✅ CRITICAL FIX: Respond immediately without waiting for email
      res.status(201).json({
        success: true,
        message:
          "Registration successful. Check your email for verification code.",
        data: {
          landlord,
          token, // Temporary token for email verification flow
          requiresVerification: true,
          verificationCode:
            process.env.NODE_ENV === "development" ? verifyToken : undefined, // For testing
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
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification code",
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
          token, // Full access token after verification
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

  // ✅ Resend Verification Code (Mobile App) - UPDATED
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

      // ✅ FIX: Send email in background
      emailService
        .sendVerificationEmail(email, verifyToken, landlord.fullName)
        .then((result) => {
          if (result.success) {
            console.log("✅ Resend verification email sent to:", email);
          } else {
            console.error("❌ Resend email failed:", result.error);
          }
        })
        .catch((error) => {
          console.error("❌ Resend email error:", error.message);
        });

      res.json({
        success: true,
        message: "Verification code sent successfully",
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

  // ✅ Forgot Password - Send Reset Code (Mobile App) - UPDATED
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

      // ✅ FIX: Send email in background
      emailService
        .sendPasswordResetEmail(email, resetToken, landlord.fullName)
        .then((result) => {
          if (result.success) {
            console.log("✅ Password reset email sent to:", email);
          } else {
            console.error("❌ Password reset email failed:", result.error);
          }
        })
        .catch((error) => {
          console.error("❌ Password reset email error:", error.message);
        });

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
      const { email, code, newPassword, confirmPassword } = req.body;

      if (!email || !code || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Passwords do not match",
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

      // ✅ FIX: Send confirmation email in background
      emailService
        .sendPasswordChangedEmail(landlord.email, landlord.fullName)
        .then((result) => {
          if (result.success) {
            console.log("✅ Password changed email sent to:", landlord.email);
          } else {
            console.error("❌ Password changed email failed:", result.error);
          }
        })
        .catch((error) => {
          console.error("❌ Password changed email error:", error.message);
        });

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

  // ✅ Logout (Mobile App)
  logout: async (req, res) => {
    try {
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Error during logout",
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

  // ✅ Admin Logout
  logoutAdmin: async (req, res) => {
    try {
      res.json({
        success: true,
        message: "Admin logged out successfully",
      });
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({
        success: false,
        message: "Error during admin logout",
      });
    }
  },
};

module.exports = authController;
