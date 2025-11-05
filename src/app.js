const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const landlordRoutes = require("./routes/landlords");
const propertyRoutes = require("./routes/properties");
const unitRoutes = require("./routes/units");
const adminRoutes = require("./routes/admin");
const imageRoutes = require("./routes/images");

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "https://your-frontend-domain.com",
      "https://your-mobile-app.com",
      "http://localhost:5432", // For local development
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/landlords", landlordRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/images", imageRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "FRENTAL API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Documentation
app.get("/api", (req, res) => {
  res.json({
    message: "FRENTAL API Documentation",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      landlords: "/api/landlords",
      properties: "/api/properties",
      units: "/api/units",
      admin: "/api/admin",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
