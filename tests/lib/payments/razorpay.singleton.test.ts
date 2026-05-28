import { describe, it, expect, afterEach } from "vitest";
import { getRazorpay } from "@/lib/payments/razorpay";

/**
 * Property 19: Razorpay client is a cached singleton.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

const g = global as unknown as { __razorpay?: unknown };

afterEach(() => {
  delete g.__razorpay;
});

describe("Property 19: cached singleton", () => {
  it("returns the same instance for every call when credentials are configured", () => {
    const first = getRazorpay();
    for (let i = 0; i < 25; i++) {
      expect(getRazorpay()).toBe(first);
    }
  });

  it("throws naming the missing variables (no secret values) when unconfigured", () => {
    delete g.__razorpay;
    const prev = {
      id: process.env.RAZORPAY_KEY_ID,
      pub: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      secret: process.env.RAZORPAY_KEY_SECRET,
    };
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    try {
      expect(() => getRazorpay()).toThrow(
        /NEXT_PUBLIC_RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET/
      );
    } finally {
      process.env.RAZORPAY_KEY_ID = prev.id;
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = prev.pub;
      process.env.RAZORPAY_KEY_SECRET = prev.secret;
    }
  });
});
