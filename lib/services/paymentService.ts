import { prisma } from "@/lib/db/client";
import {
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
  RAZORPAY_KEY_ID,
  redactId,
} from "@/lib/payments/razorpay";
import {
  sendPaymentConfirmation,
  sendAdminPaymentNotification,
  sendPaymentFailedNotification,
  sendOwnerWhatsAppNotice,
  sendRefundProcessedEmail,
} from "@/lib/services/emailService";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  PAYMENT_TRANSITIONS,
  canTransitionPayment,
} from "@/lib/payments/stateMachine";
import { recordPaymentEvent } from "@/lib/payments/auditLog";
import type { WebhookEnvelope } from "@/lib/payments/webhookSchema";
import type { Booking, Payment } from "@prisma/client";

/**
 * Payment service — orchestrates Razorpay order creation, signature verification,
 * webhook handling, and the booking/payment state machine.
 *
 * Design notes:
 *   - Idempotent on every entry point (verify, webhook). Repeated calls for the
 *     same razorpay_payment_id MUST never double-credit a booking, double-fire
 *     notifications, or transition to an illegal state.
 *   - State machine is enforced both for Payment.status and Booking.status.
 *     Illegal transitions are logged and skipped (never thrown to the user).
 *   - Logs use the structured `logger` and redact ids so signatures, full
 *     payment ids, and secrets never leak.
 */

// ─────────────────────────────────────────────
// State machine — centralised in lib/payments/stateMachine.ts. Re-exported
// here so existing imports of the payment transition helpers keep working.
// ─────────────────────────────────────────────

export { PAYMENT_TRANSITIONS, canTransitionPayment };

// ─────────────────────────────────────────────
// Order creation
// ─────────────────────────────────────────────

/**
 * Create a Razorpay order for a booking and persist a Payment row.
 *
 * Server-side amount source-of-truth: the booking's stored `totalPrice` is
 * authoritative; the `expectedAmount` from the client (if provided) is only
 * used as a sanity check to catch stale frontends, not as the actual amount.
 *
 * Idempotency: Payment is keyed by bookingId (`@unique`). Calling this twice
 * for the same booking will replace the prior CREATED order, but will NEVER
 * overwrite a CAPTURED row — that throws ConflictError.
 */
export async function createOrderForBooking(params: {
  bookingId: string;
  expectedAmount?: number; // INR rupees, optional sanity check
  currency?: string;
  receipt?: string;
  requestId?: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { payment: true },
  });
  if (!booking) throw new NotFoundError("Booking not found");

  if (booking.status === "cancelled") {
    throw new ConflictError("Booking is cancelled");
  }
  if (booking.status === "paid" || booking.status === "confirmed") {
    throw new ConflictError("Booking is already paid");
  }

  // Refuse to overwrite an already-captured payment row, even if the booking
  // status hasn't caught up yet.
  if (
    booking.payment &&
    (booking.payment.status === "CAPTURED" ||
      booking.payment.status === "AUTHORIZED")
  ) {
    throw new ConflictError("A payment is already in progress for this booking");
  }

  const totalPrice = Number(booking.totalPrice.toString());
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw new ValidationError("Booking has no payable amount");
  }

  if (
    params.expectedAmount !== undefined &&
    Math.round(params.expectedAmount) !== Math.round(totalPrice)
  ) {
    logger.warn("payments.create.amount_mismatch", {
      requestId: params.requestId,
      bookingId: booking.id,
      expected: params.expectedAmount,
      stored: totalPrice,
    });
    throw new ValidationError(
      "Amount mismatch — booking total does not match requested amount"
    );
  }

  const receipt = (params.receipt || booking.bookingRef).slice(0, 40);
  const currency = params.currency || "INR";

  const order = await createRazorpayOrder(totalPrice, currency, receipt, {
    booking_id: booking.id,
    booking_ref: booking.bookingRef,
  });

  // Validate Razorpay's response before we trust it.
  if (!order?.id || typeof order.id !== "string" || !order.id.startsWith("order_")) {
    logger.error("payments.create.invalid_order_response", {
      requestId: params.requestId,
      bookingId: booking.id,
    });
    throw new ValidationError("Payment provider returned an invalid order");
  }

  // Persist Payment row. Upsert so we cleanly handle a retry from a stale
  // CREATED row. Never reachable for CAPTURED/AUTHORIZED — guarded above.
  // The Payment write and the ORDER_CREATED audit row commit atomically.
  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        amount: totalPrice,
        currency,
        paymentMethod: "razorpay",
        razorpayOrderId: order.id,
        razorpayPaymentId: null,
        razorpaySignature: null,
        status: "CREATED",
        method: null,
      },
      create: {
        bookingId: booking.id,
        amount: totalPrice,
        currency,
        paymentMethod: "razorpay",
        razorpayOrderId: order.id,
        status: "CREATED",
      },
    });

    await recordPaymentEvent({
      kind: "ORDER_CREATED",
      paymentId: p.id,
      bookingId: booking.id,
      payload: {
        orderId: order.id,
        amountPaise: Number(order.amount),
        currency: order.currency,
        receipt,
      },
      processed: true,
      requestId: params.requestId ?? "",
      tx,
    });

    return p;
  });

  logger.info("payments.create.ok", {
    requestId: params.requestId,
    bookingId: booking.id,
    bookingRef: booking.bookingRef,
    orderId: redactId(order.id),
    amountPaise: Number(order.amount),
    currency: order.currency,
  });

  return {
    orderId: order.id,
    amount: Number(order.amount), // paise
    currency: order.currency,
    key: RAZORPAY_KEY_ID,
    bookingId: booking.id,
    bookingRef: booking.bookingRef,
    receipt,
    payment,
    booking,
  };
}

// ─────────────────────────────────────────────
// Verify + Confirm (called from /api/payments/verify)
// ─────────────────────────────────────────────

/**
 * Verify a Razorpay payment signature using HMAC-SHA256 + timingSafeEqual.
 */
export function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  return verifyRazorpaySignature(orderId, paymentId, signature);
}

/**
 * Confirm a successful payment: update Payment + Booking, fire notifications.
 *
 * Idempotency: callable any number of times for the same payment id.
 * - If Payment is already CAPTURED with the same paymentId, returns early.
 * - Notifications are fired ONCE — guarded by a status-change check inside
 *   the transaction, so a concurrent webhook + verify cannot double-send.
 */
export async function confirmPayment(params: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  method?: string;
  requestId?: string;
}): Promise<{
  booking: Booking;
  payment: Payment;
  alreadyCaptured: boolean;
}> {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { payment: true, room: true, tour: true },
  });
  if (!booking) throw new NotFoundError("Booking not found");

  // Defence-in-depth: the order on file for this booking must match.
  if (
    booking.payment?.razorpayOrderId &&
    booking.payment.razorpayOrderId !== params.razorpayOrderId
  ) {
    logger.warn("payments.verify.order_mismatch", {
      requestId: params.requestId,
      bookingId: booking.id,
      onFile: redactId(booking.payment.razorpayOrderId),
      provided: redactId(params.razorpayOrderId),
    });
    throw new ValidationError("Order id does not match this booking");
  }

  // Fast-path idempotency: same paymentId already CAPTURED.
  if (
    booking.payment?.status === "CAPTURED" &&
    booking.payment.razorpayPaymentId === params.razorpayPaymentId
  ) {
    logger.info("payments.verify.idempotent_hit", {
      requestId: params.requestId,
      bookingId: booking.id,
      paymentId: redactId(params.razorpayPaymentId),
    });
    return {
      booking,
      payment: booking.payment,
      alreadyCaptured: true,
    };
  }

  // Defence-in-depth: server-side cross-check with Razorpay.
  let rzpStatus = "captured";
  let rzpMethod: string | undefined = params.method;
  try {
    const rzpPayment = await fetchRazorpayPayment(params.razorpayPaymentId);
    rzpStatus = (rzpPayment as any)?.status || rzpStatus;
    rzpMethod = (rzpPayment as any)?.method || rzpMethod;
    const rzpOrderId = (rzpPayment as any)?.order_id;
    if (rzpOrderId && rzpOrderId !== params.razorpayOrderId) {
      logger.warn("payments.verify.rzp_order_mismatch", {
        requestId: params.requestId,
        bookingId: booking.id,
      });
      throw new ValidationError("Order id mismatch");
    }
    const rzpAmountPaise = Number((rzpPayment as any)?.amount);
    if (Number.isFinite(rzpAmountPaise) && booking.payment?.amount) {
      const expectedPaise = Math.round(
        Number(booking.payment.amount.toString()) * 100
      );
      if (rzpAmountPaise !== expectedPaise) {
        logger.warn("payments.verify.amount_mismatch", {
          requestId: params.requestId,
          bookingId: booking.id,
          expectedPaise,
          actualPaise: rzpAmountPaise,
        });
        throw new ValidationError("Payment amount mismatch");
      }
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      // Cross-check rejected (order/amount mismatch) — record and propagate.
      await recordPaymentEvent({
        kind: "VERIFY_FAILED",
        paymentId: booking.payment?.id ?? null,
        bookingId: booking.id,
        payload: {
          orderId: params.razorpayOrderId,
          paymentId: params.razorpayPaymentId,
        },
        processed: true,
        error: err.message,
        requestId: params.requestId ?? "",
      });
      throw err;
    }
    // Soft-fail on Razorpay fetch errors; we have a valid signature already.
    logger.warn("payments.verify.fetch_failed", {
      requestId: params.requestId,
      bookingId: booking.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const targetStatus =
    rzpStatus === "captured" || rzpStatus === "authorized"
      ? rzpStatus === "captured"
        ? "CAPTURED"
        : "AUTHORIZED"
      : "FAILED";

  // Run the state-machine guard + write in a single transaction so
  // concurrent webhook + verify can't both flip the same flag.
  const result = await prisma.$transaction(async (tx) => {
    // Defence-of-last-resort: take a row lock on this booking's payment so a
    // concurrent webhook for the same order serialises behind us. The fast-path
    // idempotency check above still handles the common already-captured case.
    await tx.$queryRaw`SELECT id FROM payments WHERE "bookingId" = ${booking.id} FOR UPDATE`;

    const current = await tx.payment.findUnique({
      where: { bookingId: booking.id },
    });

    const fromStatus = current?.status ?? "CREATED";
    const wasAlreadyTerminal =
      current?.status === "CAPTURED" || current?.status === "FAILED";

    const allowed = canTransitionPayment(fromStatus, targetStatus);
    const finalStatus = allowed ? targetStatus : fromStatus;

    const payment = await tx.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
        status: finalStatus as any,
        method: rzpMethod ?? current?.method ?? null,
      },
      create: {
        bookingId: booking.id,
        amount: booking.totalPrice,
        currency: "INR",
        paymentMethod: "razorpay",
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
        status: finalStatus as any,
        method: rzpMethod ?? null,
      },
    });

    let updatedBooking = booking;
    if (finalStatus === "CAPTURED" && booking.status === "pending") {
      updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "paid" },
        include: { payment: true, room: true, tour: true },
      });
    }

    await recordPaymentEvent({
      kind: finalStatus === "FAILED" ? "VERIFY_FAILED" : "VERIFY_SUCCEEDED",
      paymentId: payment.id,
      bookingId: booking.id,
      payload: {
        orderId: params.razorpayOrderId,
        paymentId: params.razorpayPaymentId,
        fromStatus,
        finalStatus,
        rzpStatus,
      },
      processed: true,
      error: finalStatus === "FAILED" ? "payment_not_captured" : null,
      requestId: params.requestId ?? "",
      tx,
    });

    return {
      payment,
      booking: updatedBooking,
      transitioned: !wasAlreadyTerminal && finalStatus === "CAPTURED",
      // True only when THIS call moved a non-terminal payment into FAILED, so the
      // failure notification fires exactly once (mirrors `transitioned` for the
      // capture path). A verify retry against an already-FAILED row is inert.
      freshlyFailed: !wasAlreadyTerminal && finalStatus === "FAILED",
      finalStatus,
    };
  });

  if (!result.transitioned && result.finalStatus !== "CAPTURED") {
    logger.warn("payments.verify.non_capture", {
      requestId: params.requestId,
      bookingId: booking.id,
      paymentId: redactId(params.razorpayPaymentId),
      rzpStatus,
    });
  }

  // Fire notifications EXACTLY ONCE — only when this call is the one that
  // moved the payment into CAPTURED. Subsequent verify calls (or a webhook
  // that already moved us there) will not re-send.
  if (result.transitioned) {
    logger.info("payments.captured", {
      requestId: params.requestId,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      orderId: redactId(params.razorpayOrderId),
      paymentId: redactId(params.razorpayPaymentId),
      method: rzpMethod,
    });
    void sendPaymentConfirmation(result.booking as any, result.payment).catch(
      (err) =>
        logger.error("notifications.payment_confirmation_failed", {
          requestId: params.requestId,
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        })
    );
    void sendAdminPaymentNotification(
      result.booking as any,
      result.payment
    ).catch((err) =>
      logger.error("notifications.admin_payment_failed", {
        requestId: params.requestId,
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    void sendOwnerWhatsAppNotice(result.booking as any, result.payment).catch(
      (err) =>
        logger.error("notifications.owner_whatsapp_failed", {
          requestId: params.requestId,
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        })
    );
  } else if (result.freshlyFailed) {
    void sendPaymentFailedNotification(
      result.booking as any,
      "Payment was not captured by Razorpay"
    ).catch((err) =>
      logger.error("notifications.payment_failed_failed", {
        requestId: params.requestId,
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  return {
    booking: result.booking,
    payment: result.payment,
    alreadyCaptured: false,
  };
}

// ─────────────────────────────────────────────
// Refund initiation (admin)
// ─────────────────────────────────────────────

/**
 * Initiate a full or partial refund against a captured payment.
 *
 * Guards:
 *   - Payment must be CAPTURED (else ConflictError 409).
 *   - Requested amount may not exceed the available balance
 *     (captured paise − already-refunded paise) (else ValidationError 400).
 *
 * Persists a Refund(INITIATED) row + REFUND_INITIATED audit event in one
 * transaction. Booking status is NOT changed (refund and cancel are separate
 * admin actions). The refund completes asynchronously via the refund webhook.
 */
export async function initiateRefund(
  paymentId: string,
  input: { amount?: number; reason?: string; currency?: string },
  ctx?: { requestId?: string }
) {
  const requestId = ctx?.requestId;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { refunds: true, booking: true },
  });
  if (!payment) throw new NotFoundError("Payment not found");
  if (payment.status !== "CAPTURED") {
    throw new ConflictError("Only captured payments can be refunded");
  }
  if (!payment.razorpayPaymentId) {
    throw new ValidationError("Payment has no Razorpay payment id to refund");
  }

  const capturedPaise = Math.round(Number(payment.amount.toString()) * 100);
  // Reserve against anything not explicitly failed to avoid over-refunding.
  const reservedPaise = payment.refunds
    .filter((r) => r.status !== "FAILED")
    .reduce((sum, r) => sum + Math.round(Number(r.amount.toString()) * 100), 0);
  const availablePaise = capturedPaise - reservedPaise;

  if (availablePaise <= 0) {
    throw new ConflictError("Payment is already fully refunded");
  }

  const requestedPaise =
    input.amount !== undefined
      ? Math.round(input.amount * 100)
      : availablePaise;

  if (requestedPaise <= 0) {
    throw new ValidationError("Refund amount must be greater than zero");
  }
  if (requestedPaise > availablePaise) {
    throw new ValidationError(
      "Refund amount exceeds the available balance for this payment"
    );
  }

  // Call Razorpay first; only persist once the gateway accepts the refund.
  const rzpRefund = await createRazorpayRefund(
    payment.razorpayPaymentId,
    requestedPaise,
    {
      reason: (input.reason ?? "").slice(0, 200),
      requestId: requestId ?? "",
    }
  );

  if (!rzpRefund?.id || !rzpRefund.id.startsWith("rfnd_")) {
    logger.error("payments.refund.invalid_response", { requestId, paymentId });
    throw new ValidationError("Payment provider returned an invalid refund");
  }

  const refund = await prisma.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        paymentId: payment.id,
        razorpayRefundId: rzpRefund.id,
        amount: requestedPaise / 100,
        currency: "INR",
        status: "INITIATED",
        reason: input.reason ?? null,
      },
    });
    await recordPaymentEvent({
      kind: "REFUND_INITIATED",
      paymentId: payment.id,
      bookingId: payment.bookingId,
      payload: {
        refundId: rzpRefund.id,
        amountPaise: requestedPaise,
        reason: input.reason ?? null,
      },
      processed: true,
      requestId: requestId ?? "",
      tx,
    });
    return created;
  });

  logger.info("payments.refund.initiated", {
    requestId,
    paymentId,
    refundId: redactId(rzpRefund.id),
    amountPaise: requestedPaise,
  });

  return refund;
}

// ─────────────────────────────────────────────
// Webhook
// ─────────────────────────────────────────────

/**
 * Handle a webhook event from Razorpay.
 * The caller MUST have verified the signature AND validated the envelope shape
 * with `webhookEnvelopeSchema` already.
 *
 * Supported events:
 *   - payment.authorized → mark payment AUTHORIZED
 *   - payment.captured   → mark payment CAPTURED + booking paid
 *   - payment.failed     → mark payment FAILED (only from non-terminal states)
 *   - order.paid         → mark payment CAPTURED + booking paid
 *   - refund.processed / refund.failed → handled by applyRefundEvent
 *
 * Audit: writes WEBHOOK_PROCESSED (and flips the WEBHOOK_RECEIVED row written by
 * the route) inside the same transaction as the state change, and WEBHOOK_REJECTED
 * for illegal transitions / unknown orders.
 *
 * Returns `{ ok, action }` where `action` indicates what the handler did.
 */
export async function handleWebhook(
  event: WebhookEnvelope,
  ctx?: { requestId?: string; eventId?: string | null }
) {
  const eventType = event.event;
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;

  const requestId = ctx?.requestId;
  const eventId = ctx?.eventId ?? null;

  // Refunds follow a separate lifecycle (Refund table, no booking change).
  if (
    eventType === "refund.processed" ||
    eventType === "refund.failed" ||
    eventType === "refund.created"
  ) {
    return applyRefundEvent(event, { requestId, eventId });
  }

  if (!paymentEntity && !orderEntity) {
    logger.warn("webhook.missing_entity", { requestId, eventType });
    return { ok: true, action: "ignored:no_entity" as const };
  }

  const orderId = paymentEntity?.order_id || orderEntity?.id;
  if (!orderId || typeof orderId !== "string") {
    return { ok: true, action: "ignored:no_order_id" as const };
  }
  if (!orderId.startsWith("order_")) {
    logger.warn("webhook.invalid_order_id", {
      requestId,
      eventType,
      orderId: redactId(orderId),
    });
    return { ok: true, action: "ignored:bad_order_id" as const };
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: orderId },
    include: { booking: true },
  });
  if (!payment) {
    logger.warn("webhook.unknown_order", {
      requestId,
      eventType,
      orderId: redactId(orderId),
    });
    await recordPaymentEvent({
      kind: "WEBHOOK_REJECTED",
      razorpayEventName: eventType,
      payload: { orderId },
      processed: true,
      error: "unknown_order",
      requestId: requestId ?? "",
    });
    // Return ok so Razorpay does not retry forever; we log for triage.
    return { ok: true, action: "ignored:unknown_order" as const };
  }

  const incomingPaymentId = paymentEntity?.id;

  // Idempotency: same event for an already-CAPTURED payment is a no-op.
  if (
    payment.status === "CAPTURED" &&
    (eventType === "payment.captured" || eventType === "order.paid") &&
    (!incomingPaymentId || payment.razorpayPaymentId === incomingPaymentId)
  ) {
    logger.info("webhook.idempotent_capture", {
      requestId,
      eventType,
      orderId: redactId(orderId),
    });
    return { ok: true, action: "idempotent:already_captured" as const };
  }

  // Map event → target status.
  let targetStatus: "AUTHORIZED" | "CAPTURED" | "FAILED" | null = null;
  switch (eventType) {
    case "payment.authorized":
      targetStatus = "AUTHORIZED";
      break;
    case "payment.captured":
    case "order.paid":
      targetStatus = "CAPTURED";
      break;
    case "payment.failed":
      targetStatus = "FAILED";
      break;
    default:
      logger.info("webhook.unhandled_event", { requestId, eventType });
      return { ok: true, action: "ignored:unhandled" as const };
  }

  if (!canTransitionPayment(payment.status, targetStatus)) {
    logger.warn("webhook.illegal_transition", {
      requestId,
      eventType,
      orderId: redactId(orderId),
      from: payment.status,
      to: targetStatus,
    });
    await recordPaymentEvent({
      kind: "WEBHOOK_REJECTED",
      paymentId: payment.id,
      bookingId: payment.bookingId,
      razorpayEventName: eventType,
      payload: { orderId, from: payment.status, to: targetStatus },
      processed: true,
      error: "illegal_transition",
      requestId: requestId ?? "",
    });
    return { ok: true, action: "rejected:illegal_transition" as const };
  }

  // Apply the transition transactionally.
  let didCapture = false;
  let didFail = false;
  let raceAlreadyCaptured = false;
  await prisma.$transaction(async (tx) => {
    // Take a row lock so a concurrent /verify for the same order serialises
    // behind us — only one of us performs the capture + notifications.
    await tx.$queryRaw`SELECT id FROM payments WHERE "razorpayOrderId" = ${orderId} FOR UPDATE`;

    // Re-read inside the transaction to avoid TOCTOU with /verify.
    const current = await tx.payment.findUnique({
      where: { id: payment.id },
    });
    if (!current) return;

    if (
      current.status === "CAPTURED" &&
      (targetStatus === "FAILED" || targetStatus === "AUTHORIZED")
    ) {
      // Capture won the race between our pre-check and the lock.
      raceAlreadyCaptured = true;
    } else if (current.status === targetStatus) {
      // Possible if /verify just flipped us. Update payment id if missing.
      if (!current.razorpayPaymentId && incomingPaymentId) {
        await tx.payment.update({
          where: { id: current.id },
          data: { razorpayPaymentId: incomingPaymentId },
        });
      }
      if (targetStatus === "CAPTURED") raceAlreadyCaptured = true;
    } else {
      await tx.payment.update({
        where: { id: current.id },
        data: {
          status: targetStatus!,
          razorpayPaymentId:
            incomingPaymentId ?? current.razorpayPaymentId ?? null,
          method: paymentEntity?.method ?? current.method ?? null,
        },
      });

      if (targetStatus === "CAPTURED" && payment.booking?.status === "pending") {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { status: "paid" },
        });
        didCapture = true;
      }
      if (targetStatus === "FAILED") didFail = true;
    }

    // Flip the WEBHOOK_RECEIVED row (written by the route) to processed=true and
    // append the WEBHOOK_PROCESSED audit row — atomic with the state change.
    if (eventId) {
      await tx.paymentEvent.updateMany({
        where: { eventId, kind: "WEBHOOK_RECEIVED" },
        data: { processed: true },
      });
    }
    await recordPaymentEvent({
      kind: "WEBHOOK_PROCESSED",
      paymentId: payment.id,
      bookingId: payment.bookingId,
      razorpayEventName: eventType,
      payload: { orderId, paymentId: incomingPaymentId, targetStatus },
      processed: true,
      requestId: requestId ?? "",
      tx,
    });
  });

  // Fire notifications only when WE were the call that captured.
  if (didCapture && payment.booking) {
    const fresh = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: { booking: true },
    });
    if (fresh && fresh.booking) {
      logger.info("webhook.captured", {
        requestId,
        orderId: redactId(orderId),
        paymentId: redactId(fresh.razorpayPaymentId),
        bookingRef: fresh.booking.bookingRef,
      });
      void sendPaymentConfirmation(fresh.booking as any, fresh as any).catch(
        (err) =>
          logger.error("notifications.payment_confirmation_failed", {
            requestId,
            bookingId: fresh.booking!.id,
            error: err instanceof Error ? err.message : String(err),
          })
      );
      void sendAdminPaymentNotification(
        fresh.booking as any,
        fresh as any
      ).catch((err) =>
        logger.error("notifications.admin_payment_failed", {
          requestId,
          bookingId: fresh.booking!.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      void sendOwnerWhatsAppNotice(fresh.booking as any, fresh as any).catch(
        (err) =>
          logger.error("notifications.owner_whatsapp_failed", {
            requestId,
            bookingId: fresh.booking!.id,
            error: err instanceof Error ? err.message : String(err),
          })
      );
    }
  }

  // Fire the failure email only when WE actually transitioned to FAILED.
  if (didFail && payment.booking) {
    void sendPaymentFailedNotification(
      payment.booking as any,
      paymentEntity?.error_description || "Payment failed at the gateway"
    ).catch((err) =>
      logger.error("notifications.payment_failed_failed", {
        requestId,
        bookingId: payment.booking!.id,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  // We lost the race to a concurrent capture (verify or another webhook).
  if (raceAlreadyCaptured && !didCapture) {
    return { ok: true, action: "idempotent:already_captured" as const };
  }

  return { ok: true, action: `applied:${targetStatus}` as const };
}

// ─────────────────────────────────────────────
// Refund webhook branch (refund.processed / refund.failed)
// ─────────────────────────────────────────────

/**
 * Handle a refund webhook. Updates the Refund row's lifecycle (INITIATED →
 * PROCESSED | FAILED), records an audit event, and — exactly once on
 * INITIATED → PROCESSED — emails the customer. Booking status is never touched.
 */
async function applyRefundEvent(
  event: WebhookEnvelope,
  ctx: { requestId?: string; eventId?: string | null }
) {
  const eventType = event.event;
  const requestId = ctx?.requestId;
  const eventId = ctx?.eventId ?? null;
  const refundEntity = event.payload?.refund?.entity;

  if (!refundEntity?.id) {
    logger.warn("webhook.refund_missing_entity", { requestId, eventType });
    return { ok: true, action: "ignored:no_refund_entity" as const };
  }

  const refund = await prisma.refund.findUnique({
    where: { razorpayRefundId: refundEntity.id },
    include: { payment: { include: { booking: true } } },
  });
  if (!refund) {
    logger.warn("webhook.refund_unknown", {
      requestId,
      eventType,
      refundId: redactId(refundEntity.id),
    });
    await recordPaymentEvent({
      kind: "WEBHOOK_REJECTED",
      razorpayEventName: eventType,
      payload: { refundId: refundEntity.id },
      processed: true,
      error: "unknown_refund",
      requestId: requestId ?? "",
    });
    return { ok: true, action: "ignored:unknown_refund" as const };
  }

  // refund.failed → mark FAILED (only from INITIATED), audit, no email.
  if (eventType === "refund.failed") {
    let transitioned = false;
    await prisma.$transaction(async (tx) => {
      const current = await tx.refund.findUnique({ where: { id: refund.id } });
      if (!current || current.status !== "INITIATED") return;
      await tx.refund.update({
        where: { id: refund.id },
        data: { status: "FAILED" },
      });
      if (eventId) {
        await tx.paymentEvent.updateMany({
          where: { eventId, kind: "WEBHOOK_RECEIVED" },
          data: { processed: true },
        });
      }
      await recordPaymentEvent({
        kind: "WEBHOOK_PROCESSED",
        paymentId: refund.paymentId,
        bookingId: refund.payment?.bookingId ?? null,
        razorpayEventName: eventType,
        payload: { refundId: refundEntity.id },
        processed: true,
        error: refundEntity.error_description ?? "refund_failed",
        requestId: requestId ?? "",
        tx,
      });
      transitioned = true;
    });
    return {
      ok: true,
      action: transitioned
        ? ("applied:refund_failed" as const)
        : ("idempotent:refund_unchanged" as const),
    };
  }

  // refund.processed / refund.created → mark PROCESSED (only from INITIATED),
  // audit, and email the customer exactly once.
  let transitioned = false;
  await prisma.$transaction(async (tx) => {
    const current = await tx.refund.findUnique({ where: { id: refund.id } });
    if (!current || current.status !== "INITIATED") return;
    await tx.refund.update({
      where: { id: refund.id },
      data: { status: "PROCESSED" },
    });
    if (eventId) {
      await tx.paymentEvent.updateMany({
        where: { eventId, kind: "WEBHOOK_RECEIVED" },
        data: { processed: true },
      });
    }
    await recordPaymentEvent({
      kind: "REFUND_PROCESSED",
      paymentId: refund.paymentId,
      bookingId: refund.payment?.bookingId ?? null,
      razorpayEventName: eventType,
      payload: { refundId: refundEntity.id, amountPaise: refundEntity.amount },
      processed: true,
      requestId: requestId ?? "",
      tx,
    });
    transitioned = true;
  });

  // Email exactly once — only the call that flipped INITIATED → PROCESSED.
  if (transitioned && refund.payment?.booking) {
    void sendRefundProcessedEmail(
      refund.payment.booking as any,
      refund.payment as any,
      { amount: refund.amount, razorpayRefundId: refund.razorpayRefundId }
    ).catch((err) =>
      logger.error("notifications.refund_processed_failed", {
        requestId,
        refundId: redactId(refund.razorpayRefundId),
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }

  return {
    ok: true,
    action: transitioned
      ? ("applied:refund_processed" as const)
      : ("idempotent:refund_unchanged" as const),
  };
}

export { verifyRazorpayWebhookSignature };
