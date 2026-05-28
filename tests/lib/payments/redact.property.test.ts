import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { redactPayload, redactId } from "@/lib/payments/redact";
import {
  orderIdArb,
  paymentIdArb,
  refundIdArb,
  hexStringArb,
} from "../../generators/razorpayIdArb";

/**
 * Property 16: Redaction policy is total.
 * Validates: Requirements 2.11, 4.5, 4.6, 10.5, 15.3, 15.4
 */
describe("Property 16: redaction policy is total", () => {
  it("never leaks secrets and masks every Razorpay id to prefix_***last4", () => {
    fc.assert(
      fc.property(
        fc.record({
          keySecret: hexStringArb(24),
          webhookSecret: hexStringArb(24),
          signature: hexStringArb(32),
          orderId: orderIdArb,
          paymentId: paymentIdArb,
          refundId: refundIdArb,
        }),
        (s) => {
          const input = {
            RAZORPAY_KEY_SECRET: s.keySecret,
            RAZORPAY_WEBHOOK_SECRET: s.webhookSecret,
            "x-razorpay-signature": s.signature,
            razorpay_signature: s.signature,
            razorpayOrderId: s.orderId,
            nested: {
              payment_id: s.paymentId,
              list: [s.refundId, { token: s.keySecret }],
            },
          };

          const serialized = JSON.stringify(redactPayload(input));

          // No raw secret material survives.
          expect(serialized.includes(s.keySecret)).toBe(false);
          expect(serialized.includes(s.webhookSecret)).toBe(false);
          expect(serialized.includes(s.signature)).toBe(false);

          // No raw ids survive; the masked form does.
          for (const id of [s.orderId, s.paymentId, s.refundId]) {
            expect(serialized.includes(id)).toBe(false);
            expect(serialized.includes(redactId(id))).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("is total — never throws on odd inputs", () => {
    fc.assert(
      fc.property(fc.anything(), (anything) => {
        expect(() => redactPayload(anything)).not.toThrow();
      })
    );
  });
});
