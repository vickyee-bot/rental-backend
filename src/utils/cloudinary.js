const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "frental",
    format: async (req, file) => "png", // supports promises as well
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      return `${file.fieldname}-${timestamp}-${random}`;
    },
    transformation: [
      { width: 800, height: 600, crop: "limit" }, // Resize images
      { quality: "auto" }, // Optimize quality
      { format: "jpg" }, // Convert to JPG for smaller size
    ],
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Multer configuration
const upload = require("multer")({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Utility functions
const cloudinaryUtils = {
  // Upload single image
  uploadImage: async (filePath) => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "frental/properties",
      });
      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Upload multiple images
  uploadMultipleImages: async (filePaths) => {
    try {
      const uploadPromises = filePaths.map((filePath) =>
        cloudinary.uploader.upload(filePath, {
          folder: "frental/properties",
        })
      );

      const results = await Promise.all(uploadPromises);

      return {
        success: true,
        images: results.map((result) => ({
          url: result.secure_url,
          public_id: result.public_id,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Delete image from Cloudinary
  deleteImage: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Delete multiple images
  deleteMultipleImages: async (publicIds) => {
    try {
      const deletePromises = publicIds.map((publicId) =>
        cloudinary.uploader.destroy(publicId)
      );

      const results = await Promise.all(deletePromises);

      return {
        success: true,
        results: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

module.exports = { upload, cloudinary, cloudinaryUtils };
