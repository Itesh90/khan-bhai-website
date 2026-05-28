import { describe, it, expect, afterEach } from "vitest";
import crypto from "crypto";
import {
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";

/**
 * Signature verification edge cases (task 5.3).
 * Validates: Requirements 4.3, 4.4, 6.3, 6.5, 17.1, 17.2
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

describe("payment signature edge cases", () => {
  const orderId = "order_AbCdEf1234";
  const paymentId = "pay_GhIjKl5678";

  it("empty signature returns false", () => {
    process.env.RAZORPAY_KEY_SECRET = "s";
    expect(verifyRazorpaySignature(orderId, paymentId, "")).toBe(false);
  });

  it("mixed-case hex is accepted (case-insensitive)", () => {
    process.env.RAZORPAY_KEY_SECRET = "s";
    const sig = hmacHex("s", `${orderId}|${paymentId}`);
    const mixed = sig
      .split("")
      .map((c, i) => (i % 2 ? c.toUpperCase() : c))
      .join("");
    expect(verifyRazorpaySignature(orderId, paymentId, mixed)).toBe(true);
  });

  it("returns false when the key secret is unset", () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    const sig = hmacHex("s", `${orderId}|${paymentId}`);
    expect(verifyRazorpaySignature(orderId, paymentId, sig)).toBe(false);
  });

  it("length-256 hex signature is within bounds (not rejected by length guard)", () => {
    process.env.RAZORPAY_KEY_SECRET = "s";
    const sig256 = "a".repeat(256); // valid length, wrong value
    expect(verifyRazorpaySignature(orderId, paymentId, sig256)).toBe(false);
  });
});

describe("webhook signature edge cases", () => {
  it("empty body returns false even with a correct-looking signature", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
    const sig = hmacHex("whsec", "");
    expect(verifyRazorpayWebhookSignature("", sig)).toBe(false);
  });

  it("returns false when the webhook secret is unset", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(verifyRazorpayWebhookSignature("{}", "abc")).toBe(false);
  });

  it("oversized signature header is rejected", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
    expect(verifyRazorpayWebhookSignature("{}", "a".repeat(300))).toBe(false);
  });
});
