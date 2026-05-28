import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * Razorpay configuration — Khan Bhai S.
 *
 * Reads credentials from environment variables:
 *   - NEXT_PUBLIC_RAZORPAY_KEY_ID  (safe to expose, used on client)
 *   - RAZORPAY_KEY_SECRET          (server-only, never expose)
 *   - RAZORPAY_WEBHOOK_SECRET      (server-only, used for webhook signature verification)
 *
 * SECURITY:
 *   - Secrets are NEVER returned to the client.
 *   - Signature verification uses HMAC-SHA256 + crypto.timingSafeEqual.
 *   - We do not log secret material, signatures, or full payment IDs.
 *
 * IMPORTANT — Lazy initialization:
 *   We do NOT instantiate the Razorpay SDK at module-load time. Doing so
 *   crashes `next build` when env vars are absent in the build environment
 *   (the SDK constructor throws). Instead we use `getRazorpay()` which
 *   instantiates on first request and caches the instance globally.
 */

function getKeyId(): string {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    ""
  );
}

function getKeySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || "";
}

function getWebhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET || "";
}

/** Public, safe-to-expose key id used by the client SDK. */
export const RAZORPAY_KEY_ID = getKeyId();
// Intentionally NOT exporting RAZORPAY_KEY_SECRET — keep it inside this module.

const globalForRazorpay = global as unknown as { __razorpay?: Razorpay };

/**
 * Lazily build (and cache) a Razorpay client. Throws if credentials are
 * missing — but only at request time, not at build time. Exported so the
 * cached-singleton behaviour can be property-tested.
 */
export function getRazorpay(): Razorpay {
  if (globalForRazorpay.__razorpay) return globalForRazorpay.__razorpay;

  const keyId = getKeyId();
  const keySecret = getKeySecret();

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured. " +
        "Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment."
    );
  }

  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  if (process.env.NODE_ENV !== "production") {
    globalForRazorpay.__razorpay = instance;
  } else {
    globalForRazorpay.__razorpay = instance;
  }
  return instance;
}

/**
 * Create a Razorpay order. Amount is in rupees and will be converted to paise.
 * Idempotency: callers should pass a stable `receipt` (booking ref) so duplicate
 * order-creation calls for the same booking are visible in the Razorpay dashboard.
 */
export async function createRazorpayOrder(
  amountInRupees: number,
  currency: string = "INR",
  receipt: string,
  notes: Record<string, string> = {}
): Promise<{
  id: string;
  amount: number | string;
  currency: string;
  receipt?: string;
  status: string;
}> {
  if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
    throw new Error("createRazorpayOrder: amount must be a positive number");
  }
  // Hard sanity cap to prevent ridiculous orders from a tampered total.
  if (amountInRupees > 10_000_000) {
    throw new Error("createRazorpayOrder: amount exceeds sanity limit");
  }

  const order = await getRazorpay().orders.create({
    amount: Math.round(amountInRupees * 100), // paise
    currency,
    receipt,
    notes: { project: "Khan Bhai S.", ...notes },
    payment_capture: true,
  } as any);
  return order as any;
}

/**
 * Fetch a payment from Razorpay by id (used to double-check status server-side).
 */
export async function fetchRazorpayPayment(paymentId: string) {
  return getRazorpay().payments.fetch(paymentId);
}

/**
 * Issue a refund against a captured payment. Amount is in paise (integer).
 */
export async function createRazorpayRefund(
  paymentId: string,
  amountInPaise: number,
  notes: Record<string, string> = {}
): Promise<{
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  payment_id: string;
}> {
  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error("createRazorpayRefund: amount must be a positive integer (paise)");
  }
  const refund = await getRazorpay().payments.refund(paymentId, {
    amount: amountInPaise,
    notes: { project: "Khan Bhai S.", ...notes },
  } as any);
  return refund as any;
}

/**
 * Fetch an order from Razorpay by id.
 */
export async function fetchRazorpayOrder(orderId: string) {
  return getRazorpay().orders.fetch(orderId);
}

/**
 * Constant-time string comparison helper.
 *
 * Buffers must be the same length for `crypto.timingSafeEqual`. We always
 * compute `expected` first; if `actual` has a different length we still do a
 * dummy compare of equal-length buffers to avoid leaking via early-return
 * timing.
 */
function timingSafeEqualHex(expectedHex: string, actualHex: string): boolean {
  // Hex strings only: anything else is a malformed signature.
  if (!/^[a-f0-9]+$/i.test(actualHex)) {
    // still do a dummy compare for timing parity.
    const dummy = Buffer.alloc(expectedHex.length / 2);
    try {
      crypto.timingSafeEqual(dummy, dummy);
    } catch {
      /* noop */
    }
    return false;
  }

  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(expectedHex, "hex");
    b = Buffer.from(actualHex, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) {
    // Lengths differ → cannot be equal. Run a same-length compare for parity.
    try {
      crypto.timingSafeEqual(a, a);
    } catch {
      /* noop */
    }
    return false;
  }
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verify a Razorpay payment signature.
 *
 * `generated_signature = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)`
 *
 * Uses `crypto.timingSafeEqual` to prevent timing attacks. Returns false for
 * any malformed input — never throws.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = getKeySecret();
  if (!keySecret) return false;
  if (typeof orderId !== "string" || typeof paymentId !== "string") return false;
  if (typeof signature !== "string" || signature.length === 0) return false;

  // Hard bounds — Razorpay ids are short. This rejects oversized payloads
  // that could be used to waste CPU before crypto is even invoked.
  if (orderId.length > 64 || paymentId.length > 64 || signature.length > 256) {
    return false;
  }

  // Razorpay ids look like "order_xxx" / "pay_xxx". Reject suspicious payloads
  // before doing crypto work.
  if (!/^order_[A-Za-z0-9]+$/.test(orderId)) return false;
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) return false;

  // A valid Razorpay signature is hex. Reject non-hex before any crypto work so
  // malformed input never costs an HMAC computation (Req 4.3, 4.4).
  const normalizedSignature = signature.trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(normalizedSignature)) return false;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return timingSafeEqualHex(expected, normalizedSignature);
}

/**
 * Verify a Razorpay webhook signature.
 * Razorpay sends the signature in the `x-razorpay-signature` header.
 *
 * IMPORTANT: must be called with the RAW request body (no JSON re-stringify).
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) return false;
  if (typeof rawBody !== "string" || rawBody.length === 0) return false;
  if (typeof signature !== "string" || signature.length === 0) return false;
  if (signature.length > 256) return false; // sanity bound

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  return timingSafeEqualHex(expected, signature.trim().toLowerCase());
}

// `redactId` now lives in the dependency-free redaction module so the logger
// and audit log share one masking policy. Re-exported here for existing imports.
export { redactId } from "./redact";
