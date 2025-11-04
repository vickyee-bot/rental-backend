const { PrismaClient } = require("@prisma/client");
const { uploadMultiple, handleUploadError } = require("../middleware/upload");
const prisma = new PrismaClient();

const unitController = {
  // Get all units
  getUnits: async (req, res) => {
    try {
      const { status, propertyId } = req.query;

      const where = {
        property: { landlordId: req.user.id },
      };

      if (status) where.status = status;
      if (propertyId) where.propertyId = parseInt(propertyId);

      const units = await prisma.unit.findMany({
        where,
        include: {
          property: {
            select: { name: true, location: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: units,
      });
    } catch (error) {
      console.error("Get units error:", error);
      res.status(500).json({ success: false, message: "Error fetching units" });
    }
  },

  // Get single unit
  getUnit: async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: { landlordId: req.user.id },
        },
        include: {
          property: {
            select: {
              name: true,
              location: true,
              waterPrice: true,
              electricityPrice: true,
            },
          },
        },
      });

      if (!unit) {
        return res
          .status(404)
          .json({ success: false, message: "Unit not found" });
      }

      res.json({
        success: true,
        data: unit,
      });
    } catch (error) {
      console.error("Get unit error:", error);
      res.status(500).json({ success: false, message: "Error fetching unit" });
    }
  },

  // Create unit
  createUnit: [
    uploadMultiple,
    handleUploadError,
    async (req, res) => {
      try {
        const { propertyId, name, rent, deposit, size } = req.body;

        const property = await prisma.property.findFirst({
          where: { id: parseInt(propertyId), landlordId: req.user.id },
        });

        if (!property) {
          return res.status(404).json({
            success: false,
            message: "Property not found or access denied",
          });
        }

        // Cloudinary image URLs
        const imageUrls = req.files ? req.files.map((file) => file.path) : [];

        const unit = await prisma.unit.create({
          data: {
            propertyId: parseInt(propertyId),
            name,
            rent: parseFloat(rent),
            deposit: deposit ? parseFloat(deposit) : null,
            size,
            imageUrls,
          },
        });

        res.status(201).json({
          success: true,
          message: "Unit created successfully",
          data: unit,
        });
      } catch (error) {
        console.error("Create unit error:", error);
        res
          .status(500)
          .json({ success: false, message: "Error creating unit" });
      }
    },
  ],

  // Update unit
  updateUnit: [
    uploadMultiple,
    handleUploadError,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { name, rent, deposit, size, amenities, keepExistingImages } =
          req.body;

        const existingUnit = await prisma.unit.findFirst({
          where: {
            id: parseInt(id),
            property: { landlordId: req.user.id },
          },
        });

        if (!existingUnit) {
          return res
            .status(404)
            .json({ success: false, message: "Unit not found" });
        }

        let imageUrls = existingUnit.imageUrls;

        if (req.files && req.files.length > 0) {
          const newUrls = req.files.map((file) => file.path);

          if (keepExistingImages === "false") {
            imageUrls = newUrls;
          } else {
            imageUrls = [...existingUnit.imageUrls, ...newUrls];
          }
        }

        let amenitiesArray = existingUnit.amenities;
        if (amenities) {
          try {
            amenitiesArray =
              typeof amenities === "string" ? JSON.parse(amenities) : amenities;
          } catch {
            amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
          }
        }

        const unit = await prisma.unit.update({
          where: { id: parseInt(id) },
          data: {
            name,
            rent: rent ? parseFloat(rent) : undefined,
            deposit: deposit ? parseFloat(deposit) : undefined,
            size,
            amenities: amenitiesArray,
            imageUrls,
          },
        });

        res.json({
          success: true,
          message: "Unit updated successfully",
          data: unit,
        });
      } catch (error) {
        console.error("Update unit error:", error);
        res
          .status(500)
          .json({ success: false, message: "Error updating unit" });
      }
    },
  ],

  // Update unit status only
  updateUnitStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["AVAILABLE", "OCCUPIED", "MAINTENANCE"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }

      const unit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: { landlordId: req.user.id },
        },
      });

      if (!unit) {
        return res
          .status(404)
          .json({ success: false, message: "Unit not found" });
      }

      const updatedUnit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      res.json({
        success: true,
        message: "Unit status updated",
        data: updatedUnit,
      });
    } catch (error) {
      console.error("Update status error:", error);
      res
        .status(500)
        .json({ success: false, message: "Error updating status" });
    }
  },

  deleteUnit: async (req, res) => {
    try {
      const { id } = req.params;

      const existingUnit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: { landlordId: req.user.id },
        },
      });

      if (!existingUnit) {
        return res
          .status(404)
          .json({ success: false, message: "Unit not found" });
      }

      await prisma.unit.delete({ where: { id: parseInt(id) } });

      res.json({ success: true, message: "Unit deleted successfully" });
    } catch (error) {
      console.error("Delete unit error:", error);
      res.status(500).json({ success: false, message: "Error deleting unit" });
    }
  },
};

module.exports = unitController;
