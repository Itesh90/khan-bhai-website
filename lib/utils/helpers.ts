/**
 * Shared helper utilities — Khan Bhai S.
 */

/**
 * Generate a unique booking reference.
 * Format: KB-<base36-timestamp>-<7-char-uppercase-random>
 *
 * Note: collisions are astronomically unlikely; the unique index on
 * `bookingRef` is the source of truth — callers should retry on P2002.
 */
export function generateBookingReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `KB-${timestamp}-${random}`;
}

/**
 * Format a number as INR currency.
 */
export function formatCurrency(
  amount: number,
  currency: string = "INR"
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format a date for display (en-IN long form).
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Calculate the number of paid nights between two dates.
 *
 * Returns 0 (not 1) when checkOut <= checkIn so the caller can treat that as a
 * validation error rather than silently charging for a zero-night stay.
 */
export function calculateNights(
  checkIn: Date | string,
  checkOut: Date | string
): number {
  const from = typeof checkIn === "string" ? new Date(checkIn) : checkIn;
  const to = typeof checkOut === "string" ? new Date(checkOut) : checkOut;

  if (
    !(from instanceof Date) ||
    !(to instanceof Date) ||
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime())
  ) {
    return 0;
  }

  const diffMs = to.getTime() - from.getTime();
  if (diffMs <= 0) return 0;

  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, nights);
}

/**
 * Basic email-shape check (RFC compliance is overkill — Zod's .email() is the
 * authoritative validator; this is for non-Zod consumers only).
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate an Indian mobile number — exactly 10 digits starting with 6/7/8/9,
 * after stripping any non-digit punctuation and an optional +91 / 91 prefix.
 *
 * Examples accepted:
 *   "9876543210"            ✔
 *   "+91 98765 43210"       ✔
 *   "91-98765-43210"        ✔
 *   "(98765) 43210"         ✔
 *
 * Examples rejected:
 *   "12345"                  ✘
 *   "5876543210"             ✘ (does not start with 6-9)
 *   "+1 4155551212"          ✘ (foreign)
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (typeof phone !== "string") return false;
  const digits = phone.replace(/\D/g, "");
  // Strip an optional leading "91" country code (only when total length is 12).
  const local = digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits;
  return /^[6-9]\d{9}$/.test(local);
}

/**
 * Normalize an Indian phone number to a canonical 10-digit form so that we
 * always store the same representation in the DB regardless of how the user
 * typed it.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

/**
 * Lowercase + trim an email so that we never store mixed-case duplicates.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Parse a query-string into an object. Repeated keys become arrays.
 */
export function parseQueryParams(
  queryString: string
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  const searchParams = new URLSearchParams(queryString);

  searchParams.forEach((value, key) => {
    if (params[key]) {
      const existing = params[key];
      params[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing as string, value];
    } else {
      params[key] = value;
    }
  });

  return params;
}

/**
 * Escape unsafe HTML so that user-supplied strings can be safely interpolated
 * into email templates. Use this for ANY value that originated from an HTTP
 * request body before placing it into HTML.
 */
export function escapeHtml(input: string | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
