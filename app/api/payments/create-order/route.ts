import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError, RateLimitError } from "@/lib/errors";
import { createOrderSchema } from "@/lib/schemas/paymentSchema";
import { createOrderForBooking } from "@/lib/services/paymentService";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/utils/rateLimit";
import { logger, newRequestId } from "@/lib/logger";

/**
 * POST /api/payments/create-order — Public.
 * Create a Razorpay order for an existing booking.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const pathname = request.nextUrl?.pathname ?? "";
  if (pathname.startsWith("/api/payment/")) {
    logger.warn("payments.legacy_route_hit", { path: pathname, requestId });
  }
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(
      `pay:create:${ip}`,
      RATE_LIMITS.PAYMENT_CREATE.limit,
      RATE_LIMITS.PAYMENT_CREATE.windowMs
    );
    if (!rl.ok) {
      logger.warn("payments.create.rate_limited", { ip, requestId });
      const res = handleApiError(
        new RateLimitError(
          "Too many payment attempts. Please try again later."
        ),
        { requestId, route: "POST /api/payments/create-order" }
      );
      for (const [k, v] of Object.entries(rateLimitHeaders(rl))) {
        res.headers.set(k, v);
      }
      return res;
    }

    const body = await request.json();
    const input = createOrderSchema.parse(body);

    const result = await createOrderForBooking({
      bookingId: input.booking_id,
      expectedAmount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      requestId,
    });

    return successResponse(
      {
        orderId: result.orderId,
        amount: result.amount, // paise
        currency: result.currency,
        key: result.key,
        bookingId: result.bookingId,
        bookingRef: result.bookingRef,
        receipt: result.receipt,
      },
      {
        status: 201,
        message: "Order created",
        requestId,
        headers: rateLimitHeaders(rl),
      }
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "POST /api/payments/create-order",
    });
  }
}
