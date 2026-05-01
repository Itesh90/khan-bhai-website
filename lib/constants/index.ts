// Site Configuration
export const SITE_NAME = "Khan Bhai S.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const CONTACT_EMAIL = process.env.ADMIN_EMAIL || "admin@khanbhaihotel.com";

// Booking Status
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
} as const;

// Pagination
export const ITEMS_PER_PAGE = 10;
export const MAX_ITEMS_PER_PAGE = 100;

// Form Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 20,
  MAX_MESSAGE_LENGTH: 1000,
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_BOOKINGS: process.env.NEXT_PUBLIC_ENABLE_BOOKINGS === "true",
  ENABLE_PAYMENTS: process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === "true",
  ENABLE_CONTACT: process.env.NEXT_PUBLIC_ENABLE_CONTACT === "true",
} as const;

// Routes
export const ROUTES = {
  HOME: "/",
  STAY: "/stay",
  RESTAURANT: "/restaurant",
  TRAVEL: "/travel",
  CHECKOUT: "/checkout",
  CONFIRMATION: "/confirmation",
  ADMIN: "/admin",
  LOGIN: "/admin/login",
} as const;

// API Routes
export const API_ROUTES = {
  AUTH: "/api/auth",
  BOOKINGS: "/api/bookings",
  PAYMENTS: "/api/payments",
  ROOMS: "/api/rooms",
  TOURS: "/api/tours",
  CONTACT: "/api/contact",
} as const;
