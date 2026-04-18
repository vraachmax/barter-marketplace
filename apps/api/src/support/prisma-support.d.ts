/**
 * Временный shim до локальной генерации Prisma Client на Linux в sandbox.
 * Миграция SupportTemplate / SupportTicket + поля User.sellerAutoReply* уже есть
 * в `apps/api/prisma/migrations/20260418210000_support_templates_tickets/migration.sql`.
 * На реальном CI/прод-сборке `prisma generate` сгенерирует эти же типы,
 * и этот shim станет no-op merge.
 */

declare module '@prisma/client' {
  // ── Новые enum-ы ──
  const SupportTemplateCategory: {
    readonly QUICK_REPLY_BUYER: 'QUICK_REPLY_BUYER';
    readonly QUICK_REPLY_SELLER: 'QUICK_REPLY_SELLER';
    readonly FAQ: 'FAQ';
    readonly SUPPORT_REPLY: 'SUPPORT_REPLY';
    readonly AUTO_REPLY_SELLER: 'AUTO_REPLY_SELLER';
  };
  type SupportTemplateCategory =
    | 'QUICK_REPLY_BUYER'
    | 'QUICK_REPLY_SELLER'
    | 'FAQ'
    | 'SUPPORT_REPLY'
    | 'AUTO_REPLY_SELLER';

  const SupportTicketStatus: {
    readonly OPEN: 'OPEN';
    readonly IN_PROGRESS: 'IN_PROGRESS';
    readonly CLOSED: 'CLOSED';
  };
  type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

  interface PrismaClient {
    supportTemplate: {
      findMany(args?: any): Promise<any[]>;
      findUnique(args: any): Promise<any>;
      findFirst(args?: any): Promise<any>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
      upsert(args: any): Promise<any>;
      delete(args: any): Promise<any>;
      deleteMany(args?: any): Promise<any>;
      updateMany(args: any): Promise<any>;
      count(args?: any): Promise<number>;
    };
    supportTicket: {
      findMany(args?: any): Promise<any[]>;
      findUnique(args: any): Promise<any>;
      findFirst(args?: any): Promise<any>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
      upsert(args: any): Promise<any>;
      delete(args: any): Promise<any>;
      deleteMany(args?: any): Promise<any>;
      updateMany(args: any): Promise<any>;
      count(args?: any): Promise<number>;
    };
  }

  namespace Prisma {
    interface UserUpdateInput {
      sellerAutoReplyEnabled?: boolean;
      sellerAutoReplyText?: string | null;
    }
    interface UserSelect {
      sellerAutoReplyEnabled?: boolean;
      sellerAutoReplyText?: boolean;
    }
  }
}

export {};
