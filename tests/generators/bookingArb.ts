import fc from "fast-check";
import { rupeesArb } from "./paiseArb";

export type BookingStatus = "pending" | "paid" | "confirmed" | "cancelled";
export type BookingType = "room" | "tour" | "restaurant";

export const bookingStatusArb: fc.Arbitrary<BookingStatus> = fc.constantFrom(
  "pending",
  "paid",
  "confirmed",
  "cancelled"
);

export const bookingTypeArb: fc.Arbitrary<BookingType> = fc.constantFrom(
  "room",
  "tour",
  "restaurant"
);

export interface BookingRecord {
  id: string;
  bookingRef: string;
  type: BookingType;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numberOfGuests: number;
  status: BookingStatus;
  totalPrice: number;
}

/** Deterministic-ish Booking record arbitrary. */
export const bookingArb: fc.Arbitrary<BookingRecord> = fc.record({
  id: fc.uuid(),
  bookingRef: fc
    .array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")), {
      minLength: 6,
      maxLength: 12,
    })
    .map((cs) => `KB-${cs.join("")}`),
  type: bookingTypeArb,
  guestName: fc.constantFrom("Asha Khan", "Ravi Patel", "Sara Lee", "Omar Said"),
  guestEmail: fc.emailAddress(),
  guestPhone: fc.constantFrom("9876543210", "9123456780", "9988776655"),
  numberOfGuests: fc.integer({ min: 1, max: 12 }),
  status: bookingStatusArb,
  totalPrice: rupeesArb,
});
