-- Phase 3.1 — Бот поддержки + быстрые ответы:
--   SupportTemplate (FAQ / quick-replies / auto-replies),
--   SupportTicket  (обращения пользователей в поддержку)
--   User.sellerAutoReplyEnabled + sellerAutoReplyText

-- ===================== Enums =====================
CREATE TYPE "SupportTemplateCategory" AS ENUM (
    'QUICK_REPLY_BUYER',
    'QUICK_REPLY_SELLER',
    'FAQ',
    'SUPPORT_REPLY',
    'AUTO_REPLY_SELLER'
);

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- ===================== SupportTemplate =====================
CREATE TABLE "SupportTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "category" "SupportTemplateCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SupportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportTemplate_code_key" ON "SupportTemplate"("code");
CREATE INDEX "SupportTemplate_category_isActive_idx" ON "SupportTemplate"("category", "isActive");
CREATE INDEX "SupportTemplate_sortOrder_idx" ON "SupportTemplate"("sortOrder");

-- ===================== SupportTicket =====================
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "contact" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "adminReply" TEXT,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

ALTER TABLE "SupportTicket"
    ADD CONSTRAINT "SupportTicket_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===================== User.sellerAutoReply* =====================
ALTER TABLE "User"
    ADD COLUMN "sellerAutoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "sellerAutoReplyText" TEXT;
