const { PrismaClient } = require("@prisma/client");
const { uploadMultiple, handleUploadError } = require("../middleware/upload"); // Fixed path
const path = require("path");

const prisma = new PrismaClient();

const unitController = {
  // Get all units for landlord
  getUnits: async (req, res) => {
    try {
      const { status, propertyId } = req.query;

      const where = {
        property: {
          landlordId: req.user.id,
        },
      };

      if (status) where.status = status;
      if (propertyId) where.propertyId = parseInt(propertyId);

      const units = await prisma.unit.findMany({
        where,
        include: {
          property: {
            select: {
              name: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Convert image URLs to full URLs
      const unitsWithFullImageUrls = units.map((unit) => ({
        ...unit,
        imageUrls: unit.imageUrls.map(
          (url) =>
            `${req.protocol}://${req.get("host")}/uploads/${path.basename(url)}`
        ),
      }));

      res.json({
        success: true,
        data: unitsWithFullImageUrls,
      });
    } catch (error) {
      console.error("Get units error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching units",
      });
    }
  },

  // Get single unit
  getUnit: async (req, res) => {
    try {
      const { id } = req.params;

      const unit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: {
            landlordId: req.user.id,
          },
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
        return res.status(404).json({
          success: false,
          message: "Unit not found",
        });
      }

      // Convert image URLs to full URLs
      const unitWithFullImageUrls = {
        ...unit,
        imageUrls: unit.imageUrls.map(
          (url) =>
            `${req.protocol}://${req.get("host")}/uploads/${path.basename(url)}`
        ),
      };

      res.json({
        success: true,
        data: unitWithFullImageUrls,
      });
    } catch (error) {
      console.error("Get unit error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching unit",
      });
    }
  },

  // Create new unit with image upload
  createUnit: [
    uploadMultiple,
    handleUploadError,
    async (req, res) => {
      try {
        const { propertyId, name, rent, deposit, size, amenities } = req.body;

        // Verify property belongs to landlord
        const property = await prisma.property.findFirst({
          where: {
            id: parseInt(propertyId),
            landlordId: req.user.id,
          },
        });

        if (!property) {
          return res.status(404).json({
            success: false,
            message: "Property not found or access denied",
          });
        }

        // Process uploaded files
        const imageUrls = req.files
          ? req.files.map((file) => file.filename)
          : [];

        // Parse amenities if provided as JSON string
        let amenitiesArray = [];
        if (amenities) {
          try {
            amenitiesArray =
              typeof amenities === "string" ? JSON.parse(amenities) : amenities;
          } catch (parseError) {
            amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
          }
        }

        const unit = await prisma.unit.create({
          data: {
            propertyId: parseInt(propertyId),
            name,
            rent: parseFloat(rent),
            deposit: deposit ? parseFloat(deposit) : null,
            size,
            amenities: amenitiesArray,
            imageUrls,
          },
        });

        // Convert image URLs to full URLs for response
        const unitWithFullImageUrls = {
          ...unit,
          imageUrls: imageUrls.map(
            (filename) =>
              `${req.protocol}://${req.get("host")}/uploads/${filename}`
          ),
        };

        res.status(201).json({
          success: true,
          message: "Unit created successfully",
          data: unitWithFullImageUrls,
        });
      } catch (error) {
        console.error("Create unit error:", error);
        res.status(500).json({
          success: false,
          message: "Error creating unit",
        });
      }
    },
  ],

  // Update unit with optional image upload
  updateUnit: [
    uploadMultiple,
    handleUploadError,
    async (req, res) => {
      try {
        const { id } = req.params;
        const {
          name,
          rent,
          deposit,
          size,
          amenities,
          keepExistingImages, // Flag to keep existing images or replace them
        } = req.body;

        // Verify unit belongs to landlord
        const existingUnit = await prisma.unit.findFirst({
          where: {
            id: parseInt(id),
            property: {
              landlordId: req.user.id,
            },
          },
        });

        if (!existingUnit) {
          return res.status(404).json({
            success: false,
            message: "Unit not found",
          });
        }

        // Process image updates
        let imageUrls = existingUnit.imageUrls;

        if (req.files && req.files.length > 0) {
          if (keepExistingImages === "false" || keepExistingImages === false) {
            // Replace all images
            imageUrls = req.files.map((file) => file.filename);
          } else {
            // Add new images to existing ones
            const newImageUrls = req.files.map((file) => file.filename);
            imageUrls = [...existingUnit.imageUrls, ...newImageUrls];
          }
        }

        // Parse amenities if provided
        let amenitiesArray = existingUnit.amenities;
        if (amenities) {
          try {
            amenitiesArray =
              typeof amenities === "string" ? JSON.parse(amenities) : amenities;
          } catch (parseError) {
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

        // Convert image URLs to full URLs for response
        const unitWithFullImageUrls = {
          ...unit,
          imageUrls: unit.imageUrls.map(
            (filename) =>
              `${req.protocol}://${req.get("host")}/uploads/${filename}`
          ),
        };

        res.json({
          success: true,
          message: "Unit updated successfully",
          data: unitWithFullImageUrls,
        });
      } catch (error) {
        console.error("Update unit error:", error);
        res.status(500).json({
          success: false,
          message: "Error updating unit",
        });
      }
    },
  ],

  // Delete unit image
  deleteUnitImage: async (req, res) => {
    try {
      const { id } = req.params;
      const { imageFilename } = req.body;

      // Verify unit belongs to landlord
      const existingUnit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: {
            landlordId: req.user.id,
          },
        },
      });

      if (!existingUnit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found",
        });
      }

      // Remove image from array
      const updatedImageUrls = existingUnit.imageUrls.filter(
        (url) => path.basename(url) !== imageFilename
      );

      const unit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: {
          imageUrls: updatedImageUrls,
        },
      });

      // Convert image URLs to full URLs for response
      const unitWithFullImageUrls = {
        ...unit,
        imageUrls: unit.imageUrls.map(
          (filename) =>
            `${req.protocol}://${req.get("host")}/uploads/${filename}`
        ),
      };

      res.json({
        success: true,
        message: "Image deleted successfully",
        data: unitWithFullImageUrls,
      });
    } catch (error) {
      console.error("Delete unit image error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting unit image",
      });
    }
  },

  // Update unit status
  updateUnitStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["Vacant", "Occupied"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either Vacant or Occupied",
        });
      }

      // Verify unit belongs to landlord
      const existingUnit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: {
            landlordId: req.user.id,
          },
        },
      });

      if (!existingUnit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found",
        });
      }

      const unit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: { status },
      });

      res.json({
        success: true,
        message: `Unit status updated to ${status}`,
        data: unit,
      });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating unit status",
      });
    }
  },

  // Delete unit
  deleteUnit: async (req, res) => {
    try {
      const { id } = req.params;

      // Verify unit belongs to landlord
      const existingUnit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: {
            landlordId: req.user.id,
          },
        },
      });

      if (!existingUnit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found",
        });
      }

      await prisma.unit.delete({
        where: { id: parseInt(id) },
      });

      res.json({
        success: true,
        message: "Unit deleted successfully",
      });
    } catch (error) {
      console.error("Delete unit error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting unit",
      });
    }
  },
};

module.exports = unitController;
