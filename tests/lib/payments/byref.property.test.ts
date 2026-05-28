import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { toPublicBooking, BOOKING_REF_RE } from "@/lib/services/publicBooking";
import { bookingArb } from "../../generators/bookingArb";
import { paymentArb } from "../../generators/paymentArb";

/**
 * Property 11: by-ref endpoint exposes only documented fields.
 * Validates: Requirements 11.2, 11.3
 */

const ALLOWED = new Set([
  "bookingRef",
  "guestFirstName",
  "itemName",
  "itemType",
  "status",
  "totalPrice",
  "currency",
  "paymentMethod",
]);

const FORBIDDEN = [
  "id",
  "guestName",
  "guestEmail",
  "guestPhone",
  "razorpayOrderId",
  "razorpayPaymentId",
  "razorpaySignature",
  "specialRequests",
];

describe("Property 11: public booking field exposure", () => {
  it("only emits allow-listed keys and never leaks sensitive values", () => {
    fc.assert(
      fc.property(bookingArb, paymentArb, fc.boolean(), (booking, payment, withPayment) => {
        const input = {
          bookingRef: booking.bookingRef,
          guestName: booking.guestName,
          type: booking.type,
          status: booking.status,
          totalPrice: booking.totalPrice,
          diningArea: null,
          room: null,
          tour: null,
          payment: withPayment
            ? { method: payment.method, paymentMethod: "razorpay" }
            : null,
        };

        const out = toPublicBooking(input);

        for (const key of Object.keys(out)) {
          expect(ALLOWED.has(key)).toBe(true);
        }
        for (const forbidden of FORBIDDEN) {
          expect(Object.prototype.hasOwnProperty.call(out, forbidden)).toBe(false);
        }

        const serialized = JSON.stringify(out);
        expect(serialized.includes(booking.guestEmail)).toBe(false);
        expect(serialized.includes(booking.guestPhone)).toBe(false);
        expect(serialized.includes(booking.id)).toBe(false);
      })
    );
  });

  it("includes paymentMethod only when paid or confirmed", () => {
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const out = toPublicBooking({
          bookingRef: booking.bookingRef,
          guestName: booking.guestName,
          type: booking.type,
          status: booking.status,
          totalPrice: booking.totalPrice,
          payment: { method: "upi", paymentMethod: "razorpay" },
        });
        const hasMethod = Object.prototype.hasOwnProperty.call(out, "paymentMethod");
        if (booking.status === "paid" || booking.status === "confirmed") {
          expect(hasMethod).toBe(true);
        } else {
          expect(hasMethod).toBe(false);
        }
      })
    );
  });

  it("ref regex matches KB- references and rejects junk", () => {
    expect(BOOKING_REF_RE.test("KB-ABC123")).toBe(true);
    expect(BOOKING_REF_RE.test("kb-abc123")).toBe(false);
    expect(BOOKING_REF_RE.test("KB-")).toBe(false);
    expect(BOOKING_REF_RE.test("XX-ABC123")).toBe(false);
  });
});
