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
  // Landlord Registration with Email Verification
  registerLandlord: async (req, res) => {
    try {
      const { fullName, phoneNumber, email, password } = req.body;

      // Validate required fields
      if (!fullName || !phoneNumber || !password) {
        return res.status(400).json({
          success: false,
          message: "Full name, phone number, and password are required",
        });
      }

      // Check if landlord exists by phone number
      const existingByPhone = await prisma.landlord.findUnique({
        where: { phoneNumber },
      });

      if (existingByPhone) {
        return res.status(400).json({
          success: false,
          message: "Landlord with this phone number already exists",
        });
      }

      // Check if landlord exists by email (if provided)
      if (email) {
        const existingByEmail = await prisma.landlord.findFirst({
          where: { email },
        });

        if (existingByEmail) {
          return res.status(400).json({
            success: false,
            message: "Landlord with this email already exists",
          });
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Generate verification token
      const verifyToken = tokenUtils.generateToken();
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

      // Send verification email if email is provided
      if (email) {
        const emailResult = await emailService.sendVerificationEmail(
          email,
          verifyToken,
          fullName
        );

        if (!emailResult.success) {
          console.error(
            "Failed to send verification email:",
            emailResult.error
          );
          // Continue with registration even if email fails
        }
      }

      // Generate temporary token (limited access until verified)
      const token = generateToken(landlord.id, "landlord");

      res.status(201).json({
        success: true,
        message: email
          ? "Landlord registered successfully. Please check your email for verification."
          : "Landlord registered successfully. Please add an email to enable full features.",
        data: {
          landlord,
          token,
          requiresVerification: !!email,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Error registering landlord",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Verify Email
  verifyEmail: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Verification token is required",
        });
      }

      // Find landlord with valid verification token
      const landlord = await prisma.landlord.findFirst({
        where: {
          verifyToken: token,
          verifyExpires: {
            gt: new Date(),
          },
        },
      });

      if (!landlord) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
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

  // Resend Verification Email
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
          message: "Landlord not found with this email",
        });
      }

      if (landlord.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified",
        });
      }

      // Generate new verification token
      const verifyToken = tokenUtils.generateToken();
      const verifyExpires = tokenUtils.generateExpiry(
        parseInt(process.env.VERIFY_TOKEN_EXPIRY) || 24
      );

      // Update landlord with new token
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          verifyToken,
          verifyExpires,
        },
      });

      // Send verification email
      const emailResult = await emailService.sendVerificationEmail(
        email,
        verifyToken,
        landlord.fullName
      );

      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email",
        });
      }

      res.json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({
        success: false,
        message: "Error resending verification email",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Forgot Password
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
            "If an account with that email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = tokenUtils.generateToken();
      const resetExpires = tokenUtils.generateExpiry(
        parseInt(process.env.RESET_TOKEN_EXPIRY) || 1
      );

      // Update landlord with reset token
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: {
          resetToken,
          resetExpires,
        },
      });

      // Send password reset email
      const emailResult = await emailService.sendPasswordResetEmail(
        email,
        resetToken,
        landlord.fullName
      );

      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to send password reset email",
        });
      }

      res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Error processing forgot password request",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Reset Password
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Find landlord with valid reset token
      const landlord = await prisma.landlord.findFirst({
        where: {
          resetToken: token,
          resetExpires: {
            gt: new Date(),
          },
        },
      });

      if (!landlord) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
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

      // Send password changed confirmation email
      if (landlord.email) {
        await emailService.sendPasswordChangedEmail(
          landlord.email,
          landlord.fullName
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

  // Landlord Login (Updated to check verification)
  loginLandlord: async (req, res) => {
    try {
      const { phoneNumber, password } = req.body;

      const landlord = await prisma.landlord.findUnique({
        where: { phoneNumber },
      });

      if (
        !landlord ||
        !(await comparePassword(password, landlord.passwordHash))
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid phone number or password",
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

  // Admin Login (unchanged)
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;

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
