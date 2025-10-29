const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const propertyController = require("../controllers/propertyController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", propertyController.getProperties);
router.post("/", propertyController.createProperty);
router.put("/:id", propertyController.updateProperty);
router.delete("/:id", propertyController.deleteProperty);

module.exports = router;
