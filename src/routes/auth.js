const express = require("express");
const authController = require("../controllers/authController");
const { authMiddleware, adminAuth } = require("../middleware/auth");

const router = express.Router();

// 🏠 Landlord Authentication (Mobile App)
router.post("/register-landlord", authController.registerLandlord);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);
router.post("/resend-password-reset", authController.resendPasswordReset);
router.post("/login-landlord", authController.loginLandlord);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
// ❌ REMOVED: Logout handled client-side in mobile app

// 👨‍💼 Admin Authentication
router.post("/login-admin", authController.loginAdmin);
// ❌ REMOVED: Admin logout also handled client-side

// 🔧 Utility Endpoints for Mobile App
router.get("/profile", authMiddleware, (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      data: req.user,
    });
  } else if (req.admin) {
    res.json({
      success: true,
      data: req.admin,
    });
  }
});

// Debug endpoint to get verification code (remove in production)
router.get("/debug/code/:email", async (req, res) => {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    const landlord = await prisma.landlord.findFirst({
      where: { email: req.params.email },
      select: {
        id: true,
        email: true,
        isVerified: true,
        verifyToken: true,
        verifyExpires: true,
      },
    });

    if (!landlord) {
      return res.status(404).json({
        success: false,
        message: "Landlord not found",
      });
    }

    res.json({
      success: true,
      data: {
        verifyToken: landlord.verifyToken,
        verifyExpires: landlord.verifyExpires,
        isVerified: landlord.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
