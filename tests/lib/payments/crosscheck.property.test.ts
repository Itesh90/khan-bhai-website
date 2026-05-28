// Feature: razorpay-payment-hardening, Property 5: Razorpay-side cross-check rejects mismatches
//
// For a signature-valid verify, confirmPayment fetches the payment from Razorpay
// and re-checks it. If Razorpay reports a DIFFERENT order_id, or an amount (in
// paise) that differs from Math.round(Payment.amount * 100), the verify is
// rejected with a ValidationError and NO capture is written — the payment stays
// CREATED, the booking stays pending, and a VERIFY_FAILED audit row is recorded.
// The mismatch is caught before the state-machine transaction, so payment.update
// is never reached.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { createFakePrisma, type FakePrisma } from "../../helpers/fakePrisma";
import { ValidationError } from "@/lib/errors";

const BID = "bkg_xcheck_0001";
const ORDER_ID = "order_XCHECKTEST001";
const PAY_ID = "pay_XCHECKTEST001";
const AMOUNT_RUPEES = 1000;
const AMOUNT_PAISE = 100000;

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
  newRequestId: () => "req_xcheck_test",
}));

const fetchPayment = vi.hoisted(() => vi.fn());
vi.mock("@/lib/payments/razorpay", () => ({
  fetchRazorpayPayment: fetchPayment,
  verifyRazorpaySignature: () => true,
  verifyRazorpayWebhookSignature: () => true,
  createRazorpayOrder: vi.fn(),
  createRazorpayRefund: vi.fn(),
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

import { confirmPayment } from "@/lib/services/paymentService";
import { sendPaymentConfirmation } from "@/lib/services/emailService";

function freshFake(): FakePrisma {
  const f = createFakePrisma({
    bookings: [
      {
        id: BID,
        bookingRef: "KB-XCHK-0001",
        type: "room",
        status: "pending",
        totalPrice: AMOUNT_RUPEES,
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
        id: "paydb_xcheck_0001",
        bookingId: BID,
        amount: AMOUNT_RUPEES,
        currency: "INR",
        paymentMethod: "razorpay",
        razorpayOrderId: ORDER_ID,
        razorpayPaymentId: null,
        razorpaySignature: null,
        status: "CREATED",
        method: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });
  db.set(f);
  return f;
}

function call() {
  return confirmPayment({
    bookingId: BID,
    razorpayOrderId: ORDER_ID,
    razorpayPaymentId: PAY_ID,
    razorpaySignature: "sig_valid_hex",
    requestId: "req_xcheck_test",
  });
}

function assertNoCapture(fake: FakePrisma) {
  const p = [...fake._state.payments.values()][0];
  const b = [...fake._state.bookings.values()][0];
  expect(p.status).toBe("CREATED");
  expect(p.razorpayPaymentId).toBeNull();
  expect(b.status).toBe("pending");
  const failed = fake._state.paymentEvents.filter((e: any) => e.kind === "VERIFY_FAILED");
  expect(failed.length).toBeGreaterThanOrEqual(1);
  expect(
    fake._state.paymentEvents.some((e: any) => e.kind === "VERIFY_SUCCEEDED")
  ).toBe(false);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Property 5 — Razorpay cross-check rejects mismatches", () => {
  it("rejects a mismatched order_id and writes no capture", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 4, maxLength: 16 })
          .map((s) => `order_${s.replace(/[^A-Za-z0-9]/g, "X")}1`)
          .filter((id) => id !== ORDER_ID),
        async (otherOrderId) => {
          vi.clearAllMocks();
          const fake = freshFake();
          fetchPayment.mockResolvedValue({
            status: "captured",
            method: "upi",
            order_id: otherOrderId, // mismatch
            amount: AMOUNT_PAISE,
          });

          await expect(call()).rejects.toBeInstanceOf(ValidationError);
          assertNoCapture(fake);
          expect(vi.mocked(sendPaymentConfirmation)).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 200 }
    );
  });

  it("rejects a mismatched amount and writes no capture", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100_000_000 }).filter((p) => p !== AMOUNT_PAISE),
        async (otherPaise) => {
          vi.clearAllMocks();
          const fake = freshFake();
          fetchPayment.mockResolvedValue({
            status: "captured",
            method: "upi",
            order_id: ORDER_ID,
            amount: otherPaise, // mismatch vs Math.round(1000 * 100)
          });

          await expect(call()).rejects.toBeInstanceOf(ValidationError);
          assertNoCapture(fake);
          expect(vi.mocked(sendPaymentConfirmation)).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 200 }
    );
  });

  it("accepts a fully matching cross-check (control)", async () => {
    const fake = freshFake();
    fetchPayment.mockResolvedValue({
      status: "captured",
      method: "upi",
      order_id: ORDER_ID,
      amount: AMOUNT_PAISE,
    });
    const res = await call();
    expect(res.payment.status).toBe("CAPTURED");
    expect([...fake._state.bookings.values()][0].status).toBe("paid");
    expect(vi.mocked(sendPaymentConfirmation)).toHaveBeenCalledTimes(1);
  });
});
