/**
 * Database client — Khan Bhai S.
 *
 * Re-exports the singleton Prisma client from lib/db/client.ts so that
 * any module can import from either path:
 *
 *   import { prisma } from "@/lib/db";          // short form
 *   import { prisma } from "@/lib/db/client";   // explicit form
 *
 * Also re-exports Prisma-generated types for convenience.
 */

export { prisma } from "@/lib/db/client";

// Re-export commonly used Prisma types so consumers don't need to import
// directly from @prisma/client everywhere.
export type {
  Admin,
  Room,
  Tour,
  Booking,
  Payment,
  ContactInquiry,
} from "@prisma/client";

export {
  AdminRole,
  BookingType,
  BookingStatus,
  PaymentStatus,
  ContactType,
} from "@prisma/client";
