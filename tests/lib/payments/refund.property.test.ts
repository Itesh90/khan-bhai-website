// Feature: razorpay-payment-hardening, Property 13 + 14: refund guards and booking invariance
//
// P13 — refund initiation guards & atomicity:
//   • payment.status !== CAPTURED        → ConflictError, no Refund row, no gateway call
//   • requested > captured - reserved    → ValidationError, no Refund row, no gateway call
//   • otherwise                          → one Refund(INITIATED) + one REFUND_INITIATED
//                                          audit event committed together
// P14 — refunds never mutate Booking.status across initiate + refund.processed/failed.
//
// Drives the real initiateRefund + handleWebhook (refund branch) against the
// in-memory Prisma fake, with the Razorpay refund call spied.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { createFakePrisma, type SeedData } from "../../helpers/fakePrisma";
import { ConflictError, ValidationError } from "@/lib/errors";
import type { WebhookEnvelope } from "@/lib/payments/webhookSchema";

const PAY_DB_ID = "paydb_refund_0001";
const PAY_ID = "pay_REFUNDTEST0001";
const RFND_ID = "rfnd_NEWREFUND00001";
const BID = "bkg_refund_0001";

const db = vi.hoisted(() => {
  let current: any = null;
  return {
    set(f: any) {
      current = f;
    },
    get current() {
      return current;
    },
    proxy: new Proxy(
      {},
      { get: (_t, prop) => (current ? current[prop as keyof typeof current] : undefined) }
    ),
  };
});

vi.mock("@/lib/db/client", () => ({ prisma: db.proxy, checkDatabaseConnection: async () => true }));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  newRequestId: () => "req_refund_test",
}));

const createRefund = vi.hoisted(() =>
  vi.fn(async (_paymentId: string, paise: number) => ({
    id: RFND_ID,
    amount: paise,
    status: "processed",
  }))
);
vi.mock("@/lib/payments/razorpay", () => ({
  createRazorpayRefund: createRefund,
  verifyRazorpaySignature: () => true,
  verifyRazorpayWebhookSignature: () => true,
  fetchRazorpayPayment: vi.fn(),
  createRazorpayOrder: vi.fn(),
  RAZORPAY_KEY_ID: "rzp_test_key_id",
  redactId: (s: string) => s,
}));

vi.mock("@/lib/services/emailService", () => ({
  sendPaymentConfirmation: vi.fn(async () => {}),
  sendAdminPaymentNotification: vi.fn(async () => {}),
  sendPaymentFailedNotification: vi.fn(async () => {}),
  sendOwnerWhatsAppNotice: vi.fn(async () => {}),
  sendRefundProcessedEmail: vi.fn(async () => {}),
}));

import { initiateRefund, handleWebhook } from "@/lib/services/paymentService";

type PaymentStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED";
type RefundStatus = "INITIATED" | "PROCESSED" | "FAILED";

function seedFor(opts: {
  paymentStatus: PaymentStatus;
  capturedRupees: number;
  priorRefundRupees?: number;
  priorRefundStatus?: RefundStatus;
  bookingStatus?: string;
}): SeedData {
  const refunds =
    opts.priorRefundRupees && opts.priorRefundRupees > 0
      ? [
          {
            id: "rfnddb_prior",
            paymentId: PAY_DB_ID,
            razorpayRefundId: "rfnd_PRIOR00000001",
            amount: opts.priorRefundRupees,
            currency: "INR",
            status: opts.priorRefundStatus ?? "INITIATED",
            reason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      : [];
  return {
    bookings: [
      {
        id: BID,
        bookingRef: "KB-RFND-0001",
        type: "room",
        status: opts.bookingStatus ?? "paid",
        totalPrice: opts.capturedRupees,
        guestName: "Test Guest",
        guestEmail: "guest@example.com",
        guestPhone: "+910000000000",
        numberOfGuests: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    payments: [
      {
        id: PAY_DB_ID,
        bookingId: BID,
        amount: opts.capturedRupees,
        currency: "INR",
        paymentMethod: "razorpay",
        razorpayOrderId: "order_REFUNDTEST001",
        razorpayPaymentId: PAY_ID,
        razorpaySignature: "sig",
        status: opts.paymentStatus,
        method: "upi",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    refunds,
  };
}

function refundWebhook(outcome: "processed" | "failed"): WebhookEnvelope {
  return {
    event: outcome === "processed" ? "refund.processed" : "refund.failed",
    payload: {
      refund: {
        entity: {
          id: RFND_ID,
          payment_id: PAY_ID,
          amount: 100,
          currency: "INR",
          status: outcome,
          error_description: outcome === "failed" ? "bank declined" : null,
        },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Property 13 — refund initiation guards and atomicity", () => {
  it("enforces status, balance, and atomic write across all input tuples", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          paymentStatus: fc.constantFrom<PaymentStatus>(
            "CREATED",
            "AUTHORIZED",
            "CAPTURED",
            "FAILED"
          ),
          capturedRupees: fc.integer({ min: 1, max: 100_000 }),
          priorRupees: fc.integer({ min: 0, max: 100_000 }),
          priorStatus: fc.constantFrom<RefundStatus>("INITIATED", "PROCESSED", "FAILED"),
          requestedRupees: fc.option(fc.integer({ min: 1, max: 200_000 }), {
            nil: undefined,
          }),
        }),
        async (s) => {
          vi.clearAllMocks();
          const prior = Math.min(s.priorRupees, s.capturedRupees);
          const fake = createFakePrisma(
            seedFor({
              paymentStatus: s.paymentStatus,
              capturedRupees: s.capturedRupees,
              priorRefundRupees: prior,
              priorRefundStatus: s.priorStatus,
            })
          );
          db.set(fake);

          const priorCount = prior > 0 ? 1 : 0;
          // Reserved mirrors the service: FAILED refunds free up their balance.
          const reservedPaise = s.priorStatus === "FAILED" ? 0 : prior * 100;
          const availablePaise = s.capturedRupees * 100 - reservedPaise;
          const requestedPaise =
            s.requestedRupees !== undefined ? s.requestedRupees * 100 : availablePaise;

          const run = () => initiateRefund(PAY_DB_ID, { amount: s.requestedRupees });

          if (s.paymentStatus !== "CAPTURED") {
            await expect(run()).rejects.toBeInstanceOf(ConflictError);
            expect(createRefund).not.toHaveBeenCalled();
            expect(fake._state.refunds.size).toBe(priorCount);
            return;
          }
          if (availablePaise <= 0) {
            await expect(run()).rejects.toBeInstanceOf(ConflictError);
            expect(createRefund).not.toHaveBeenCalled();
            expect(fake._state.refunds.size).toBe(priorCount);
            return;
          }
          if (requestedPaise > availablePaise) {
            await expect(run()).rejects.toBeInstanceOf(ValidationError);
            expect(createRefund).not.toHaveBeenCalled();
            expect(fake._state.refunds.size).toBe(priorCount);
            return;
          }

          // Success path.
          const refund = await run();
          expect(refund.status).toBe("INITIATED");
          expect(Math.round(Number(refund.amount) * 100)).toBe(requestedPaise);
          expect(fake._state.refunds.size).toBe(priorCount + 1);
          const events = fake._state.paymentEvents.filter(
            (e: any) => e.kind === "REFUND_INITIATED"
          );
          expect(events).toHaveLength(1);
          expect(events[0].processed).toBe(true);
        }
      ),
      { numRuns: 400 }
    );
  });

  it("defaults to a full refund of the available balance when amount is omitted", async () => {
    const fake = createFakePrisma(seedFor({ paymentStatus: "CAPTURED", capturedRupees: 1000 }));
    db.set(fake);
    const refund = await initiateRefund(PAY_DB_ID, {});
    expect(Number(refund.amount)).toBe(1000);
    expect(createRefund).toHaveBeenCalledTimes(1);
  });
});

describe("Property 14 — refunds never mutate booking status", () => {
  it("booking status is unchanged across initiate → refund.processed", async () => {
    const fake = createFakePrisma(seedFor({ paymentStatus: "CAPTURED", capturedRupees: 1000 }));
    db.set(fake);
    const before = [...fake._state.bookings.values()][0].status;
    await initiateRefund(PAY_DB_ID, {});
    await handleWebhook(refundWebhook("processed"), { requestId: "req" });
    const after = [...fake._state.bookings.values()][0].status;
    expect(after).toBe(before);
    expect([...fake._state.refunds.values()][0].status).toBe("PROCESSED");
  });

  it("booking status is unchanged across initiate → refund.failed", async () => {
    const fake = createFakePrisma(seedFor({ paymentStatus: "CAPTURED", capturedRupees: 1000 }));
    db.set(fake);
    const before = [...fake._state.bookings.values()][0].status;
    await initiateRefund(PAY_DB_ID, {});
    await handleWebhook(refundWebhook("failed"), { requestId: "req" });
    const after = [...fake._state.bookings.values()][0].status;
    expect(after).toBe(before);
    expect([...fake._state.refunds.values()][0].status).toBe("FAILED");
  });

  it("property: across any refund-webhook outcome, booking status holds", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom("processed", "failed"), async (outcome) => {
        vi.clearAllMocks();
        const fake = createFakePrisma(
          seedFor({ paymentStatus: "CAPTURED", capturedRupees: 1000, bookingStatus: "paid" })
        );
        db.set(fake);
        await initiateRefund(PAY_DB_ID, {});
        await handleWebhook(refundWebhook(outcome as "processed" | "failed"), {
          requestId: "req",
        });
        expect([...fake._state.bookings.values()][0].status).toBe("paid");
      }),
      { numRuns: 100 }
    );
  });
});
