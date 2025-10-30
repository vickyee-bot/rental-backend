/*
  Warnings:

  - You are about to drop the column `bathrooms` on the `units` table. All the data in the column will be lost.
  - You are about to drop the column `bedrooms` on the `units` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `units` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "units" DROP COLUMN "bathrooms",
DROP COLUMN "bedrooms",
DROP COLUMN "image_url",
ADD COLUMN     "image_urls" TEXT[];
