const { PrismaClient } = require("@prisma/client");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");
const tokenUtils = require("../utils/tokenUtils");
const emailQueue = require("../utils/emailQueue");

const prisma = new PrismaClient();

const authController = {
  // ✅ Landlord Registration with Email Verification
  registerLandlord: async (req, res) => {
    try {
      const { fullName, phoneNumber, email, password } = req.body;

      if (!fullName || !phoneNumber || !email || !password) {
        return res
          .status(400)
          .json({ success: false, message: "All fields are required" });
      }
      if (password.length < 6) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Password must be at least 6 characters long",
          });
      }

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
        return res
          .status(400)
          .json({ success: false, message: "Phone number already registered" });
      }
      if (existingByEmail) {
        const message = !existingByEmail.isVerified
          ? "Email already registered but not verified. Please verify your email or use resend verification."
          : "Email already registered";
        return res
          .status(400)
          .json({
            success: false,
            message,
            requiresVerification: !existingByEmail.isVerified,
          });
      }

      const [passwordHash, verifyToken, verifyExpires] = await Promise.all([
        hashPassword(password),
        Promise.resolve(Math.floor(100000 + Math.random() * 900000).toString()),
        Promise.resolve(
          tokenUtils.generateExpiry(
            parseInt(process.env.VERIFY_TOKEN_EXPIRY) || 24
          )
        ),
      ]);

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

      const token = generateToken(landlord.id, "landlord");

      // 🚀 Queue verification email
      emailQueue.add(email, verifyToken, fullName, "verification");
      console.log("🚀 Verification email queued successfully");

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
      res
        .status(500)
        .json({
          success: false,
          message: "Error during registration",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },

  // ✅ Verify Email
  verifyEmail: async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code)
        return res
          .status(400)
          .json({
            success: false,
            message: "Email and verification code are required",
          });

      const landlord = await prisma.landlord.findFirst({
        where: { email, verifyToken: code, verifyExpires: { gt: new Date() } },
      });

      if (!landlord) {
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

      const [_, token] = await Promise.all([
        prisma.landlord.update({
          where: { id: landlord.id },
          data: { isVerified: true, verifyToken: null, verifyExpires: null },
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
            phoneNumber: landlord.phoneNumber,
            email: landlord.email,
            isVerified: true,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error verifying email",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },

  // ✅ Resend Verification Code
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });

      const landlord = await prisma.landlord.findFirst({
        where: { email },
        select: {
          id: true,
          fullName: true,
          isVerified: true,
          verifyExpires: true,
        },
      });
      if (!landlord)
        return res
          .status(404)
          .json({
            success: false,
            message: "No account found with this email",
          });
      if (landlord.isVerified)
        return res
          .status(400)
          .json({ success: false, message: "Email is already verified" });

      const now = Date.now();
      const lastSent = landlord.verifyExpires.getTime();
      if (now - lastSent < 60000)
        return res
          .status(429)
          .json({
            success: false,
            message: `Please wait ${Math.ceil(
              (60000 - (now - lastSent)) / 1000
            )} seconds before requesting a new code`,
          });

      const verifyToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verifyExpires = tokenUtils.generateExpiry(24);

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { verifyToken, verifyExpires },
      });

      emailQueue.add(email, verifyToken, landlord.fullName, "verification");
      console.log("🚀 Verification email queued successfully");

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
      res
        .status(500)
        .json({
          success: false,
          message: "Error resending verification code",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },

  // ✅ Resend Password Reset
  resendPasswordReset: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });

      const landlord = await prisma.landlord.findFirst({
        where: {
          email,
          resetToken: { not: null },
          resetExpires: { gt: new Date() },
        },
        select: {
          id: true,
          fullName: true,
          resetExpires: true,
          isVerified: true,
        },
      });
      if (!landlord)
        return res
          .status(404)
          .json({
            success: false,
            message:
              "No active password reset request found. Please request a new password reset first.",
          });

      const now = Date.now();
      if (now - landlord.resetExpires.getTime() < 60000)
        return res
          .status(429)
          .json({
            success: false,
            message: `Please wait ${Math.ceil(
              (60000 - (now - landlord.resetExpires.getTime())) / 1000
            )} seconds before requesting a new reset code`,
          });

      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const resetExpires = tokenUtils.generateExpiry(1);

      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { resetToken, resetExpires },
      });

      emailQueue.add(email, resetToken, landlord.fullName, "reset");
      console.log("🚀 Password reset email queued successfully");

      res.json({
        success: true,
        message: "Password reset code sent successfully",
        data: {
          emailSent: true,
          resetCode:
            process.env.NODE_ENV === "development" ? resetToken : undefined,
        },
      });
    } catch (error) {
      console.error("Resend password reset error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error resending password reset code",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },

  // ✅ Landlord Login
  loginLandlord: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res
          .status(400)
          .json({ success: false, message: "Email and password are required" });

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
      )
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });

      const token = generateToken(landlord.id, "landlord");
      const { passwordHash, ...landlordData } = landlord;

      res.json({
        success: true,
        message: "Login successful",
        data: { landlord: landlordData, token },
      });
    } catch (error) {
      console.error("Login error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error during login",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },

  // ✅ Forgot Password
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });

      const landlord = await prisma.landlord.findFirst({
        where: { email },
        select: { id: true, fullName: true },
      });
      const successMessage =
        "If an account exists with this email, a reset code has been sent";

      if (landlord) {
        const resetToken = Math.floor(
          100000 + Math.random() * 900000
        ).toString();
        const resetExpires = tokenUtils.generateExpiry(1);

        await prisma.landlord.update({
          where: { id: landlord.id },
          data: { resetToken, resetExpires },
        });
        emailQueue.add(email, resetToken, landlord.fullName, "reset");
        console.log("🚀 Password reset email queued successfully");
      }

      res.json({ success: true, message: successMessage });
    } catch (error) {
      console.error("Forgot password error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error processing request",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },

  // ✅ Reset Password
  resetPassword: async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword)
        return res
          .status(400)
          .json({
            success: false,
            message: "Email, code, and new password are required",
          });
      if (newPassword.length < 6)
        return res
          .status(400)
          .json({
            success: false,
            message: "Password must be at least 6 characters long",
          });

      const landlord = await prisma.landlord.findFirst({
        where: { email, resetToken: code, resetExpires: { gt: new Date() } },
        select: { id: true, email: true, fullName: true },
      });
      if (!landlord)
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired reset code" });

      const passwordHash = await hashPassword(newPassword);
      await prisma.landlord.update({
        where: { id: landlord.id },
        data: { passwordHash, resetToken: null, resetExpires: null },
      });

      emailQueue.add(landlord.email, null, landlord.fullName, "changed");
      console.log("🚀 Password changed confirmation email queued successfully");

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error resetting password",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },

  // ✅ Admin Login
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res
          .status(400)
          .json({ success: false, message: "Email and password are required" });

      const admin = await prisma.admin.findUnique({
        where: { email },
        select: { id: true, username: true, email: true, passwordHash: true },
      });
      if (!admin || !(await comparePassword(password, admin.passwordHash)))
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });

      const token = generateToken(admin.id, "admin");
      const { passwordHash, ...adminData } = admin;

      res.json({
        success: true,
        message: "Admin login successful",
        data: { admin: adminData, token },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Error during admin login",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
  },
};

module.exports = authController;
