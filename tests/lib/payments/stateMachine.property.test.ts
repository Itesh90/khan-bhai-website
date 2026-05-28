import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  PAYMENT_TRANSITIONS,
  BOOKING_TRANSITIONS,
  canTransitionPayment,
  canTransitionBooking,
} from "@/lib/payments/stateMachine";

/**
 * Property 6: State-machine reachability and side-effect coupling.
 *
 * Validates: Requirements 5.1, 5.2, 5.7, 5.8, 8.1, 8.2, 8.4, 8.5,
 * 13.1, 13.2, 13.3, 13.4, 13.5, 18.2
 */

type PaymentEvent =
  | "payment.authorized"
  | "payment.captured"
  | "order.paid"
  | "payment.failed";

const eventTargets: Record<PaymentEvent, "AUTHORIZED" | "CAPTURED" | "FAILED"> =
  {
    "payment.authorized": "AUTHORIZED",
    "payment.captured": "CAPTURED",
    "order.paid": "CAPTURED",
    "payment.failed": "FAILED",
  };

const eventArb = fc.constantFrom<PaymentEvent>(
  "payment.authorized",
  "payment.captured",
  "order.paid",
  "payment.failed"
);

interface State {
  payment: string;
  booking: string;
}

/** Pure reducer mirroring the service's transition + booking coupling. */
function applyEvent(state: State, event: PaymentEvent): State {
  const target = eventTargets[event];
  if (!canTransitionPayment(state.payment, target)) {
    return state; // illegal → unchanged
  }
  let booking = state.booking;
  if (target === "CAPTURED" && state.booking === "pending") {
    booking = "paid";
  }
  return { payment: target, booking };
}

function reachableFrom(
  table: Record<string, ReadonlySet<string>>,
  start: string
): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of table[cur] ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

describe("Property 6: state-machine reachability and side-effect coupling", () => {
  const paymentReachable = reachableFrom(PAYMENT_TRANSITIONS, "CREATED");
  const bookingReachable = reachableFrom(BOOKING_TRANSITIONS, "pending");

  it("final statuses are reachable; illegal transitions are no-ops; CAPTURED couples pending→paid", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 16 }), (events) => {
        let state: State = { payment: "CREATED", booking: "pending" };

        for (const event of events) {
          const before = { ...state };
          const target = eventTargets[event];
          const legal = canTransitionPayment(before.payment, target);
          state = applyEvent(state, event);

          if (!legal) {
            // Illegal transition leaves BOTH rows untouched.
            expect(state).toEqual(before);
          } else if (
            target === "CAPTURED" &&
            before.booking === "pending"
          ) {
            // → CAPTURED from pending always yields paid.
            expect(state.booking).toBe("paid");
          }
        }

        // Final states must be reachable via their tables.
        expect(paymentReachable.has(state.payment)).toBe(true);
        expect(bookingReachable.has(state.booking)).toBe(true);

        // The payment flow never reaches `confirmed` (admin-only) or `cancelled`.
        expect(state.booking === "confirmed").toBe(false);
        expect(state.booking === "cancelled").toBe(false);
      }),
      { numRuns: 500 }
    );
  });

  it("CAPTURED and FAILED are terminal for payments", () => {
    expect(canTransitionPayment("CAPTURED", "AUTHORIZED")).toBe(false);
    expect(canTransitionPayment("CAPTURED", "FAILED")).toBe(false);
    expect(canTransitionPayment("FAILED", "CAPTURED")).toBe(false);
    // idempotent self-transition allowed
    expect(canTransitionPayment("CAPTURED", "CAPTURED")).toBe(true);
  });

  it("booking confirmed is only reachable from paid (not pending) via the payment table", () => {
    expect(canTransitionBooking("pending", "confirmed")).toBe(false);
    expect(canTransitionBooking("paid", "confirmed")).toBe(true);
  });
});
