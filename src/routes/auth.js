const express = require("express");
const authController = require("../controllers/authController");
const { authMiddleware, adminAuth } = require("../middleware/auth");

const router = express.Router();

// 🏠 Landlord Authentication (Mobile App)
router.post("/register-landlord", authController.registerLandlord);
router.post("/verify-email", authController.verifyEmail); // Now takes {email, code}
router.post("/resend-verification", authController.resendVerification);
router.post("/login-landlord", authController.loginLandlord); // Now uses email instead of phone
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword); // Now takes {email, code, newPassword, confirmPassword}
router.post("/logout-landlord", authMiddleware, authController.logout);

// 👨‍💼 Admin Authentication
router.post("/login-admin", authController.loginAdmin);
router.post("/logout-admin", adminAuth, authController.logoutAdmin);

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

module.exports = router;
