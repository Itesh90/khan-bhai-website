/**
 * Database utilities — Khan Bhai S.
 *
 * Shared helpers used by Prisma-based service layers to build queries,
 * handle pagination, and format errors consistently.
 */

import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  skip: number;
  take: number;
}

/**
 * Convert a 1-based page + limit into Prisma skip/take values.
 *
 * @param page  - 1-based page number (default 1)
 * @param limit - items per page (default 20, max 100)
 */
export function getPaginationParams(
  page: number = 1,
  limit: number = 20
): PaginationParams {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Build a pagination metadata object for API responses.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
    hasNextPage: safePage * safeLimit < total,
    hasPrevPage: safePage > 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Where clause builder
// ─────────────────────────────────────────────────────────────────────────────

type FilterValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | string[]
  | number[];

interface Filters {
  [key: string]: FilterValue;
}

/**
 * Convert a flat filter object into a Prisma `where` clause.
 *
 * Supported patterns:
 *   { available: true }              → { available: true }
 *   { status: "pending" }           → { status: "pending" }
 *   { status: ["pending", "paid"] } → { status: { in: ["pending", "paid"] } }
 *   { priceMax: 5000 }              → ignored (use dedicated builder)
 *   undefined / null values         → key is omitted
 *
 * For complex filters (range queries, full-text search) build them manually
 * or use the specialised helpers below.
 */
export function buildWhereClause(filters: Filters): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value) && value.length > 0) {
      where[key] = { in: value };
    } else {
      where[key] = value;
    }
  }

  return where;
}

/**
 * Build a date range filter for Prisma.
 *
 * @param field - the model field name (e.g. "createdAt")
 * @param from  - start date (inclusive)
 * @param to    - end date (inclusive)
 */
export function buildDateRangeFilter(
  field: string,
  from?: Date,
  to?: Date
): Record<string, unknown> {
  if (!from && !to) return {};

  const filter: { gte?: Date; lte?: Date } = {};
  if (from) filter.gte = from;
  if (to) filter.lte = to;

  return { [field]: filter };
}

/**
 * Build a string contains / insensitive search filter.
 */
export function buildSearchFilter(
  field: string,
  term?: string
): Record<string, unknown> {
  if (!term) return {};
  return { [field]: { contains: term, mode: "insensitive" } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a Prisma client error to a human-readable message.
 *
 * Error codes: https://www.prisma.io/docs/orm/reference/error-reference
 */
export function formatPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation
        const fields = Array.isArray(error.meta?.target)
          ? (error.meta.target as string[]).join(", ")
          : "field";
        return `A record with this ${fields} already exists.`;
      }
      case "P2003": {
        const field = (error.meta?.field_name as string) ?? "related record";
        return `Foreign key constraint failed on field: ${field}.`;
      }
      case "P2025":
        return "Record not found.";
      case "P2014":
        return "The operation would violate a required relation.";
      case "P2016":
        return "Query interpretation error — check the input data.";
      case "P2021": {
        const table = (error.meta?.table as string) ?? "unknown";
        return `Table '${table}' does not exist in the database.`;
      }
      case "P2022": {
        const col = (error.meta?.column as string) ?? "unknown";
        return `Column '${col}' does not exist in the database.`;
      }
      default:
        return `Database error (${error.code}): ${error.message}`;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid data provided to database query.";
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Failed to connect to the database. Please check your connection settings.";
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return "A critical database engine error occurred. Please contact support.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown database error occurred.";
}

/**
 * Returns true if the Prisma error is a unique constraint violation (P2002).
 */
export function isUniqueConstraintError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Returns true if the Prisma error is a "record not found" error (P2025).
 */
export function isNotFoundError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}
