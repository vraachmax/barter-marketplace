-- CreateEnum
CREATE TYPE "MessageMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaType" "MessageMediaType",
ADD COLUMN     "mediaUrl" TEXT;
