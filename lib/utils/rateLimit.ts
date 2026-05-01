/**
 * Lightweight in-memory rate limiter — Khan Bhai S.
 *
 * Designed for low-volume endpoints (auth, payments, contact form). Uses a
 * fixed sliding window per (key, bucket). Resets on server restart.
 *
 * For production scale, swap the storage layer for Upstash/Redis. The exported
 * surface (checkRateLimit) is intentionally minimal so it can be replaced
 * without touching call sites.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/**
 * Increment-and-check the bucket for `key`.
 *
 * @param key       Unique identifier (e.g. `auth:login:ip:1.2.3.4`)
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window length in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    const bucket: Bucket = { count: 1, resetAt: now + windowMs };
    store.set(key, bucket);
    return {
      ok: true,
      limit,
      remaining: limit - 1,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Reset a specific key (e.g. on a successful login, clear the failure counter).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Standard rate-limit headers to attach to a response.
 */
export function rateLimitHeaders(rl: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000)),
    ...(rl.ok ? {} : { "Retry-After": String(rl.retryAfterSeconds) }),
  };
}

/**
 * Extract a best-effort client IP from a Next.js request. Trims/normalises
 * the first hop in the X-Forwarded-For list and falls back to X-Real-IP.
 */
export function getClientIp(req: { headers: Headers }): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Pre-baked rate-limit profiles. Pass these into checkRateLimit to avoid
 * spreading magic numbers across the codebase.
 */
export const RATE_LIMITS = {
  /** 5 login attempts per IP per 10 minutes */
  AUTH_LOGIN_IP: { limit: 5, windowMs: 10 * 60 * 1000 },
  /** 10 login attempts per email per hour */
  AUTH_LOGIN_EMAIL: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** 5 contact submissions per IP per hour */
  CONTACT_SUBMIT: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** 20 booking submissions per IP per hour */
  BOOKING_CREATE: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** 10 payment order creations per IP per hour */
  PAYMENT_CREATE: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** 5 payment verifications per IP per hour */
  PAYMENT_VERIFY: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;
