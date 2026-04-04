-- AlterTable
ALTER TABLE "User" ADD COLUMN     "showEmailPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showPhonePublic" BOOLEAN NOT NULL DEFAULT false;
