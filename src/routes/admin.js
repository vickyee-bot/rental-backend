const express = require("express");
const { adminAuth } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const router = express.Router();

// Apply adminAuth to all routes in this router
router.use(adminAuth);

// Dashboard
router.get("/dashboard", adminController.getDashboard);

// Landlords Management
router.get("/landlords", adminController.getLandlords);

// Properties Management
router.get("/properties", adminController.getProperties);
router.get("/properties/:id", adminController.getPropertyById);

// Vacant Units & Referrals
router.get("/vacant-units", adminController.getVacantUnits);
router.get("/referrals", adminController.getReferrals);
router.post("/referrals", adminController.createReferral);
router.patch("/referrals/:id/status", adminController.updateReferralStatus);

module.exports = router;
