/**
 * Structured JSON logger — Khan Bhai S.
 *
 * Designed for serverless / edge-friendly environments. Emits one JSON object
 * per log entry to stdout/stderr so that log aggregators (Vercel, Datadog,
 * Logtail, etc.) can index it.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("booking.created", { bookingId, requestId });
 *   logger.warn("payment.signature_mismatch", { orderId });
 *   logger.error("payment.confirm_failed", { error });
 *
 * In development we pretty-print to make local debugging humane.
 */
/* eslint-disable no-console */

import { redactPayload } from "@/lib/payments/redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const ENV_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Redact a log context using the shared payment redaction policy. Errors keep
 * their stack only outside production; Razorpay ids are masked to prefix_***last4.
 */
function redact(obj: unknown): unknown {
  return redactPayload(obj, { includeErrorStack: !IS_PROD });
}

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  ctx?: unknown;
}

function emit(entry: LogEntry): void {
  if (LEVEL_RANK[entry.level] < LEVEL_RANK[ENV_LEVEL]) return;

  const payload: LogEntry = {
    level: entry.level,
    msg: entry.msg,
    ts: entry.ts,
    ...(entry.ctx !== undefined ? { ctx: redact(entry.ctx) } : {}),
  };

  const sink =
    entry.level === "error" || entry.level === "warn"
      ? console.error
      : console.log;

  if (IS_PROD) {
    // Single-line JSON for log aggregators.
    sink(JSON.stringify(payload));
  } else {
    // Pretty for local dev.
    const tag = entry.level.toUpperCase().padEnd(5);
    const prefix = `[${entry.ts}] ${tag} ${entry.msg}`;
    if (payload.ctx !== undefined) {
      sink(prefix, payload.ctx);
    } else {
      sink(prefix);
    }
  }
}

function log(level: LogLevel, msg: string, ctx?: unknown): void {
  emit({ level, msg, ts: new Date().toISOString(), ctx });
}

export const logger = {
  debug: (msg: string, ctx?: unknown) => log("debug", msg, ctx),
  info: (msg: string, ctx?: unknown) => log("info", msg, ctx),
  warn: (msg: string, ctx?: unknown) => log("warn", msg, ctx),
  error: (msg: string, ctx?: unknown) => log("error", msg, ctx),
} as const;

/**
 * Generate a short request id for log correlation.
 * Format: 12 hex chars, e.g. "8f3a1c0b9e7d".
 */
export function newRequestId(): string {
  // Avoid pulling in the `crypto` module on every call; Math.random is fine
  // for a non-security correlation id.
  return Math.random().toString(16).slice(2, 14).padEnd(12, "0");
}
