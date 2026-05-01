import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { handleWebhook } from "@/lib/services/paymentService";
import type { RazorpayWebhookEvent } from "@/types/payment";
import { logger, newRequestId } from "@/lib/logger";
import { SECURITY_HEADERS } from "@/lib/utils/security";

/**
 * POST /api/payments/webhook — called by Razorpay.
 *
 * Razorpay sends a JSON body and an `x-razorpay-signature` header. We compute
 * HMAC-SHA256 of the RAW body (no JSON re-serialization!) using
 * RAZORPAY_WEBHOOK_SECRET and compare with `crypto.timingSafeEqual`.
 *
 * Behavior:
 *   - Invalid signature           → 401 (Razorpay will retry; allowed because
 *                                   it indicates a misconfigured secret).
 *   - Invalid JSON                → 400 (Razorpay will retry).
 *   - Unknown / handler errors    → 200 (we logged it; do NOT trigger retries
 *                                   for application-level failures because
 *                                   Razorpay's retry budget is global).
 *   - Body too large (>1 MB)      → 413.
 *
 * Idempotency, state-machine guards, and notification-once semantics are
 * implemented in `handleWebhook` (see lib/services/paymentService.ts).
 */
const MAX_BODY_BYTES = 1_000_000; // 1 MB hard cap

export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  // Read the RAW body. Critical: HMAC must be computed on the exact bytes
  // Razorpay signed — never JSON.parse + JSON.stringify.
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    logger.warn("webhook.body_too_large", {
      requestId,
      bytes: rawBody.length,
    });
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Body too large" },
        { status: 413 }
      ),
      requestId
    );
  }

  const signature = request.headers.get("x-razorpay-signature") || "";

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    logger.warn("webhook.invalid_signature", {
      requestId,
      hasSignature: signature.length > 0,
      bodyBytes: rawBody.length,
    });
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      ),
      requestId
    );
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    logger.warn("webhook.invalid_json", { requestId, bytes: rawBody.length });
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
      ),
      requestId
    );
  }

  if (!event || typeof event.event !== "string") {
    logger.warn("webhook.malformed_event", { requestId });
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Malformed event" },
        { status: 400 }
      ),
      requestId
    );
  }

  try {
    const result = await handleWebhook(event, { requestId });
    logger.info("webhook.processed", {
      requestId,
      event: event.event,
      action: (result as any).action,
    });
    return withHeaders(
      NextResponse.json({ success: true, ...result }),
      requestId
    );
  } catch (err) {
    logger.error("webhook.handler_failed", {
      requestId,
      event: event.event,
      error: err instanceof Error ? err.message : String(err),
    });
    // Return 200 so Razorpay does not retry indefinitely; we have logged it
    // and will reconcile manually via /admin/payments.
    return withHeaders(
      NextResponse.json(
        { success: true, processed: false },
        { status: 200 }
      ),
      requestId
    );
  }
}

function withHeaders(res: NextResponse, requestId: string): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("x-request-id", requestId);
  return res;
}
