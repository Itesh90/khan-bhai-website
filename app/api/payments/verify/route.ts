import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import {
  handleApiError,
  ValidationError,
  RateLimitError,
} from "@/lib/errors";
import { verifyPaymentSchema } from "@/lib/schemas/paymentSchema";
import { verifyPayment, confirmPayment } from "@/lib/services/paymentService";
import { redactId } from "@/lib/payments/razorpay";
import { recordPaymentEvent } from "@/lib/payments/auditLog";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/utils/rateLimit";
import { logger, newRequestId } from "@/lib/logger";

/**
 * POST /api/payments/verify — Public.
 *
 * Verifies the Razorpay payment signature, then transitions the payment +
 * booking state machine and sends notifications. Idempotent — repeated calls
 * for the same razorpay_payment_id are safe.
 *
 * Security:
 *   - HMAC-SHA256 signature verification with crypto.timingSafeEqual.
 *   - Server-side cross-check by fetching the payment from Razorpay.
 *   - Amount-tampering detection (amount on file vs Razorpay payment.amount).
 *   - No raw signatures, secrets, or full ids in logs (redactId helper).
 *   - Rate-limited per IP (5 attempts / hour by default) to slow brute force.
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
      `pay:verify:${ip}`,
      RATE_LIMITS.PAYMENT_VERIFY.limit,
      RATE_LIMITS.PAYMENT_VERIFY.windowMs
    );
    if (!rl.ok) {
      logger.warn("payments.verify.rate_limited", { ip, requestId });
      const res = handleApiError(
        new RateLimitError(
          "Too many verification attempts. Please try again later."
        ),
        { requestId, route: "POST /api/payments/verify" }
      );
      for (const [k, v] of Object.entries(rateLimitHeaders(rl))) {
        res.headers.set(k, v);
      }
      return res;
    }

    const body = await request.json();
    const input = verifyPaymentSchema.parse(body);

    await recordPaymentEvent({
      kind: "VERIFY_ATTEMPTED",
      bookingId: input.booking_id,
      payload: {
        orderId: input.razorpay_order_id,
        paymentId: input.razorpay_payment_id,
      },
      processed: false,
      requestId,
    });

    const ok = verifyPayment(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature
    );

    if (!ok) {
      // Do not leak signature details to the client; log redacted server-side.
      logger.warn("payments.verify.signature_mismatch", {
        requestId,
        orderId: redactId(input.razorpay_order_id),
        paymentId: redactId(input.razorpay_payment_id),
      });
      await recordPaymentEvent({
        kind: "VERIFY_FAILED",
        bookingId: input.booking_id,
        payload: {
          orderId: input.razorpay_order_id,
          paymentId: input.razorpay_payment_id,
        },
        processed: true,
        error: "signature_mismatch",
        requestId,
      });
      throw new ValidationError("Payment verification failed");
    }

    const { booking, payment, alreadyCaptured } = await confirmPayment({
      bookingId: input.booking_id,
      razorpayOrderId: input.razorpay_order_id,
      razorpayPaymentId: input.razorpay_payment_id,
      razorpaySignature: input.razorpay_signature,
      requestId,
    });

    return successResponse(
      {
        success: true,
        booking_id: booking.id,
        booking_ref: booking.bookingRef,
        status: booking.status,
        payment_status: payment.status,
        already_captured: alreadyCaptured,
        redirect_url: `/confirmation?ref=${encodeURIComponent(booking.bookingRef)}`,
      },
      {
        message: alreadyCaptured ? "Payment already verified" : "Payment verified",
        requestId,
        headers: rateLimitHeaders(rl),
      }
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "POST /api/payments/verify",
    });
  }
}
