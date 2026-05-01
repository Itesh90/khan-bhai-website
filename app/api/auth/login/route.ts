import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/db/client";
import { successResponse } from "@/lib/api-response";
import {
  handleApiError,
  AuthError,
  RateLimitError,
} from "@/lib/errors";
import { adminLoginSchema } from "@/lib/schemas/contactSchema";
import { validate } from "@/lib/services/validationService";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  resetRateLimit,
  RATE_LIMITS,
} from "@/lib/utils/rateLimit";
import { logger, newRequestId } from "@/lib/logger";

/**
 * POST /api/auth/login
 *
 * Lightweight server-side credentials check (e.g. for native clients).
 * The browser session is established via NextAuth's signIn flow at
 * `/api/auth/callback/credentials`. We apply the same rate limits here
 * so this endpoint cannot be used as a brute-force bypass.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { email, password } = validate(adminLoginSchema, body);

    const ipKey = `auth:login:ip:${ip}`;
    const emailKey = `auth:login:email:${email}`;

    const ipRl = checkRateLimit(
      ipKey,
      RATE_LIMITS.AUTH_LOGIN_IP.limit,
      RATE_LIMITS.AUTH_LOGIN_IP.windowMs
    );
    const emailRl = checkRateLimit(
      emailKey,
      RATE_LIMITS.AUTH_LOGIN_EMAIL.limit,
      RATE_LIMITS.AUTH_LOGIN_EMAIL.windowMs
    );

    if (!ipRl.ok || !emailRl.ok) {
      const limiting = !ipRl.ok ? ipRl : emailRl;
      logger.warn("auth.login_api_rate_limited", { email, ip, requestId });
      const err = new RateLimitError(
        "Too many login attempts. Please wait a few minutes and try again.",
        { retryAfterSeconds: limiting.retryAfterSeconds }
      );
      const res = handleApiError(err, {
        requestId,
        route: "POST /api/auth/login",
      });
      for (const [k, v] of Object.entries(rateLimitHeaders(limiting))) {
        res.headers.set(k, v);
      }
      return res;
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      logger.info("auth.login_failed", {
        email,
        ip,
        requestId,
        reason: "user_not_found",
      });
      throw new AuthError("Invalid email or password");
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      logger.info("auth.login_failed", {
        email,
        ip,
        requestId,
        reason: "bad_password",
      });
      throw new AuthError("Invalid email or password");
    }

    resetRateLimit(ipKey);
    resetRateLimit(emailKey);

    await prisma.admin
      .update({ where: { id: admin.id }, data: { last_login: new Date() } })
      .catch((err) =>
        logger.warn("auth.last_login_update_failed", { err, requestId })
      );

    logger.info("auth.login_success", {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      ip,
      requestId,
    });

    return successResponse(
      {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      { message: "Login successful", requestId }
    );
  } catch (error) {
    return handleApiError(error, { requestId, route: "POST /api/auth/login" });
  }
}
