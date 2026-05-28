import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { handleWebhook } from "@/lib/services/paymentService";
import { webhookEnvelopeSchema } from "@/lib/payments/webhookSchema";
import {
  recordPaymentEvent,
  isWebhookEventProcessed,
} from "@/lib/payments/auditLog";
import { logger, newRequestId } from "@/lib/logger";
import { SECURITY_HEADERS } from "@/lib/utils/security";

/**
 * POST /api/payments/webhook — called by Razorpay.
 *
 * Pipeline:
 *   1. Transport guards (Content-Type 415, Content-Length 413) before crypto.
 *   2. HMAC-SHA256 of the RAW body (no JSON re-serialization) → 401 on mismatch.
 *   3. JSON parse (400) then Zod envelope validation (400).
 *   4. Event-id idempotency: skip already-processed events; the eventId @unique
 *      index makes concurrent duplicates race-safe.
 *   5. Delegate to handleWebhook (state machine + audit + notifications).
 *
 * Application-level handler failures return 200 (logged) so Razorpay's global
 * retry budget isn't burned — we reconcile manually from the audit log.
 */
const MAX_BODY_BYTES = 1_000_000; // 1 MB hard cap

export async function POST(request: NextRequest) {
  const requestId = newRequestId();

  // Legacy-route observability (transition window — task 21.1).
  const pathname = request.nextUrl?.pathname ?? "";
  if (pathname.startsWith("/api/payment/")) {
    logger.warn("payments.legacy_route_hit", { path: pathname, requestId });
  }

  // Transport guards — reject before reading the body or doing any HMAC work.
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Unsupported Media Type" },
        { status: 415 }
      ),
      requestId
    );
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    logger.warn("webhook.body_too_large", { requestId, bytes: contentLength });
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Payload too large" },
        { status: 413 }
      ),
      requestId
    );
  }

  // Read the RAW body. Critical: HMAC must be computed on the exact bytes
  // Razorpay signed — never JSON.parse + JSON.stringify.
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    logger.warn("webhook.body_too_large", { requestId, bytes: rawBody.length });
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Payload too large" },
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

  // Parse the verified body once.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return withHeaders(
      NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }),
      requestId
    );
  }

  // Validate the envelope shape — malformed events never reach the handler.
  let envelope: ReturnType<typeof webhookEnvelopeSchema.parse>;
  try {
    envelope = webhookEnvelopeSchema.parse(parsed);
  } catch (err) {
    const ev = (parsed as { event?: unknown })?.event;
    logger.warn("webhook.malformed_event", {
      requestId,
      event: typeof ev === "string" ? ev : undefined,
      error:
        err instanceof ZodError
          ? err.issues?.[0]?.message
          : err instanceof Error
          ? err.message
          : String(err),
    });
    return withHeaders(
      NextResponse.json(
        { success: false, error: "Malformed event" },
        { status: 400 }
      ),
      requestId
    );
  }

  const eventId = envelope.id ?? null;

  // Event-id idempotency. Fast-path: already fully processed → short-circuit.
  // Race-safe path: the eventId @unique index turns a concurrent duplicate
  // insert into a P2002 we treat as a duplicate.
  if (eventId) {
    if (await isWebhookEventProcessed(eventId)) {
      logger.info("webhook.idempotent_event", { requestId, event: envelope.event });
      return withHeaders(
        NextResponse.json({
          success: true,
          ok: true,
          action: "idempotent:duplicate_event",
        }),
        requestId
      );
    }
    try {
      await recordPaymentEvent({
        kind: "WEBHOOK_RECEIVED",
        eventId,
        razorpayEventName: envelope.event,
        payload: envelope,
        processed: false,
        requestId,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        logger.info("webhook.duplicate_event_race", {
          requestId,
          event: envelope.event,
        });
        return withHeaders(
          NextResponse.json({
            success: true,
            ok: true,
            action: "idempotent:duplicate_event",
          }),
          requestId
        );
      }
      throw err;
    }
  } else {
    // No event id → fall back to the status-based idempotency in handleWebhook.
    logger.info("webhook.missing_event_id", { requestId, event: envelope.event });
    await recordPaymentEvent({
      kind: "WEBHOOK_RECEIVED",
      eventId: null,
      razorpayEventName: envelope.event,
      payload: envelope,
      processed: false,
      requestId,
    });
  }

  try {
    const result = await handleWebhook(envelope, { requestId, eventId });
    logger.info("webhook.processed", {
      requestId,
      event: envelope.event,
      action: (result as { action?: string }).action,
    });
    return withHeaders(
      NextResponse.json({ success: true, ...result }),
      requestId
    );
  } catch (err) {
    logger.error("webhook.handler_failed", {
      requestId,
      event: envelope.event,
      error: err instanceof Error ? err.message : String(err),
    });
    // Return 200 so Razorpay does not retry indefinitely; we have logged it
    // and will reconcile manually via /admin/payments + the audit log.
    return withHeaders(
      NextResponse.json({ success: true, processed: false }, { status: 200 }),
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
