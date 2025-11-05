const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const imageController = require("../controllers/imageController");
const { uploadMultiple } = require("../middleware/upload");

const router = express.Router();

// Apply authMiddleware to all routes
router.use(authMiddleware);

// Image management routes
router.delete("/unit", imageController.deleteUnitImage);
router.post(
  "/unit",
  uploadMultiple("images", 5),
  imageController.addUnitImages
);

module.exports = router;
