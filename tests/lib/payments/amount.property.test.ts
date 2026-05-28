import { describe, it, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { createOrderSchema, refundSchema } from "@/lib/schemas/paymentSchema";
import { rupeesArb, rupeesToPaise } from "../../generators/paiseArb";

/**
 * Property 4: Amount-paise equality at every boundary.
 * Property 15: Currency rejection.
 * Validates: Requirements 2.1, 2.2, 4.8, 14.1, 14.3, 14.6
 */

const g = global as unknown as { __razorpay?: unknown };
afterEach(() => {
  delete g.__razorpay;
  vi.restoreAllMocks();
});

describe("Property 4: amount-paise equality", () => {
  it("sends Math.round(rupees * 100) paise to razorpay.orders.create", async () => {
    await fc.assert(
      fc.asyncProperty(rupeesArb, async (rupees) => {
        const create = vi.fn(async (opts: { amount: number; currency: string }) => ({
          id: "order_FakeForTest01",
          amount: opts.amount,
          currency: opts.currency,
          status: "created",
        }));
        // Inject a fake cached client so no real SDK / network is touched.
        g.__razorpay = { orders: { create } };

        await createRazorpayOrder(rupees, "INR", "KB-TEST01");

        expect(create).toHaveBeenCalledTimes(1);
        expect(create.mock.calls[0][0].amount).toBe(rupeesToPaise(rupees));
      }),
      { numRuns: 200 }
    );
  });
});

describe("Property 15: currency rejection", () => {
  const nonInrArb = fc
    .string({ minLength: 3, maxLength: 3 })
    .filter((c) => c.toUpperCase() !== "INR");

  it("rejects non-INR currency on create-order", () => {
    fc.assert(
      fc.property(nonInrArb, (cur) => {
        const res = createOrderSchema.safeParse({
          booking_id: "b1",
          amount: 100,
          currency: cur,
        });
        expect(res.success).toBe(false);
      })
    );
  });

  it("rejects non-INR currency on refund", () => {
    fc.assert(
      fc.property(nonInrArb, (cur) => {
        expect(refundSchema.safeParse({ currency: cur }).success).toBe(false);
      })
    );
  });

  it("accepts INR on both", () => {
    expect(
      createOrderSchema.safeParse({ booking_id: "b1", amount: 100, currency: "INR" })
        .success
    ).toBe(true);
    expect(refundSchema.safeParse({ currency: "INR" }).success).toBe(true);
    // currency defaults to INR when omitted
    expect(createOrderSchema.safeParse({ booking_id: "b1", amount: 100 }).success).toBe(
      true
    );
  });
});
