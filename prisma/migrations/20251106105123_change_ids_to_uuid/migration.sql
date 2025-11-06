/*
  Warnings:

  - The primary key for the `admins` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `landlords` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `properties` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `referrals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `units` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "public"."properties" DROP CONSTRAINT "properties_landlord_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."referrals" DROP CONSTRAINT "referrals_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."referrals" DROP CONSTRAINT "referrals_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."units" DROP CONSTRAINT "units_property_id_fkey";

-- AlterTable
ALTER TABLE "admins" DROP CONSTRAINT "admins_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "admins_id_seq";

-- AlterTable
ALTER TABLE "landlords" DROP CONSTRAINT "landlords_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "landlords_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "landlords_id_seq";

-- AlterTable
ALTER TABLE "properties" DROP CONSTRAINT "properties_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "landlord_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "properties_id_seq";

-- AlterTable
ALTER TABLE "referrals" DROP CONSTRAINT "referrals_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "admin_id" SET DATA TYPE TEXT,
ALTER COLUMN "unit_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "referrals_id_seq";

-- AlterTable
ALTER TABLE "units" DROP CONSTRAINT "units_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "property_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "units_id_seq";

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "landlords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
