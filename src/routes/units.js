const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const unitController = require("../controllers/unitController");

const router = express.Router();

// Apply authMiddleware to all routes in this router
router.use(authMiddleware);

router.get("/", unitController.getUnits);
router.get("/:id", unitController.getUnit);
router.post("/", unitController.createUnit);
router.put("/:id", unitController.updateUnit);
router.patch("/:id/status", unitController.updateUnitStatus);
router.delete("/:id", unitController.deleteUnit);

module.exports = router;
