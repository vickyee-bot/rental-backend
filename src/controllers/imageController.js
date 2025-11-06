const { PrismaClient } = require("@prisma/client");
const { cloudinaryUtils } = require("../utils/cloudinary");

const prisma = new PrismaClient();

const imageController = {
  // Delete specific image from unit
  deleteUnitImage: async (req, res) => {
    try {
      const { unitId, imageUrl } = req.body;

      const unit = await prisma.unit.findFirst({
        where: {
          id: unitId, // UUID string (no parseInt needed)
          property: {
            landlordId: req.user.id,
          },
        },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found or access denied",
        });
      }

      // Remove image from unit's imageUrls
      const updatedImageUrls = unit.imageUrls.filter((url) => url !== imageUrl);

      await prisma.unit.update({
        where: { id: unitId }, // UUID string
        data: { imageUrls: updatedImageUrls },
      });

      // TODO: Delete from Cloudinary if you have public_id
      // const publicId = extractPublicId(imageUrl);
      // await cloudinaryUtils.deleteImage(publicId);

      res.json({
        success: true,
        message: "Image removed successfully",
      });
    } catch (error) {
      console.error("Delete image error:", error);
      res.status(500).json({
        success: false,
        message: "Error removing image",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Upload additional images to unit
  addUnitImages: async (req, res) => {
    try {
      const { unitId } = req.body;

      const unit = await prisma.unit.findFirst({
        where: {
          id: unitId, // UUID string (no parseInt needed)
          property: {
            landlordId: req.user.id,
          },
        },
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: "Unit not found or access denied",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No images provided",
        });
      }

      const newImageUrls = req.files.map((file) => file.path);
      const updatedImageUrls = [...unit.imageUrls, ...newImageUrls];

      const updatedUnit = await prisma.unit.update({
        where: { id: unitId }, // UUID string
        data: { imageUrls: updatedImageUrls },
        include: {
          property: {
            select: {
              name: true,
              location: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Images added successfully",
        data: {
          unit: updatedUnit,
          newImages: newImageUrls,
        },
      });
    } catch (error) {
      console.error("Add images error:", error);
      res.status(500).json({
        success: false,
        message: "Error adding images",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};

module.exports = imageController;
