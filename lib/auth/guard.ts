import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth";
import { AuthError, ForbiddenError } from "@/lib/errors";

export interface AdminSessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

/**
 * Throws AuthError if not authenticated. Returns the admin user.
 */
export async function requireAdmin(): Promise<AdminSessionUser> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new AuthError("Authentication required");
  }
  const user = session.user as any;
  const role = String(user.role ?? "").toUpperCase();
  // Accept both new Prisma enum values and legacy strings for backward compat.
  const allowed = new Set([
    "SUPERADMIN",
    "STAFF",
    "ADMIN",
    "MANAGER",
  ]);
  if (!role || !allowed.has(role)) {
    throw new ForbiddenError("Admin access required");
  }
  return {
    id: user.id ?? "",
    email: user.email ?? "",
    name: user.name ?? null,
    role,
  };
}

/**
 * Throws ForbiddenError if the caller is not a SUPERADMIN.
 */
export async function requireSuperAdmin(): Promise<AdminSessionUser> {
  const user = await requireAdmin();
  if (user.role !== "SUPERADMIN") {
    throw new ForbiddenError("Superadmin access required");
  }
  return user;
}

/**
 * Returns the session user or null (no throw).
 */
export async function getAdmin(): Promise<AdminSessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;
  const user = session.user as any;
  return {
    id: user.id ?? "",
    email: user.email ?? "",
    name: user.name ?? null,
    role: user.role ?? "admin",
  };
}
