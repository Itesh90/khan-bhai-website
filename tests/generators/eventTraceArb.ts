import fc from "fast-check";
import type { WebhookEventType } from "./webhookEnvelopeArb";

/**
 * A single step in a payment lifecycle trace. The centerpiece for Property 7
 * (interleaved verify/webhook/refund idempotency). Traces deliberately include
 * duplicates and arbitrary interleavings so order-independence can be asserted.
 */
export type TraceEvent =
  | { kind: "verify"; outcome: "success" | "failure" }
  | { kind: "webhook"; event: WebhookEventType }
  | { kind: "refund"; outcome: "initiate" };

const verifyEventArb: fc.Arbitrary<TraceEvent> = fc.record({
  kind: fc.constant("verify" as const),
  outcome: fc.constantFrom("success" as const, "failure" as const),
});

const webhookEventArb: fc.Arbitrary<TraceEvent> = fc
  .constantFrom<WebhookEventType>(
    "payment.authorized",
    "payment.captured",
    "order.paid",
    "payment.failed",
    "refund.processed",
    "refund.failed"
  )
  .map((event) => ({ kind: "webhook" as const, event }));

const refundEventArb: fc.Arbitrary<TraceEvent> = fc.record({
  kind: fc.constant("refund" as const),
  outcome: fc.constant("initiate" as const),
});

const traceEventArb: fc.Arbitrary<TraceEvent> = fc.oneof(
  verifyEventArb,
  webhookEventArb,
  refundEventArb
);

/**
 * A sequence of 1..12 trace events. With high probability the same logical
 * event appears more than once (duplicates), exercising idempotency.
 */
export const eventTraceArb: fc.Arbitrary<TraceEvent[]> = fc
  .array(traceEventArb, { minLength: 1, maxLength: 12 })
  .chain((events) =>
    // Randomly duplicate a subset, then shuffle the whole lot so replays land
    // at arbitrary positions in the trace.
    fc.subarray(events, { minLength: 0, maxLength: events.length }).chain((dupes) => {
      const all = [...events, ...dupes];
      return fc.shuffledSubarray(all, {
        minLength: all.length,
        maxLength: all.length,
      });
    })
  );
