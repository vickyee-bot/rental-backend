const { PrismaClient } = require("@prisma/client");
const { cloudinaryUtils } = require("../utils/cloudinary");

const prisma = new PrismaClient();

const unitController = {
  // Create Unit with Image Upload
  createUnit: async (req, res) => {
    try {
      const {
        name,
        rent,
        deposit,
        size,
        propertyId,
        status = "Vacant",
      } = req.body;

      // Validate required fields
      if (!name || !rent || !propertyId) {
        return res.status(400).json({
          success: false,
          message: "Name, rent, and property ID are required",
        });
      }

      // Check if property exists and belongs to landlord
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

      // Process uploaded images
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        imageUrls = req.files.map((file) => ({
          url: file.path, // Cloudinary URL
          public_id: file.filename, // Cloudinary public_id
        }));
      }

      // Create unit
      const unit = await prisma.unit.create({
        data: {
          name,
          rent: parseFloat(rent),
          deposit: deposit ? parseFloat(deposit) : null,
          size: size || null,
          status,
          imageUrls: imageUrls.map((img) => img.url), // Store only URLs in database
          propertyId: parseInt(propertyId),
        },
        include: {
          property: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });

      // Store Cloudinary public_ids separately if needed
      // You can create a separate table for image metadata if required

      res.status(201).json({
        success: true,
        message: "Unit created successfully",
        data: {
          unit,
          images: imageUrls, // Return image info including public_ids
        },
      });
    } catch (error) {
      console.error("Create unit error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating unit",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Update Unit with Image Management
  updateUnit: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, rent, deposit, size, status } = req.body;

      // Check if unit exists and belongs to landlord
      const existingUnit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: {
            landlordId: req.user.id,
          },
        },
        include: {
          property: true,
        },
      });

      if (!existingUnit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found or access denied",
        });
      }

      // Process new uploaded images
      let newImageUrls = [...existingUnit.imageUrls];
      if (req.files && req.files.length > 0) {
        const uploadedImages = req.files.map((file) => file.path);
        newImageUrls = [...newImageUrls, ...uploadedImages];
      }

      // Update unit
      const unit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: {
          name: name || existingUnit.name,
          rent: rent ? parseFloat(rent) : existingUnit.rent,
          deposit:
            deposit !== undefined ? parseFloat(deposit) : existingUnit.deposit,
          size: size || existingUnit.size,
          status: status || existingUnit.status,
          imageUrls: newImageUrls,
        },
        include: {
          property: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Unit updated successfully",
        data: {
          unit,
          newImages: req.files ? req.files.map((file) => file.path) : [],
        },
      });
    } catch (error) {
      console.error("Update unit error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating unit",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Delete Unit with Image Cleanup
  deleteUnit: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if unit exists and belongs to landlord
      const unit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: {
            landlordId: req.user.id,
          },
        },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found or access denied",
        });
      }

      // TODO: Implement Cloudinary image deletion if you stored public_ids
      // if (unit.imageUrls && unit.imageUrls.length > 0) {
      //   // Extract public_ids and delete from Cloudinary
      //   const publicIds = unit.imageUrls.map(url => {
      //     // Extract public_id from Cloudinary URL
      //     const parts = url.split('/');
      //     return parts[parts.length - 1].split('.')[0];
      //   });
      //   await cloudinaryUtils.deleteMultipleImages(publicIds);
      // }

      // Delete unit
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
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Get Units (unchanged)
  getUnits: async (req, res) => {
    try {
      const units = await prisma.unit.findMany({
        where: {
          property: {
            landlordId: req.user.id,
          },
        },
        include: {
          property: {
            select: {
              name: true,
              location: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: units,
      });
    } catch (error) {
      console.error("Get units error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching units",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Get Single Unit
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

      res.json({
        success: true,
        data: unit,
      });
    } catch (error) {
      console.error("Get unit error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching unit",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Update Unit Status
  updateUnitStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["Vacant", "Occupied"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status (Vacant or Occupied) is required",
        });
      }

      const unit = await prisma.unit.findFirst({
        where: {
          id: parseInt(id),
          property: {
            landlordId: req.user.id,
          },
        },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found or access denied",
        });
      }

      const updatedUnit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: { status },
        include: {
          property: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: `Unit status updated to ${status}`,
        data: updatedUnit,
      });
    } catch (error) {
      console.error("Update unit status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating unit status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};

module.exports = unitController;
