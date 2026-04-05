-- CreateEnum
CREATE TYPE "AppTheme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appTheme" "AppTheme" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
