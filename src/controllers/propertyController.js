const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const propertyController = {
  // Get all properties for logged-in landlord with pagination
  getProperties: async (req, res) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { landlordId: req.user.id };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ];
      }

      const [properties, total] = await Promise.all([
        prisma.property.findMany({
          where,
          include: {
            units: {
              // ✅ Return ALL unit data
              select: {
                id: true,
                name: true,
                rent: true,
                deposit: true, // ✅ Added
                size: true, // ✅ Added
                status: true,
                imageUrls: true, // ✅ Added
                propertyId: true, // ✅ Added
                createdAt: true, // ✅ Added
                updatedAt: true, // ✅ Added
                // referrals: true,   // ❌ Omit referrals to avoid circular references
              },
              orderBy: { createdAt: "desc" }, // Optional: order units
            },
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.property.count({ where }),
      ]);

      // Enhance properties with stats
      const enhancedProperties = properties.map((property) => ({
        ...property,
        stats: {
          totalUnits: property.units.length,
          vacantUnits: property.units.filter((unit) => unit.status === "Vacant")
            .length,
          occupiedUnits: property.units.filter(
            (unit) => unit.status === "Occupied"
          ).length,
        },
      }));

      res.json({
        success: true,
        data: {
          properties: enhancedProperties,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching properties",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Create new property
  createProperty: async (req, res) => {
    try {
      const { name, location, waterPrice, electricityPrice } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Property name is required",
        });
      }

      const property = await prisma.property.create({
        data: {
          name,
          location: location || null,
          waterPrice: waterPrice ? parseFloat(waterPrice) : null,
          electricityPrice: electricityPrice
            ? parseFloat(electricityPrice)
            : null,
          landlordId: req.user.id,
        },
      });

      res.status(201).json({
        success: true,
        message: "Property created successfully",
        data: property,
      });
    } catch (error) {
      console.error("Create property error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating property",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Update property
  updateProperty: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, location, waterPrice, electricityPrice } = req.body;

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid property ID format",
        });
      }

      // Verify property belongs to landlord
      const existingProperty = await prisma.property.findFirst({
        where: { id, landlordId: req.user.id },
      });

      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      const property = await prisma.property.update({
        where: { id },
        data: {
          name: name || existingProperty.name,
          location:
            location !== undefined ? location : existingProperty.location,
          waterPrice:
            waterPrice !== undefined
              ? parseFloat(waterPrice)
              : existingProperty.waterPrice,
          electricityPrice:
            electricityPrice !== undefined
              ? parseFloat(electricityPrice)
              : existingProperty.electricityPrice,
        },
      });

      res.json({
        success: true,
        message: "Property updated successfully",
        data: property,
      });
    } catch (error) {
      console.error("Update property error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating property",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Delete property
  deleteProperty: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid property ID format",
        });
      }

      // Verify property belongs to landlord
      const existingProperty = await prisma.property.findFirst({
        where: { id, landlordId: req.user.id },
      });

      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      await prisma.property.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Property deleted successfully",
      });
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting property",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Get single property with detailed information
  getProperty: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid property ID format",
        });
      }

      const property = await prisma.property.findFirst({
        where: {
          id,
          landlordId: req.user.id,
        },
        include: {
          units: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      res.json({
        success: true,
        data: property,
      });
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching property",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};

module.exports = propertyController;
