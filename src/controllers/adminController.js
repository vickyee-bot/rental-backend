const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const adminController = {
  // Enhanced Admin Dashboard with more detailed stats
  getDashboard: async (req, res) => {
    try {
      const [
        totalLandlords,
        totalProperties,
        totalUnits,
        vacantUnits,
        occupiedUnits,
        recentReferrals,
        recentLandlords,
        recentProperties,
      ] = await Promise.all([
        prisma.landlord.count(),
        prisma.property.count(),
        prisma.unit.count(),
        prisma.unit.count({ where: { status: "Vacant" } }),
        prisma.unit.count({ where: { status: "Occupied" } }),
        prisma.referral.findMany({
          take: 5,
          include: {
            unit: {
              include: {
                property: {
                  select: { name: true, location: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.landlord.findMany({
          take: 5,
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            createdAt: true,
            properties: {
              include: {
                _count: {
                  select: { units: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.property.findMany({
          take: 5,
          include: {
            landlord: {
              select: {
                fullName: true,
                phoneNumber: true,
              },
            },
            units: {
              select: {
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      // Calculate occupancy rates
      const occupancyRate =
        totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      res.json({
        success: true,
        data: {
          stats: {
            totalLandlords,
            totalProperties,
            totalUnits,
            vacantUnits,
            occupiedUnits,
            occupancyRate: Math.round(occupancyRate),
          },
          recentReferrals,
          recentLandlords,
          recentProperties,
        },
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard data",
      });
    }
  },

  // Get all landlords with properties and unit counts
  getLandlords: async (req, res) => {
    try {
      const { search, page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { phoneNumber: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [landlords, total] = await Promise.all([
        prisma.landlord.findMany({
          where,
          include: {
            properties: {
              include: {
                units: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.landlord.count({ where }),
      ]);

      // Enhance landlords data with unit counts
      const enhancedLandlords = landlords.map((landlord) => {
        const totalUnits = landlord.properties.reduce(
          (sum, property) => sum + property.units.length,
          0
        );
        const vacantUnits = landlord.properties.reduce(
          (sum, property) =>
            sum +
            property.units.filter((unit) => unit.status === "Vacant").length,
          0
        );

        return {
          ...landlord,
          stats: {
            totalProperties: landlord.properties.length,
            totalUnits,
            vacantUnits,
            occupiedUnits: totalUnits - vacantUnits,
          },
        };
      });

      res.json({
        success: true,
        data: {
          landlords: enhancedLandlords,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get landlords error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching landlords",
      });
    }
  },

  // Get all properties with detailed information
  getProperties: async (req, res) => {
    try {
      const { search, status, page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          {
            landlord: {
              fullName: { contains: search, mode: "insensitive" },
            },
          },
        ];
      }

      const [properties, total] = await Promise.all([
        prisma.property.findMany({
          where,
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
            units: {
              select: {
                id: true,
                name: true,
                rent: true,
                status: true,
                amenities: true,
                imageUrls: true,
                size: true,
              },
            },
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.property.count({ where }),
      ]);

      // Filter by unit status if provided
      let filteredProperties = properties;
      if (status) {
        filteredProperties = properties.filter((property) =>
          property.units.some((unit) => unit.status === status)
        );
      }

      // Enhance properties with stats
      const enhancedProperties = filteredProperties.map((property) => {
        const totalUnits = property.units.length;
        const vacantUnits = property.units.filter(
          (unit) => unit.status === "Vacant"
        ).length;
        const occupiedUnits = totalUnits - vacantUnits;

        return {
          ...property,
          stats: {
            totalUnits,
            vacantUnits,
            occupiedUnits,
            occupancyRate:
              totalUnits > 0
                ? Math.round((occupiedUnits / totalUnits) * 100)
                : 0,
          },
        };
      });

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
      });
    }
  },

  // Get property by ID with full details
  getPropertyById: async (req, res) => {
    try {
      const { id } = req.params;

      const property = await prisma.property.findUnique({
        where: { id: parseInt(id) },
        include: {
          landlord: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              createdAt: true,
            },
          },
          units: {
            include: {
              referrals: {
                include: {
                  admin: {
                    select: {
                      username: true,
                      email: true,
                    },
                  },
                },
              },
            },
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
      });
    }
  },

  // Get vacant units for client referral with enhanced filtering
  getVacantUnits: async (req, res) => {
    try {
      const { search, maxRent, location, page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        status: "Vacant",
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          {
            property: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ];
      }

      if (maxRent) {
        where.rent = { lte: parseFloat(maxRent) };
      }

      if (location) {
        where.property = {
          location: { contains: location, mode: "insensitive" },
        };
      }

      const [vacantUnits, total] = await Promise.all([
        prisma.unit.findMany({
          where,
          include: {
            property: {
              include: {
                landlord: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                    email: true,
                  },
                },
              },
            },
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.unit.count({ where }),
      ]);

      // Convert image URLs to full URLs
      const unitsWithFullImageUrls = vacantUnits.map((unit) => ({
        ...unit,
        imageUrls: unit.imageUrls.map(
          (url) => `${req.protocol}://${req.get("host")}/uploads/${url}`
        ),
      }));

      res.json({
        success: true,
        data: {
          units: unitsWithFullImageUrls,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get vacant units error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching vacant units",
      });
    }
  },

  // Create referral
  createReferral: async (req, res) => {
    try {
      const {
        unitId,
        clientName,
        clientPhone,
        clientEmail,
        referralFee,
        notes,
      } = req.body;

      // Verify unit exists and is vacant
      const unit = await prisma.unit.findUnique({
        where: { id: parseInt(unitId) },
        include: {
          property: {
            select: {
              name: true,
              location: true,
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

      if (unit.status !== "Vacant") {
        return res.status(400).json({
          success: false,
          message: "Unit is not vacant",
        });
      }

      const referral = await prisma.referral.create({
        data: {
          adminId: req.admin.id,
          unitId: parseInt(unitId),
          clientName,
          clientPhone,
          clientEmail,
          referralFee: referralFee ? parseFloat(referralFee) : null,
          notes,
        },
        include: {
          unit: {
            include: {
              property: {
                select: { name: true, location: true },
              },
            },
          },
          admin: {
            select: {
              username: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Referral created successfully",
        data: referral,
      });
    } catch (error) {
      console.error("Create referral error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating referral",
      });
    }
  },

  // Get all referrals
  getReferrals: async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = status ? { status } : {};

      const [referrals, total] = await Promise.all([
        prisma.referral.findMany({
          where,
          include: {
            unit: {
              include: {
                property: {
                  select: { name: true, location: true },
                },
              },
            },
            admin: {
              select: { username: true, email: true },
            },
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.referral.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          referrals,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
            itemsPerPage: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get referrals error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching referrals",
      });
    }
  },

  // Update referral status
  updateReferralStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["Pending", "Completed", "Cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const referral = await prisma.referral.update({
        where: { id: parseInt(id) },
        data: { status },
        include: {
          unit: {
            include: {
              property: {
                select: { name: true, location: true },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        message: `Referral status updated to ${status}`,
        data: referral,
      });
    } catch (error) {
      console.error("Update referral error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating referral",
      });
    }
  },
};

module.exports = adminController;
