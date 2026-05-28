import fc from "fast-check";
import { orderIdArb, paymentIdArb, refundIdArb, eventIdArb } from "./razorpayIdArb";

/**
 * Paise within the webhook schema's accepted range (integer, ≤ 10_000_000_000),
 * so generated envelopes are always schema-valid.
 */
const webhookPaiseArb = fc.integer({ min: 1, max: 10_000_000_000 });

/**
 * Generators for valid Razorpay webhook envelopes, one per event type the
 * handler understands. Each carries a consistent order/payment id so callers
 * can correlate them with a Payment record under test.
 */

export type WebhookEventType =
  | "payment.authorized"
  | "payment.captured"
  | "order.paid"
  | "payment.failed"
  | "refund.processed"
  | "refund.failed";

interface EnvelopeOpts {
  orderId?: string;
  paymentId?: string;
  refundId?: string;
  amountPaise?: number;
  eventId?: string;
}

function paymentEntity(orderId: string, paymentId: string, amount: number, status: string) {
  return {
    id: paymentId,
    order_id: orderId,
    amount,
    currency: "INR",
    status,
    method: "upi",
  };
}

function buildEnvelope(event: WebhookEventType, opts: EnvelopeOpts) {
  const orderId = opts.orderId ?? "order_TestDefault01";
  const paymentId = opts.paymentId ?? "pay_TestDefault01";
  const refundId = opts.refundId ?? "rfnd_TestDefault01";
  const amount = opts.amountPaise ?? 100000;
  const base: Record<string, unknown> = {
    event,
    account_id: "acc_TestAccount01",
    id: opts.eventId ?? "evt_TestDefault01",
    created_at: 1_700_000_000,
  };

  switch (event) {
    case "payment.authorized":
      return { ...base, payload: { payment: { entity: paymentEntity(orderId, paymentId, amount, "authorized") } } };
    case "payment.captured":
      return { ...base, payload: { payment: { entity: paymentEntity(orderId, paymentId, amount, "captured") } } };
    case "payment.failed":
      return {
        ...base,
        payload: {
          payment: {
            entity: {
              ...paymentEntity(orderId, paymentId, amount, "failed"),
              error_code: "BAD_REQUEST_ERROR",
              error_description: "Payment failed at gateway",
            },
          },
        },
      };
    case "order.paid":
      return {
        ...base,
        payload: {
          order: { entity: { id: orderId, amount, currency: "INR", status: "paid" } },
          payment: { entity: paymentEntity(orderId, paymentId, amount, "captured") },
        },
      };
    case "refund.processed":
      return {
        ...base,
        payload: {
          refund: { entity: { id: refundId, payment_id: paymentId, amount, currency: "INR", status: "processed" } },
        },
      };
    case "refund.failed":
      return {
        ...base,
        payload: {
          refund: { entity: { id: refundId, payment_id: paymentId, amount, currency: "INR", status: "failed" } },
        },
      };
  }
}

export function webhookEnvelopeArbFor(
  event: WebhookEventType,
  fixed: EnvelopeOpts = {}
): fc.Arbitrary<Record<string, unknown>> {
  return fc
    .record({
      orderId: fixed.orderId ? fc.constant(fixed.orderId) : orderIdArb,
      paymentId: fixed.paymentId ? fc.constant(fixed.paymentId) : paymentIdArb,
      refundId: fixed.refundId ? fc.constant(fixed.refundId) : refundIdArb,
      amountPaise: fixed.amountPaise ? fc.constant(fixed.amountPaise) : webhookPaiseArb,
      eventId: fixed.eventId ? fc.constant(fixed.eventId) : eventIdArb,
    })
    .map((opts) => buildEnvelope(event, opts));
}

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = [
  "payment.authorized",
  "payment.captured",
  "order.paid",
  "payment.failed",
  "refund.processed",
  "refund.failed",
];

/** Any valid webhook envelope across all known event types. */
export const webhookEnvelopeArb: fc.Arbitrary<Record<string, unknown>> =
  fc.constantFrom(...ALL_WEBHOOK_EVENTS).chain((ev) => webhookEnvelopeArbFor(ev));
