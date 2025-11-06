const { PrismaClient } = require("@prisma/client");
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

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(propertyId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid property ID format",
        });
      }

      // Check if property exists and belongs to landlord
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
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
        imageUrls = req.files.map((file) => file.path);
      }

      // Create unit
      const unit = await prisma.unit.create({
        data: {
          name,
          rent: parseFloat(rent),
          deposit: deposit ? parseFloat(deposit) : null,
          size: size || null,
          status,
          imageUrls,
          propertyId,
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

      res.status(201).json({
        success: true,
        message: "Unit created successfully",
        data: unit,
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

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid unit ID format",
        });
      }

      // Check if unit exists and belongs to landlord
      const existingUnit = await prisma.unit.findFirst({
        where: {
          id,
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
        where: { id },
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
        data: unit,
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

  // Delete Unit
  deleteUnit: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid unit ID format",
        });
      }

      // Check if unit exists and belongs to landlord
      const unit = await prisma.unit.findFirst({
        where: {
          id,
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

      await prisma.unit.delete({
        where: { id },
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

  // Get Units with Pagination
  getUnits: async (req, res) => {
    try {
      const { page = 1, limit = 10, propertyId, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        property: {
          landlordId: req.user.id,
        },
      };

      // Add filters if provided
      if (propertyId) {
        where.propertyId = propertyId;
      }
      if (status) {
        where.status = status;
      }

      const [units, total] = await Promise.all([
        prisma.unit.findMany({
          where,
          include: {
            property: {
              select: {
                name: true,
                location: true,
              },
            },
          },
          skip,
          take: parseInt(limit),
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.unit.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          units,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
          },
        },
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

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid unit ID format",
        });
      }

      const unit = await prisma.unit.findFirst({
        where: {
          id,
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

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid unit ID format",
        });
      }

      if (!status || !["Vacant", "Occupied"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status (Vacant or Occupied) is required",
        });
      }

      const unit = await prisma.unit.findFirst({
        where: {
          id,
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
        where: { id },
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
