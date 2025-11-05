// src/middleware/auth.js - This should contain your auth middleware
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token, authorization denied",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "landlord") {
      const landlord = await prisma.landlord.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          isVerified: true,
        },
      });

      if (!landlord) {
        return res.status(401).json({
          success: false,
          message: "Token is not valid",
        });
      }

      req.user = landlord;
    } else if (decoded.role === "admin") {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId },
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Token is not valid",
        });
      }

      req.admin = admin;
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token, authorization denied",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.userId },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Token is not valid",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

const requireVerifiedEmail = (req, res, next) => {
  if (req.user && !req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email to access this feature",
    });
  }
  next();
};

module.exports = { authMiddleware, adminAuth, requireVerifiedEmail };
