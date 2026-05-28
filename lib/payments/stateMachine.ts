import { ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Centralised payment + booking state machines — Khan Bhai S.
 *
 * Single source of truth for which status transitions are legal. Both the
 * payment flow (verify + webhook) and the admin booking flow consult these
 * tables so behaviour can never diverge between call sites.
 *
 * Payment:
 *   CREATED → AUTHORIZED | CAPTURED | FAILED
 *   AUTHORIZED → CAPTURED | FAILED
 *   CAPTURED → (terminal — refunds are modelled separately)
 *   FAILED → (terminal — a new attempt requires a new order)
 *
 * Booking (as exercised by the PAYMENT flow):
 *   pending → paid | cancelled
 *   paid → confirmed | cancelled
 *   confirmed → cancelled
 *   cancelled → (terminal)
 *
 * Note: `confirmed` is only ever reached by an explicit admin action — the
 * payment flow only ever moves a booking pending → paid.
 */

export type PaymentStatusName = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED";
export type BookingStatusName = "pending" | "paid" | "confirmed" | "cancelled";

export const PAYMENT_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  CREATED: new Set<string>(["AUTHORIZED", "CAPTURED", "FAILED"]),
  AUTHORIZED: new Set<string>(["CAPTURED", "FAILED"]),
  CAPTURED: new Set<string>([]),
  FAILED: new Set<string>([]),
};

export const BOOKING_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  pending: new Set<string>(["paid", "cancelled"]),
  paid: new Set<string>(["confirmed", "cancelled"]),
  confirmed: new Set<string>(["cancelled"]),
  cancelled: new Set<string>([]),
};

/**
 * Admin-facing booking transition table. Broader than BOOKING_TRANSITIONS
 * because an operator may manually confirm a pending booking (e.g. an offline
 * payment) without going through the gateway. Preserved verbatim so the
 * existing admin update path keeps its current behaviour.
 */
export const BOOKING_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["paid", "confirmed", "cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export function canTransitionPayment(from: string, to: string): boolean {
  if (from === to) return true; // idempotent no-op
  return PAYMENT_TRANSITIONS[from]?.has(to) ?? false;
}

export function canTransitionBooking(from: string, to: string): boolean {
  if (from === to) return true; // idempotent no-op
  return BOOKING_TRANSITIONS[from]?.has(to) ?? false;
}

/**
 * Assert a transition is legal against the given table. On rejection logs an
 * `<entity>.illegal_transition` warning and throws ConflictError. A same-state
 * (idempotent) transition is always allowed and never logs.
 */
export function assertTransition(
  table: Record<string, ReadonlySet<string>>,
  from: string,
  to: string,
  ctx?: { requestId?: string; entity?: string }
): void {
  if (from === to) return;
  const allowed = table[from]?.has(to) ?? false;
  if (!allowed) {
    const entity = ctx?.entity ?? "state";
    logger.warn(`${entity}.illegal_transition`, {
      requestId: ctx?.requestId,
      from,
      to,
    });
    throw new ConflictError(`Illegal ${entity} transition: ${from} → ${to}`);
  }
}
