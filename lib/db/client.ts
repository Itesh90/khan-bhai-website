/**
 * Prisma client singleton — Khan Bhai S.
 *
 * Prevents multiple PrismaClient instances from being created in development
 * due to Next.js hot-reload (which re-evaluates modules on every save).
 *
 * In production a single instance is created per server process.
 */

import { PrismaClient } from "@prisma/client";

// Extend the Node.js global type so TypeScript knows about our cached instance.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
    errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "minimal",
  });

  // Validate that DATABASE_URL is set at startup to surface misconfigurations
  // early — before the first actual query hits the database.
  if (!process.env.DATABASE_URL) {
    console.error(
      "[db/client] ⚠️  DATABASE_URL environment variable is not set. " +
        "Database queries will fail. Set it in your .env.local file."
    );
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Verify that the database connection is healthy.
 * Call this from a health-check API route or startup logic.
 *
 * @returns true if the connection is healthy, false otherwise.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[db/client] Database connection check failed:", error);
    return false;
  }
}
