const { PrismaClient } = require("@prisma/client");
const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");

const prisma = new PrismaClient();

const authController = {
  // Landlord Registration
  registerLandlord: async (req, res) => {
    try {
      const { fullName, phoneNumber, email, password } = req.body;

      // Check if landlord exists
      const existingLandlord = await prisma.landlord.findUnique({
        where: { phoneNumber },
      });

      if (existingLandlord) {
        return res.status(400).json({
          success: false,
          message: "Landlord with this phone number already exists",
        });
      }

      // Hash password and create landlord
      const passwordHash = await hashPassword(password);

      const landlord = await prisma.landlord.create({
        data: {
          fullName,
          phoneNumber,
          email,
          passwordHash,
        },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          createdAt: true,
        },
      });

      const token = generateToken(landlord.id, "landlord");

      res.status(201).json({
        success: true,
        message: "Landlord registered successfully",
        data: { landlord, token },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Error registering landlord",
        error: error.message,
      });
    }
  },

  // Landlord Login
  loginLandlord: async (req, res) => {
    try {
      const { phoneNumber, password } = req.body;

      const landlord = await prisma.landlord.findUnique({
        where: { phoneNumber },
      });

      if (
        !landlord ||
        !(await comparePassword(password, landlord.passwordHash))
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid phone number or password",
        });
      }

      const token = generateToken(landlord.id, "landlord");

      res.json({
        success: true,
        message: "Login successful",
        data: {
          landlord: {
            id: landlord.id,
            fullName: landlord.fullName,
            phoneNumber: landlord.phoneNumber,
            email: landlord.email,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Error during login",
        error: error.message,
      });
    }
  },

  // Admin Login
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;

      const admin = await prisma.admin.findUnique({
        where: { email },
      });

      if (!admin || !(await comparePassword(password, admin.passwordHash))) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = generateToken(admin.id, "admin");

      res.json({
        success: true,
        message: "Admin login successful",
        data: {
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        message: "Error during admin login",
        error: error.message,
      });
    }
  },
};

module.exports = authController;
