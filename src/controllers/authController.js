const { PrismaClient } = require("@prisma/client");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");
const emailService = require("../utils/emailService");
const tokenUtils = require("../utils/tokenUtils");

// Use a single Prisma client instance (better performance)
const prisma = new PrismaClient();

const authController = {
  // ✅ Landlord Registration with Email Verification - ULTRA FAST
  registerLandlord: async (req, res) => {
    try {
      const { fullName, phoneNumber, email, password } = req.body;

      // Fast validation - return early for errors
      if (!fullName || !phoneNumber || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Parallel existence checks
      const [existingByPhone, existingByEmail] = await Promise.all([
        prisma.landlord.findUnique({
          where: { phoneNumber },
          select: { id: true, isVerified: true },
        }),
        prisma.landlord.findFirst({
          where: { email },
          select: { id: true, isVerified: true },
        }),
      ]);

      if (existingByPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number already registered",
        });
      }

      if (existingByEmail) {
        const message = !existingByEmail.isVerified
          ? "Email already registered but not verified. Please verify your email or use resend verification."
          : "Email already registered";

        return res.status(400).json({
          success: false,
          message,
          requiresVerification: !existingByEmail.isVerified,
        });
      }

      // Parallel password hashing and token generation
      const [passwordHash, verifyToken, verifyExpires] = await Promise.all([
        hashPassword(password),
        Promise.resolve(Math.floor(100000 + Math.random() * 900000).toString()),
        Promise.resolve(
          tokenUtils.generateExpiry(
            parseInt(process.env.VERIFY_TOKEN_EXPIRY) || 24
          )
        ),
      ]);

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

      // Generate token
      const token = generateToken(landlord.id, "landlord");

      // 🚀 FIRE AND FORGET - Don't wait for email at all
      emailService
        .sendVerificationEmail(email, verifyToken, fullName)
        .then((result) => {
          if (result.success) {
            console.log("✅ Email sent successfully in background");
          } else {
            console.error("❌ Background email failed:", result.error);
          }
        })
        .catch((error) => {
          console.error("❌ Background email error:", error.message);
        });

      // ⚡ INSTANT RESPONSE - Don't wait for email
      res.status(201).json({
        success: true,
        message:
          "Registration successful. Check your email for verification code.",
        data: {
          landlord,
          token,
          requiresVerification: true,
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

  // ✅ Verify Email with Code - OPTIMIZED
  verifyEmail: async (req, res) => {
    try {
      const { email, code } = req.body;

      // Fast validation
      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: "Email and verification code are required",
        });
      }

      // Single database query with proper conditions
      const landlord = await prisma.landlord.findFirst({
        where: {
          email: email,
          verifyToken: code,
          verifyExpires: { gt: new Date() },
        },
      });

      if (!landlord) {
        // Check if code exists but expired (only if not found)
        const expiredLandlord = await prisma.landlord.findFirst({
          where: { email, verifyToken: code },
          select: { id: true },
        });

        return res.status(400).json({
          success: false,
          message: expiredLandlord
            ? "Verification code has expired. Please request a new one."
            : "Invalid verification code",
          codeExpired: !!expiredLandlord,
        });
      }

      // Update and generate token in parallel
      const [_, token] = await Promise.all([
        prisma.landlord.update({
          where: { id: landlord.id },
          data: {
            isVerified: true,
            verifyToken: null,
            verifyExpires: null,
          },
        }),
        generateToken(landlord.id, "landlord"),
      ]);

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

  // ✅ Resend Verification Code - ULTRA FAST
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const landlord = await prisma.landlord.findFirst({
        where: { email },
        select: {
          id: true,
          fullName: true,
          isVerified: true,
          verifyExpires: true,
        },
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

      // Optimized rate limiting check
      const now = Date.now();
      const lastSent = landlord.verifyExpires.getTime();
      const timeSinceLast = now - lastSent;
      const minResendInterval = 60000; // 1 minute

      if (timeSinceLast > 0 && timeSinceLast < minResendInterval) {
        const waitTime = Math.ceil((minResendInterval - timeSinceLast) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting a new code`,
          retryAfter: waitTime,
        });
      }

      // Generate new code
      const verifyToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verifyExpires = tokenUtils.generateExpiry(24); // 24 hours

      // 🚀 FIRE AND FORGET - Update DB and send email without waiting
      Promise.all([
        prisma.landlord.update({
          where: { id: landlord.id },
          data: { verifyToken, verifyExpires },
        }),
        emailService
          .sendVerificationEmail(email, verifyToken, landlord.fullName)
          .then((result) => {
            if (!result.success) {
              console.error("❌ Background resend failed:", result.error);
            }
          })
          .catch((error) => {
            console.error("❌ Background resend error:", error.message);
          }),
      ]).catch((error) => {
        console.error("❌ Background update error:", error.message);
      });

      // ⚡ INSTANT RESPONSE - Don't wait for email or DB update
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

  // ✅ Landlord Login - OPTIMIZED
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
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          isVerified: true,
          passwordHash: true,
        },
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

      // Remove passwordHash from response
      const { passwordHash, ...landlordData } = landlord;

      res.json({
        success: true,
        message: "Login successful",
        data: {
          landlord: landlordData,
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

  // ✅ Forgot Password - ULTRA FAST
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const landlord = await prisma.landlord.findFirst({
        where: { email },
        select: { id: true, fullName: true },
      });

      // Always return same message to prevent email enumeration
      const successMessage =
        "If an account exists with this email, a reset code has been sent";

      if (!landlord) {
        return res.json({ success: true, message: successMessage });
      }

      // Generate reset token
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const resetExpires = tokenUtils.generateExpiry(1); // 1 hour

      // 🚀 FIRE AND FORGET - Update DB and send email without waiting
      Promise.all([
        prisma.landlord.update({
          where: { id: landlord.id },
          data: { resetToken, resetExpires },
        }),
        emailService
          .sendPasswordResetEmail(email, resetToken, landlord.fullName)
          .catch((error) =>
            console.error("❌ Reset email failed:", error.message)
          ),
      ]).catch((error) => {
        console.error("❌ Background update error:", error.message);
      });

      // ⚡ INSTANT RESPONSE
      res.json({ success: true, message: successMessage });
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

  // ✅ Reset Password with Code - ULTRA FAST
  resetPassword: async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      // Fast validation
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

      const landlord = await prisma.landlord.findFirst({
        where: {
          email: email,
          resetToken: code,
          resetExpires: { gt: new Date() },
        },
        select: { id: true, email: true, fullName: true },
      });

      if (!landlord) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset code",
        });
      }

      const passwordHash = await hashPassword(newPassword);

      // 🚀 FIRE AND FORGET - Update password and send confirmation without waiting
      Promise.all([
        prisma.landlord.update({
          where: { id: landlord.id },
          data: {
            passwordHash,
            resetToken: null,
            resetExpires: null,
          },
        }),
        emailService
          .sendPasswordChangedEmail(landlord.email, landlord.fullName)
          .catch((error) =>
            console.error("❌ Confirmation email failed:", error.message)
          ),
      ]).catch((error) => {
        console.error("❌ Background update error:", error.message);
      });

      // ⚡ INSTANT RESPONSE
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

  // ✅ Admin Login - OPTIMIZED
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
        select: { id: true, username: true, email: true, passwordHash: true },
      });

      if (!admin || !(await comparePassword(password, admin.passwordHash))) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = generateToken(admin.id, "admin");

      // Remove passwordHash from response
      const { passwordHash, ...adminData } = admin;

      res.json({
        success: true,
        message: "Admin login successful",
        data: {
          admin: adminData,
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
