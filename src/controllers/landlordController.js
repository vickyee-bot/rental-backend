const { PrismaClient } = require("@prisma/client");
const { hashPassword, comparePassword } = require("../utils/auth");

const prisma = new PrismaClient();

const landlordController = {
  // Get landlord profile
  getProfile: async (req, res) => {
    try {
      const landlord = await prisma.landlord.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          properties: {
            include: {
              _count: {
                select: { units: true },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        data: landlord,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching profile",
      });
    }
  },

  // Update landlord profile
  updateProfile: async (req, res) => {
    try {
      const { fullName, email, phoneNumber } = req.body; // Add phoneNumber here

      // Validate required fields
      if (!fullName || !email) {
        return res.status(400).json({
          success: false,
          message: "Full name and email are required",
        });
      }

      const landlord = await prisma.landlord.update({
        where: { id: req.user.id },
        data: {
          fullName,
          email,
          phoneNumber, // Now this variable is defined
        },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: landlord,
      });
    } catch (error) {
      console.error("Update profile error:", error);

      // Provide more specific error messages
      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message: "Email or phone number already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const landlord = await prisma.landlord.findUnique({
        where: { id: req.user.id },
      });

      if (!(await comparePassword(currentPassword, landlord.passwordHash))) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      const newPasswordHash = await hashPassword(newPassword);

      await prisma.landlord.update({
        where: { id: req.user.id },
        data: { passwordHash: newPasswordHash },
      });

      res.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Error changing password",
      });
    }
  },

  // Get landlord dashboard stats
  getDashboard: async (req, res) => {
    try {
      const landlordId = req.user.id;

      const [
        totalUnits,
        vacantUnits,
        occupiedUnits,
        totalProperties,
        recentUnits,
      ] = await Promise.all([
        prisma.unit.count({
          where: {
            property: { landlordId },
          },
        }),
        prisma.unit.count({
          where: {
            property: { landlordId },
            status: "VACANT",
          },
        }),
        prisma.unit.count({
          where: {
            property: { landlordId },
            status: "OCCUPIED",
          },
        }),
        prisma.property.count({
          where: { landlordId },
        }),
        prisma.unit.findMany({
          where: {
            property: { landlordId },
          },
          include: {
            property: {
              select: { name: true },
            },
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
      ]);

      res.json({
        success: true,
        data: {
          stats: {
            totalUnits,
            vacantUnits,
            occupiedUnits,
            totalProperties,
          },
          recentUnits,
        },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard data",
      });
    }
  },
};

module.exports = landlordController;
