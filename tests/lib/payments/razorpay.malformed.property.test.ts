import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import crypto from "crypto";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";

/**
 * Property 3: Verify rejects malformed inputs before crypto work.
 * Validates: Requirements 4.3, 4.4
 */

const VALID_ORDER = "order_AbCdEf1234";
const VALID_PAY = "pay_GhIjKl5678";
const VALID_HEX_SIG = "a".repeat(64);

afterEach(() => vi.restoreAllMocks());

describe("Property 3: malformed input fast-rejection", () => {
  it("returns false and never invokes crypto.createHmac when a guard fails", () => {
    const malformedTupleArb = fc.oneof(
      // Bad order id (fails order regex)
      fc.record({
        orderId: fc
          .string()
          .filter((s) => !/^order_[A-Za-z0-9]+$/.test(s)),
        paymentId: fc.constant(VALID_PAY),
        signature: fc.constant(VALID_HEX_SIG),
      }),
      // Bad payment id (fails pay regex)
      fc.record({
        orderId: fc.constant(VALID_ORDER),
        paymentId: fc
          .string()
          .filter((s) => !/^pay_[A-Za-z0-9]+$/.test(s)),
        signature: fc.constant(VALID_HEX_SIG),
      }),
      // Signature too long (> 256)
      fc.record({
        orderId: fc.constant(VALID_ORDER),
        paymentId: fc.constant(VALID_PAY),
        signature: fc
          .integer({ min: 257, max: 600 })
          .map((n) => "a".repeat(n)),
      }),
      // Signature non-hex
      fc.record({
        orderId: fc.constant(VALID_ORDER),
        paymentId: fc.constant(VALID_PAY),
        signature: fc
          .string({ minLength: 1, maxLength: 64 })
          .filter((s) => !/^[a-f0-9]+$/i.test(s.trim()) && s.trim().length > 0),
      })
    );

    fc.assert(
      fc.property(malformedTupleArb, (t) => {
        const spy = vi.spyOn(crypto, "createHmac");
        const result = verifyRazorpaySignature(
          t.orderId,
          t.paymentId,
          t.signature
        );
        expect(result).toBe(false);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
      }),
      { numRuns: 300 }
    );
  });
});
