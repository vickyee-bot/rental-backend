const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const propertyController = {
  // Get all properties for logged-in landlord
  getProperties: async (req, res) => {
    try {
      const properties = await prisma.property.findMany({
        where: { landlordId: req.user.id },
        include: {
          units: {
            select: {
              id: true,
              name: true,
              rent: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: properties,
      });
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching properties",
      });
    }
  },

  // Create new property
  createProperty: async (req, res) => {
    try {
      const { name, location, waterPrice, electricityPrice } = req.body;

      const property = await prisma.property.create({
        data: {
          name,
          location,
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
      });
    }
  },

  // Update property
  updateProperty: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, location, waterPrice, electricityPrice } = req.body;

      // Verify property belongs to landlord
      const existingProperty = await prisma.property.findFirst({
        where: { id: parseInt(id), landlordId: req.user.id },
      });

      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      const property = await prisma.property.update({
        where: { id: parseInt(id) },
        data: {
          name,
          location,
          waterPrice: waterPrice ? parseFloat(waterPrice) : null,
          electricityPrice: electricityPrice
            ? parseFloat(electricityPrice)
            : null,
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
      });
    }
  },

  // Delete property
  deleteProperty: async (req, res) => {
    try {
      const { id } = req.params;

      // Verify property belongs to landlord
      const existingProperty = await prisma.property.findFirst({
        where: { id: parseInt(id), landlordId: req.user.id },
      });

      if (!existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found",
        });
      }

      await prisma.property.delete({
        where: { id: parseInt(id) },
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
      });
    }
  },
};

module.exports = propertyController;
