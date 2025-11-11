const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const landlordController = require("../controllers/landlordController");

const router = express.Router();

// Apply authMiddleware to all routes in this router
router.use(authMiddleware);

router.get("/profile", landlordController.getProfile);
router.put("/profile", authMiddleware, landlordController.updateProfile);
router.put("/password", landlordController.changePassword);
router.get("/dashboard", landlordController.getDashboard);

module.exports = router;
