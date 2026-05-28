import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { webhookEnvelopeSchema } from "@/lib/payments/webhookSchema";
import {
  webhookEnvelopeArb,
  webhookEnvelopeArbFor,
  ALL_WEBHOOK_EVENTS,
} from "../../generators/webhookEnvelopeArb";

/**
 * Property 9: Webhook envelope schema validation.
 * Validates: Requirements 7.1, 7.3
 */
describe("Property 9: webhook envelope schema validation", () => {
  it("accepts every well-formed envelope for all known event types", () => {
    fc.assert(
      fc.property(webhookEnvelopeArb, (env) => {
        const res = webhookEnvelopeSchema.safeParse(env);
        expect(res.success).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it("rejects envelopes missing the required `event` field", () => {
    fc.assert(
      fc.property(webhookEnvelopeArbFor("payment.captured"), (env) => {
        const broken: Record<string, unknown> = { ...env };
        delete broken.event;
        expect(webhookEnvelopeSchema.safeParse(broken).success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("rejects envelopes missing the required `payload` field", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_WEBHOOK_EVENTS), (event) => {
        expect(
          webhookEnvelopeSchema.safeParse({ event }).success
        ).toBe(false);
      })
    );
  });

  it("rejects entity ids that fail the documented regex", () => {
    fc.assert(
      fc.property(
        webhookEnvelopeArbFor("payment.captured"),
        fc.string(),
        (env, junk) => {
          const broken = JSON.parse(JSON.stringify(env));
          broken.payload.payment.entity.order_id = `not_an_order_${junk}`;
          expect(webhookEnvelopeSchema.safeParse(broken).success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects non-integer / negative amounts", () => {
    fc.assert(
      fc.property(
        webhookEnvelopeArbFor("payment.captured"),
        fc.oneof(fc.double({ min: 0.01, max: 0.99, noNaN: true }), fc.integer({ max: -1 })),
        (env, badAmount) => {
          const broken = JSON.parse(JSON.stringify(env));
          broken.payload.payment.entity.amount = badAmount;
          expect(webhookEnvelopeSchema.safeParse(broken).success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
