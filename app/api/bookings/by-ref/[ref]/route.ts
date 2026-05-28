import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/utils/rateLimit";
import { newRequestId } from "@/lib/logger";
import { SECURITY_HEADERS } from "@/lib/utils/security";
import { BOOKING_REF_RE, toPublicBooking } from "@/lib/services/publicBooking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/bookings/by-ref/[ref] — Public.
 *
 * Returns ONLY the non-sensitive fields needed to render the confirmation page.
 * The confirmation page treats this as the source of truth for booking status,
 * so URL parameters cannot spoof a "paid" state. Invalid refs return 404 (same
 * shape as not-found) to avoid an enumeration oracle.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const requestId = newRequestId();
  const ref = params.ref ?? "";

  const ip = getClientIp(request);
  const rl = checkRateLimit(
    `booking:byref:${ip}`,
    RATE_LIMITS.BOOKING_BY_REF.limit,
    RATE_LIMITS.BOOKING_BY_REF.windowMs
  );
  if (!rl.ok) {
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      ),
      requestId,
      rateLimitHeaders(rl)
    );
  }

  // Validate format before hitting the DB; mismatches look identical to misses.
  if (!BOOKING_REF_RE.test(ref)) {
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      ),
      requestId,
      rateLimitHeaders(rl)
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: { room: true, tour: true, payment: true },
  });

  if (!booking) {
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      ),
      requestId,
      rateLimitHeaders(rl)
    );
  }

  return withHeaders(
    NextResponse.json({ success: true, data: toPublicBooking(booking) }),
    requestId,
    rateLimitHeaders(rl)
  );
}

function withHeaders(
  res: NextResponse,
  requestId: string,
  extra?: Record<string, string>
): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("x-request-id", requestId);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) res.headers.set(k, v);
  }
  return res;
}
