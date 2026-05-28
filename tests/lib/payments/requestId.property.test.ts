// Feature: razorpay-payment-hardening, Property 17: request-id correlation
//
// For any request to a payment route, the x-request-id response header equals the
// requestId stamped on every PaymentEvent audit row written while handling that
// request, on both the success and error paths, and a fresh id is minted per
// request. Drives the real verify route POST handler against the Prisma fake.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { NextRequest } from "next/server";
import { createFakePrisma, type FakePrisma } from "../../helpers/fakePrisma";

const BID = "bkg_reqid_0001";
const ORDER_ID = "order_REQIDTEST0001";
const PAY_ID = "pay_REQIDTEST0001";
const SIGNATURE = "abcdef0123456789";

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

// Real-ish unique id per call so correlation is meaningful (not a constant).
const idGen = vi.hoisted(() => {
  let n = 0;
  return () => `req_gen_${++n}`;
});
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  newRequestId: idGen,
}));

const verifySig = vi.hoisted(() => vi.fn(() => true));
vi.mock("@/lib/payments/razorpay", () => ({
  verifyRazorpaySignature: verifySig,
  verifyRazorpayWebhookSignature: () => true,
  fetchRazorpayPayment: vi.fn(async () => ({
    status: "captured",
    method: "upi",
    order_id: ORDER_ID,
    amount: 100000,
  })),
  createRazorpayOrder: vi.fn(),
  createRazorpayRefund: vi.fn(),
  RAZORPAY_KEY_ID: "rzp_test_key_id",
  redactId: (s: string) => s,
}));

vi.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: () => ({ ok: true, remaining: 999, limit: 1000, resetAt: Date.now() + 60000 }),
  getClientIp: () => "127.0.0.1",
  rateLimitHeaders: () => ({}),
  RATE_LIMITS: {
    PAYMENT_VERIFY: { limit: 5, windowMs: 3_600_000 },
    PAYMENT_CREATE: { limit: 10, windowMs: 3_600_000 },
    BOOKING_BY_REF: { limit: 60, windowMs: 60_000 },
  },
}));

vi.mock("@/lib/services/emailService", () => ({
  sendPaymentConfirmation: vi.fn(async () => {}),
  sendAdminPaymentNotification: vi.fn(async () => {}),
  sendPaymentFailedNotification: vi.fn(async () => {}),
  sendOwnerWhatsAppNotice: vi.fn(async () => {}),
  sendRefundProcessedEmail: vi.fn(async () => {}),
}));

import { POST } from "@/app/api/payments/verify/route";

function freshFake(): FakePrisma {
  const f = createFakePrisma({
    bookings: [
      {
        id: BID,
        bookingRef: "KB-REQID-0001",
        type: "room",
        status: "pending",
        totalPrice: 1000,
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
        id: "paydb_reqid_0001",
        bookingId: BID,
        amount: 1000,
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

function verifyReq(): NextRequest {
  return {
    nextUrl: { pathname: "/api/payments/verify" },
    headers: new Headers(),
    json: async () => ({
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAY_ID,
      razorpay_signature: SIGNATURE,
      booking_id: BID,
    }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  verifySig.mockReturnValue(true);
});

describe("Property 17 — request-id correlation", () => {
  it("header matches every audit row's requestId on success and failure paths", async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (signatureValid) => {
        vi.clearAllMocks();
        verifySig.mockReturnValue(signatureValid);
        const fake = freshFake();

        const res = await POST(verifyReq());
        const header = res.headers.get("x-request-id");

        expect(header).toBeTruthy();
        // Success path writes VERIFY_ATTEMPTED + VERIFY_SUCCEEDED; failure path
        // writes VERIFY_ATTEMPTED + VERIFY_FAILED. Either way every row must
        // carry the exact id that went out on the response header.
        const rows = fake._state.paymentEvents;
        expect(rows.length).toBeGreaterThanOrEqual(2);
        for (const r of rows) expect(r.requestId).toBe(header);

        // Status reflects the path (success 200, signature reject 400).
        expect(res.status).toBe(signatureValid ? 200 : 400);
      }),
      { numRuns: 150 }
    );
  });

  it("mints a fresh request id per request", async () => {
    freshFake();
    const a = await POST(verifyReq());
    freshFake();
    const b = await POST(verifyReq());
    expect(a.headers.get("x-request-id")).not.toBe(b.headers.get("x-request-id"));
  });
});
