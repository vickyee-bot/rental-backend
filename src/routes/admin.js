const express = require("express");
const { adminAuth } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(adminAuth);

router.get("/dashboard", adminController.getDashboard);
router.get("/landlords", adminController.getLandlords);
router.get("/properties", adminController.getProperties);
router.get("/vacant-units", adminController.getVacantUnits);
router.get("/referrals", adminController.getReferrals);
router.post("/referrals", adminController.createReferral);
router.patch("/referrals/:id/status", adminController.updateReferralStatus);

module.exports = router;
