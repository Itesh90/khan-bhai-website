/**
 * Domain Types — Khan Bhai S.
 *
 * Mirrors the Prisma schema (prisma/schema.prisma). Prefer importing the
 * Prisma-generated types from `@/lib/db` directly inside server code; the
 * interfaces below are kept for client/component consumers that don't pull in
 * `@prisma/client`.
 */

// ─────────────────────────────────────────────
// Enum-like literals (keep in sync with prisma/schema.prisma)
// ─────────────────────────────────────────────
export type AdminRole = "SUPERADMIN" | "STAFF";
export type BookingType = "room" | "tour";
export type BookingStatus = "pending" | "paid" | "confirmed" | "cancelled";
export type PaymentStatusLiteral =
  | "CREATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED";
export type ContactType = "room" | "tour" | "general";

// ─────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────
export interface IBooking {
  id: string;
  bookingRef: string;
  type: BookingType;
  roomId?: string | null;
  tourId?: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numberOfGuests: number;
  checkInDate?: Date | string | null;
  checkOutDate?: Date | string | null;
  specialRequests?: string | null;
  status: BookingStatus;
  totalPrice: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─────────────────────────────────────────────
// Room
// ─────────────────────────────────────────────
export interface IRoom {
  id: string;
  name: string;
  description: string;
  price: number;
  maxGuests: number;
  amenities: string[];
  images: string[];
  available: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─────────────────────────────────────────────
// Tour
// ─────────────────────────────────────────────
export interface ITour {
  id: string;
  name: string;
  description: string;
  destination: string;
  price: number;
  duration: number;
  maxGuests: number;
  images: string[];
  /** Either a string or a structured itinerary array (DB column is JSON). */
  itinerary: string | Array<{ day: number; title: string; description: string }>;
  includes: string[];
  available: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────
export interface IPayment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  status: PaymentStatusLiteral;
  method?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─────────────────────────────────────────────
// Contact Inquiry
// ─────────────────────────────────────────────
export interface IContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  type: ContactType;
  status: string;
  read: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────
export interface IAdmin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  last_login?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─────────────────────────────────────────────
// Form Data Types
// ─────────────────────────────────────────────
export interface BookingFormData {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  numberOfGuests: number;
  checkInDate?: string;
  checkOutDate?: string;
  specialRequests?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  type?: ContactType;
}
