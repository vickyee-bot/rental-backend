/*
  Warnings:

  - The values [Vacant,Occupied] on the enum `UnitStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UnitStatus_new" AS ENUM ('VACANT', 'OCCUPIED');
ALTER TABLE "public"."units" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "units" ALTER COLUMN "status" TYPE "UnitStatus_new" USING ("status"::text::"UnitStatus_new");
ALTER TYPE "UnitStatus" RENAME TO "UnitStatus_old";
ALTER TYPE "UnitStatus_new" RENAME TO "UnitStatus";
DROP TYPE "public"."UnitStatus_old";
ALTER TABLE "units" ALTER COLUMN "status" SET DEFAULT 'VACANT';
COMMIT;

-- AlterTable
ALTER TABLE "units" ALTER COLUMN "status" SET DEFAULT 'VACANT';
