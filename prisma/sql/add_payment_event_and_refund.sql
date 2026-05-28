-- Additive migration: payment_events (audit log) + refunds
-- Khan Bhai S. — Razorpay payment hardening, phase 2 (surface consolidation).
--
-- SAFE TO RUN ON A LIVE DB: this only CREATEs new types/tables/indexes and adds
-- foreign keys ON the new tables. It does NOT ALTER any existing column on the
-- `payments` or `bookings` tables, so in-flight payments are unaffected.
--
-- HOW TO APPLY:
--   * Established workflow (db push):  `npm run db:push`  generates these tables
--     directly from prisma/schema.prisma — you do not need to run this file.
--   * Prefer raw SQL / a managed console: run this file once against the target
--     database (Neon / Supabase / Postgres).
--
-- This mirrors exactly what Prisma derives from the schema models PaymentEvent
-- and Refund, so either path converges on the same shape.

-- ── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE "PaymentEventKind" AS ENUM (
  'ORDER_CREATED',
  'VERIFY_ATTEMPTED',
  'VERIFY_SUCCEEDED',
  'VERIFY_FAILED',
  'WEBHOOK_RECEIVED',
  'WEBHOOK_PROCESSED',
  'WEBHOOK_REJECTED',
  'REFUND_INITIATED',
  'REFUND_PROCESSED'
);

CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PROCESSED', 'FAILED');

-- ── payment_events (append-only audit log) ───────────────────────────────────
CREATE TABLE "payment_events" (
  "id"                TEXT NOT NULL,
  "paymentId"         TEXT,
  "bookingId"         TEXT,
  "kind"              "PaymentEventKind" NOT NULL,
  "eventId"           TEXT,
  "razorpayEventName" TEXT,
  "payload"           JSONB,
  "processed"         BOOLEAN NOT NULL DEFAULT false,
  "error"             TEXT,
  "requestId"         TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_events_eventId_key" ON "payment_events"("eventId");
CREATE INDEX "payment_events_paymentId_idx" ON "payment_events"("paymentId");
CREATE INDEX "payment_events_bookingId_idx" ON "payment_events"("bookingId");
CREATE INDEX "payment_events_createdAt_idx" ON "payment_events"("createdAt");
CREATE INDEX "payment_events_kind_createdAt_idx" ON "payment_events"("kind", "createdAt");

-- ── refunds ──────────────────────────────────────────────────────────────────
CREATE TABLE "refunds" (
  "id"               TEXT NOT NULL,
  "paymentId"        TEXT NOT NULL,
  "razorpayRefundId" TEXT NOT NULL,
  "amount"           DECIMAL(10,2) NOT NULL,
  "currency"         TEXT NOT NULL DEFAULT 'INR',
  "status"           "RefundStatus" NOT NULL DEFAULT 'INITIATED',
  "reason"           TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refunds_razorpayRefundId_key" ON "refunds"("razorpayRefundId");
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");
CREATE INDEX "refunds_status_idx" ON "refunds"("status");
CREATE INDEX "refunds_createdAt_idx" ON "refunds"("createdAt");

-- ── Foreign keys (only on the NEW tables) ────────────────────────────────────
ALTER TABLE "payment_events"
  ADD CONSTRAINT "payment_events_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_events"
  ADD CONSTRAINT "payment_events_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
