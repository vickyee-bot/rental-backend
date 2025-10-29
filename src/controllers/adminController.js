const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const adminController = {
  // Admin dashboard stats
  getDashboard: async (req, res) => {
    try {
      const [
        totalLandlords,
        totalProperties,
        totalUnits,
        vacantUnits,
        occupiedUnits,
        recentReferrals,
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
      ]);

      res.json({
        success: true,
        data: {
          stats: {
            totalLandlords,
            totalProperties,
            totalUnits,
            vacantUnits,
            occupiedUnits,
          },
          recentReferrals,
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

  // Get all landlords
  getLandlords: async (req, res) => {
    try {
      const { search } = req.query;

      const where = search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { phoneNumber: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const landlords = await prisma.landlord.findMany({
        where,
        include: {
          properties: {
            include: {
              _count: {
                select: { units: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: landlords,
      });
    } catch (error) {
      console.error("Get landlords error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching landlords",
      });
    }
  },

  // Get all properties
  getProperties: async (req, res) => {
    try {
      const { search, status } = req.query;

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

      const properties = await prisma.property.findMany({
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
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Filter by unit status if provided
      let filteredProperties = properties;
      if (status) {
        filteredProperties = properties.filter((property) =>
          property.units.some((unit) => unit.status === status)
        );
      }

      res.json({
        success: true,
        data: filteredProperties,
      });
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching properties",
      });
    }
  },

  // Get vacant units for client referral
  getVacantUnits: async (req, res) => {
    try {
      const { search, maxRent } = req.query;

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
          {
            property: {
              location: { contains: search, mode: "insensitive" },
            },
          },
        ];
      }

      if (maxRent) {
        where.rent = { lte: parseFloat(maxRent) };
      }

      const vacantUnits = await prisma.unit.findMany({
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
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: vacantUnits,
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
      const { status } = req.query;

      const where = status ? { status } : {};

      const referrals = await prisma.referral.findMany({
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
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: referrals,
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
