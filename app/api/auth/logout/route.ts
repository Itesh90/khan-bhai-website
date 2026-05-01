import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { newRequestId, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 *
 * Session cookies are managed by NextAuth — browser clients should call
 * /api/auth/signout for full sign-out. This endpoint clears the session
 * cookies as a fallback (e.g. for native clients).
 */
export async function POST() {
  const requestId = newRequestId();
  try {
    const res = successResponse(
      { ok: true },
      { message: "Logged out", requestId }
    );
    // Clear known NextAuth cookies (covers http and https variants)
    const cookiesToClear = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
      "__Secure-next-auth.callback-url",
    ];
    for (const name of cookiesToClear) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    logger.info("auth.logout", { requestId });
    return res;
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "POST /api/auth/logout",
    });
  }
}
