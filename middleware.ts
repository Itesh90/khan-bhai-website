import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Khan Bhai S. — Edge Middleware.
 *
 * Responsibilities:
 *   1. Guard `/admin/*` page routes (redirect to login if not authed).
 *   2. Guard `/api/admin/*` routes (return 401 JSON).
 *   3. Apply baseline security headers to ALL responses.
 *
 * NOTE: NextAuth role values from the Prisma schema are uppercase
 * (`SUPERADMIN`, `STAFF`). We accept the legacy values (`ADMIN`, `MANAGER`)
 * for backward compat with any tokens issued before the schema upgrade.
 */

const ADMIN_ROLES = new Set(["SUPERADMIN", "STAFF", "ADMIN", "MANAGER"]);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "off",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

function applyHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip the login page itself
  if (pathname === "/admin/login") {
    return applyHeaders(NextResponse.next());
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const role = token ? String((token as any).role ?? "").toUpperCase() : "";
  const isAuthed = Boolean(token && ADMIN_ROLES.has(role));

  // API routes — return 401 JSON
  if (pathname.startsWith("/api/admin")) {
    if (!isAuthed) {
      return applyHeaders(
        NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Authentication required",
            },
          },
          { status: 401 }
        )
      );
    }
    return applyHeaders(NextResponse.next());
  }

  // Page routes — redirect to login
  if (pathname.startsWith("/admin")) {
    if (!isAuthed) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return applyHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return applyHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
