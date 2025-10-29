const { PrismaClient } = require("@prisma/client");

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

      res.json({
        success: true,
        data: units,
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

      res.json({
        success: true,
        data: unit,
      });
    } catch (error) {
      console.error("Get unit error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching unit",
      });
    }
  },

  // Create new unit
  createUnit: async (req, res) => {
    try {
      const {
        propertyId,
        name,
        rent,
        deposit,
        size,
        bedrooms,
        bathrooms,
        amenities,
        imageUrl,
      } = req.body;

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

      const unit = await prisma.unit.create({
        data: {
          propertyId: parseInt(propertyId),
          name,
          rent: parseFloat(rent),
          deposit: deposit ? parseFloat(deposit) : null,
          size,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseInt(bathrooms) : null,
          amenities: amenities || [],
          imageUrl,
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
      });
    }
  },

  // Update unit
  updateUnit: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        rent,
        deposit,
        size,
        bedrooms,
        bathrooms,
        amenities,
        imageUrl,
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

      const unit = await prisma.unit.update({
        where: { id: parseInt(id) },
        data: {
          name,
          rent: rent ? parseFloat(rent) : undefined,
          deposit: deposit ? parseFloat(deposit) : undefined,
          size,
          bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
          bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
          amenities: amenities || undefined,
          imageUrl,
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
