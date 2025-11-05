const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const unitController = require("../controllers/unitController");
const { uploadMultiple } = require("../middleware/upload");

const router = express.Router();

// Apply authMiddleware to all routes
router.use(authMiddleware);

// Routes
router.get("/", unitController.getUnits);
router.get("/:id", unitController.getUnit);
router.post("/", uploadMultiple("images", 5), unitController.createUnit); // Upload up to 5 images
router.put("/:id", uploadMultiple("images", 5), unitController.updateUnit);
router.patch("/:id/status", unitController.updateUnitStatus);
router.delete("/:id", unitController.deleteUnit);

module.exports = router;
