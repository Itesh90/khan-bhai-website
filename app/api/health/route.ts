import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db/client";
import { SECURITY_HEADERS } from "@/lib/utils/security";
import { logger, newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health
 *
 * Liveness + readiness probe. Returns:
 *   - status: "ok" | "degraded"
 *   - checks: { database: bool, env: { ... required vars present } }
 *   - uptime, version, timestamp
 *
 * 200 → all critical checks pass
 * 503 → database is down or required env vars missing
 */

interface HealthBody {
  status: "ok" | "degraded";
  uptime: number;
  timestamp: string;
  version: string;
  checks: {
    database: boolean;
    env: Record<string, boolean>;
  };
  requestId: string;
}

const REQUIRED_ENV = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
] as const;

const OPTIONAL_ENV = [
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "EMAIL_HOST",
] as const;

export async function GET(): Promise<NextResponse<HealthBody>> {
  const requestId = newRequestId();

  const env: Record<string, boolean> = {};
  for (const k of REQUIRED_ENV) env[k] = Boolean(process.env[k]);
  for (const k of OPTIONAL_ENV) env[k] = Boolean(process.env[k]);

  const dbOk = await checkDatabaseConnection();
  const allRequired = REQUIRED_ENV.every((k) => env[k]);
  const ok = dbOk && allRequired;

  const body: HealthBody = {
    status: ok ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    checks: { database: dbOk, env },
    requestId,
  };

  if (!ok) {
    logger.warn("health.degraded", { dbOk, env, requestId });
  }

  const res = NextResponse.json(body, { status: ok ? 200 : 503 });
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("x-request-id", requestId);
  return res;
}
