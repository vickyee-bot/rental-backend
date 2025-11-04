const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// Landlord authentication
router.post("/register-landlord", authController.registerLandlord);
router.post("/login-landlord", authController.loginLandlord);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);

// Password reset
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Admin authentication
router.post("/login-admin", authController.loginAdmin);

module.exports = router;
