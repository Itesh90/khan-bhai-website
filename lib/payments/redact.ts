/**
 * Shared redaction policy — Khan Bhai S.
 *
 * One place defines what counts as a secret and how Razorpay ids are masked, so
 * the structured logger and the persistent payment-event audit log can never
 * drift apart. This module is intentionally a dependency-free leaf (no Razorpay
 * SDK, no Prisma) so it is safe to import from anywhere, including the logger.
 */

/** Razorpay id shapes we mask in free-form values. */
const RAZORPAY_ID_RE = /^(order|pay|rfnd|evt)_[A-Za-z0-9]+$/;

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /signature/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
];

const SENSITIVE_KEYS_EXACT = new Set(
  ["x-razorpay-signature", "razorpay_signature", "razorpaysignature"].map((k) =>
    k.toLowerCase()
  )
);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS_EXACT.has(lower)) return true;
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

/**
 * Redact a sensitive id for logging — keep the prefix + last 4 chars only.
 * e.g. pay_AbCdEf1234 → pay_***1234. Short / empty ids collapse to "***".
 */
export function redactId(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.length <= 8) return "***";
  const m = id.match(/^([a-z]+_)/);
  const prefix = m ? m[1] : "";
  return `${prefix}***${id.slice(-4)}`;
}

export interface RedactOptions {
  /** Include Error.stack in the output (dev only — never in prod logs). */
  includeErrorStack?: boolean;
}

function walk(value: unknown, includeStack: boolean): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return RAZORPAY_ID_RE.test(value) ? redactId(value) : value;
  }
  if (typeof value !== "object") return value; // number, boolean, bigint, etc.

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(includeStack ? { stack: value.stack } : {}),
    };
  }

  if (Array.isArray(value)) {
    return value.map((v) => walk(v, includeStack));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    out[k] = walk(v, includeStack);
  }
  return out;
}

/**
 * Recursively redact secrets and mask Razorpay ids in an arbitrary value.
 * Total: never throws, handles cycles-free plain data, Errors, and arrays.
 */
export function redactPayload(
  input: unknown,
  opts?: RedactOptions
): unknown {
  return walk(input, opts?.includeErrorStack ?? false);
}
