import { NextRequest } from "next/server";
import { successResponse, buildPagination } from "@/lib/api-response";
import { handleApiError, RateLimitError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import {
  validateBooking,
  validateBookingsQuery,
  searchParamsToObject,
} from "@/lib/services/validationService";
import { createBooking, getBookings } from "@/lib/services/bookingService";
import {
  sendAdminNotification,
  sendBookingConfirmation,
} from "@/lib/services/emailService";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/utils/rateLimit";
import { newRequestId, logger } from "@/lib/logger";

/**
 * GET /api/bookings — Admin only. List bookings with filters and pagination.
 */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const filters = validateBookingsQuery(
      searchParamsToObject(request.nextUrl.searchParams)
    );
    const { items, total } = await getBookings(filters);
    return successResponse(items, {
      pagination: buildPagination(total, filters.limit, filters.offset),
      requestId,
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "GET /api/bookings" });
  }
}

/**
 * POST /api/bookings — Public. Create a new booking.
 *
 * Rate-limited per IP to deter scraping/bots that submit fake bookings.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(
      `bookings:create:${ip}`,
      RATE_LIMITS.BOOKING_CREATE.limit,
      RATE_LIMITS.BOOKING_CREATE.windowMs
    );
    if (!rl.ok) {
      logger.warn("booking.rate_limited", { ip, requestId });
      const res = handleApiError(
        new RateLimitError(
          "Too many booking attempts. Please try again later."
        ),
        { requestId, route: "POST /api/bookings" }
      );
      for (const [k, v] of Object.entries(rateLimitHeaders(rl))) {
        res.headers.set(k, v);
      }
      return res;
    }

    const body = await request.json();
    const input = validateBooking(body);
    const booking = await createBooking(input);

    // Fire-and-forget notifications — failures must not block the response.
    void sendBookingConfirmation(booking);
    void sendAdminNotification(booking);

    return successResponse(
      {
        booking_id: booking.id,
        booking_ref: booking.bookingRef,
        amount: booking.totalPrice,
        status: booking.status,
        booking,
      },
      {
        status: 201,
        message: "Booking created",
        requestId,
        headers: rateLimitHeaders(rl),
      }
    );
  } catch (error) {
    return handleApiError(error, { requestId, route: "POST /api/bookings" });
  }
}
