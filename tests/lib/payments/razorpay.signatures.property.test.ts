import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import crypto from "crypto";
import {
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";
import { orderIdArb, paymentIdArb } from "../../generators/razorpayIdArb";

/**
 * Property 1: Payment-signature round-trip.
 * Property 2: Webhook-signature round-trip.
 * Validates: Requirements 4.1, 4.2, 6.1, 6.2, 6.4, 6.8, 17.1, 17.2, 17.7
 */

const ORIGINAL_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const ORIGINAL_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

afterEach(() => {
  process.env.RAZORPAY_KEY_SECRET = ORIGINAL_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = ORIGINAL_WEBHOOK_SECRET;
});

function hmacHex(secret: string, data: string): string {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

/** Flip a single bit in a hex string, returning a new hex string. */
function flipOneBit(hex: string, byteIdx: number, bit: number): string {
  const buf = Buffer.from(hex, "hex");
  const idx = byteIdx % buf.length;
  buf[idx] ^= 1 << (bit % 8);
  return buf.toString("hex");
}

describe("Property 1: payment-signature round-trip", () => {
  it("accepts the correct HMAC and rejects any single-bit mutation", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        paymentIdArb,
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.nat(),
        fc.nat(),
        (orderId, paymentId, secret, byteIdx, bit) => {
          process.env.RAZORPAY_KEY_SECRET = secret;
          const sig = hmacHex(secret, `${orderId}|${paymentId}`);

          expect(verifyRazorpaySignature(orderId, paymentId, sig)).toBe(true);

          const mutated = flipOneBit(sig, byteIdx, bit);
          if (mutated !== sig) {
            expect(verifyRazorpaySignature(orderId, paymentId, mutated)).toBe(
              false
            );
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it("accepts uppercase hex (normalised) and trims surrounding whitespace", () => {
    process.env.RAZORPAY_KEY_SECRET = "a_secret_value";
    const orderId = "order_AbCdEf1234";
    const paymentId = "pay_GhIjKl5678";
    const sig = hmacHex("a_secret_value", `${orderId}|${paymentId}`);
    expect(
      verifyRazorpaySignature(orderId, paymentId, `  ${sig.toUpperCase()}  `)
    ).toBe(true);
  });
});

describe("Property 2: webhook-signature round-trip", () => {
  it("accepts the correct HMAC of the raw body and rejects byte-level mutations", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 4000 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        (rawBody, secret) => {
          process.env.RAZORPAY_WEBHOOK_SECRET = secret;
          const sig = hmacHex(secret, rawBody);

          expect(verifyRazorpayWebhookSignature(rawBody, sig)).toBe(true);

          // Whitespace insertion changes the bytes → must reject.
          expect(verifyRazorpayWebhookSignature(rawBody + " ", sig)).toBe(false);
          expect(verifyRazorpayWebhookSignature(" " + rawBody, sig)).toBe(false);
        }
      ),
      { numRuns: 300 }
    );
  });

  it("rejects a JSON re-serialised body (key order / spacing differs)", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_value";
    const raw = '{"event":"payment.captured","id":"evt_x"}';
    const sig = hmacHex("whsec_value", raw);
    const reSerialised = JSON.stringify(JSON.parse(raw)) + " ";
    expect(verifyRazorpayWebhookSignature(raw, sig)).toBe(true);
    expect(verifyRazorpayWebhookSignature(reSerialised, sig)).toBe(false);
  });
});
