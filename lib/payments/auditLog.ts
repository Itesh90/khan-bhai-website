/**
 * Payment event audit log — Khan Bhai S.
 *
 * Append-only record of everything that happens to a payment (order created,
 * verify attempts, webhook deliveries, refunds). Lets us reconstruct a payment's
 * full history from the database without grepping logs, and provides
 * event-id-level idempotency for webhook replays.
 *
 * Redaction: every persisted `payload` is passed through the shared
 * `redactPayload` policy so secrets and full Razorpay ids never land in the DB.
 *
 * Transaction-awareness: callers may pass a Prisma transaction client so the
 * audit row commits atomically with the state change it records.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { redactPayload } from "@/lib/payments/redact";
import { logger } from "@/lib/logger";

export type PaymentEventKind =
  | "ORDER_CREATED"
  | "VERIFY_ATTEMPTED"
  | "VERIFY_SUCCEEDED"
  | "VERIFY_FAILED"
  | "WEBHOOK_RECEIVED"
  | "WEBHOOK_PROCESSED"
  | "WEBHOOK_REJECTED"
  | "REFUND_INITIATED"
  | "REFUND_PROCESSED";

export interface RecordPaymentEventInput {
  kind: PaymentEventKind;
  paymentId?: string | null;
  bookingId?: string | null;
  /** Razorpay webhook event id (`evt_…`) — drives event-level idempotency. */
  eventId?: string | null;
  /** Razorpay event name, e.g. "payment.captured". */
  razorpayEventName?: string | null;
  /** Arbitrary context — redacted before persistence. */
  payload?: unknown;
  /** True once the state change this event drives has committed. */
  processed?: boolean;
  error?: string | null;
  requestId: string;
  /** Optional Prisma transaction client so callers can write in their own tx. */
  tx?: Prisma.TransactionClient;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Persist a payment event. Re-throws P2002 (unique eventId violation) so callers
 * can use it for race-safe webhook deduplication, and re-throws any error when
 * running inside a caller-supplied transaction (so the tx rolls back). Outside a
 * transaction, non-P2002 failures are logged and swallowed — the audit log must
 * never break the payment flow.
 */
export async function recordPaymentEvent(
  input: RecordPaymentEventInput
): Promise<void> {
  const client: DbClient = input.tx ?? prisma;
  try {
    await client.paymentEvent.create({
      data: {
        kind: input.kind,
        paymentId: input.paymentId ?? null,
        bookingId: input.bookingId ?? null,
        eventId: input.eventId ?? null,
        razorpayEventName: input.razorpayEventName ?? null,
        payload:
          input.payload === undefined
            ? undefined
            : (redactPayload(input.payload) as Prisma.InputJsonValue),
        processed: input.processed ?? false,
        error: input.error ?? null,
        requestId: input.requestId,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw err; // duplicate eventId — caller handles dedup
    }
    if (input.tx) {
      throw err; // inside caller's transaction — must roll back atomically
    }
    logger.error("auditLog.record_failed", {
      requestId: input.requestId,
      kind: input.kind,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Has a Razorpay webhook event id already been fully processed?
 * Returns true when a payment_events row for this eventId exists with
 * processed=true. Used as the fast-path duplicate check before the unique-index
 * insert provides the race-safe guarantee.
 */
export async function isWebhookEventProcessed(
  eventId: string
): Promise<boolean> {
  if (!eventId) return false;
  const existing = await prisma.paymentEvent.findFirst({
    where: { eventId, processed: true },
    select: { id: true },
  });
  return existing !== null;
}
