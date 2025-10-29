const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const landlordController = require("../controllers/landlordController");

const router = express.Router();

router.use(authMiddleware);

router.get("/profile", landlordController.getProfile);
router.put("/profile", landlordController.updateProfile);
router.put("/password", landlordController.changePassword);
router.get("/dashboard", landlordController.getDashboard);

module.exports = router;
