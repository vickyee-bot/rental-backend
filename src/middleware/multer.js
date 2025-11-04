// /middleware/multer.js

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary"); // We'll create this file next

// Cloudinary storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "rental_units", // Folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
});

// Single file upload
const uploadSingle = upload.single("image");

// Multiple images upload (max 5)
const uploadMultiple = upload.array("images", 5);

// Error handler
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Max 5MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many images. Max 5 allowed.",
      });
    }
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

module.exports = { uploadSingle, uploadMultiple, handleUploadError };
