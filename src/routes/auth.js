const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/register-landlord", authController.registerLandlord);
router.post("/login-landlord", authController.loginLandlord);
router.post("/login-admin", authController.loginAdmin);

module.exports = router;
