/**
 * Public booking projection — Khan Bhai S.
 *
 * Maps a full Booking record down to ONLY the non-sensitive fields safe to
 * expose on the public confirmation page. Pure + dependency-free so the field
 * allow-list can be property-tested without a database.
 */

/**
 * Public booking reference format. Accepts both the auto-generated layout
 * (`KB-<base36-timestamp>-<7-char-random>` from generateBookingReference)
 * and the dashed seeded layout (`KB-SEED-PAID-001`), as well as the single
 * compact form (`KB-ABC123`). 1–3 dashed groups, each 3–16 upper-alphanumerics.
 */
export const BOOKING_REF_RE = /^KB-[A-Z0-9]{3,16}(?:-[A-Z0-9]{3,16}){0,3}$/;

import { getScooter, getTaxiRoute } from "@/lib/constants/travel";

export interface PublicBookingInput {
  bookingRef: string;
  guestName: string;
  type: string;
  status: string;
  totalPrice: { toString(): string } | number;
  diningArea?: string | null;
  vehicleType?: string | null;
  room?: { name: string } | null;
  tour?: { name: string } | null;
  payment?: { method?: string | null; paymentMethod?: string | null } | null;
}

export interface PublicBookingResponse {
  bookingRef: string;
  guestFirstName: string;
  itemName: string;
  itemType: string;
  status: string;
  totalPrice: number;
  currency: string;
  paymentMethod?: string;
}

function itemNameFor(b: PublicBookingInput): string {
  if (b.room?.name) return b.room.name;
  if (b.tour?.name) return b.tour.name;
  if (b.type === "restaurant") return b.diningArea || "Table reservation";
  if (b.type === "scooter") {
    return getScooter(b.vehicleType ?? "")?.name || "Scooter rental";
  }
  if (b.type === "taxi") {
    return getTaxiRoute(b.vehicleType ?? "")?.name || "Taxi booking";
  }
  return "Your reservation";
}

/**
 * Project a booking to its public-safe shape. `paymentMethod` is included only
 * once the booking is paid or confirmed.
 */
export function toPublicBooking(b: PublicBookingInput): PublicBookingResponse {
  const guestFirstName = (b.guestName ?? "").trim().split(/\s+/)[0] ?? "";
  const res: PublicBookingResponse = {
    bookingRef: b.bookingRef,
    guestFirstName,
    itemName: itemNameFor(b),
    itemType: b.type,
    status: b.status,
    totalPrice:
      typeof b.totalPrice === "number"
        ? b.totalPrice
        : Number(b.totalPrice.toString()),
    currency: "INR",
  };
  if ((b.status === "paid" || b.status === "confirmed") && b.payment) {
    const method = b.payment.method ?? b.payment.paymentMethod ?? undefined;
    if (method) res.paymentMethod = method;
  }
  return res;
}
