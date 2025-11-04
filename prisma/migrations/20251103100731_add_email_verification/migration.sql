/*
  Warnings:

  - You are about to drop the column `created_at` on the `landlords` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `landlords` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `landlords` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `landlords` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `landlords` table. All the data in the column will be lost.
  - You are about to drop the column `amenities` on the `units` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phoneNumber]` on the table `landlords` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `landlords` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `landlords` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `landlords` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `landlords` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."landlords_phone_number_key";

-- AlterTable
ALTER TABLE "landlords" DROP COLUMN "created_at",
DROP COLUMN "full_name",
DROP COLUMN "password_hash",
DROP COLUMN "phone_number",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "resetExpires" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verifyExpires" TIMESTAMP(3),
ADD COLUMN     "verifyToken" TEXT;

-- AlterTable
ALTER TABLE "units" DROP COLUMN "amenities";

-- CreateIndex
CREATE UNIQUE INDEX "landlords_phoneNumber_key" ON "landlords"("phoneNumber");
