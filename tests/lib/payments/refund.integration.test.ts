// Feature: razorpay-payment-hardening, Integration: admin refund → refund.processed webhook
//
// End-to-end refund happy path across the route + service + webhook layers:
//   admin POST /api/admin/payments/[id]/refund (authorized, body parsed)
//     → 201, Refund(INITIATED) + REFUND_INITIATED audit row, gateway called once
//   then webhook refund.processed
//     → Refund(PROCESSED), exactly one customer refund email, Booking unchanged.
// Plus the unauthorized path: requireAdmin rejection → no refund, no gateway call.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { createFakePrisma, type FakePrisma } from "../../helpers/fakePrisma";
import { AuthError } from "@/lib/errors";
import type { WebhookEnvelope } from "@/lib/payments/webhookSchema";

const BID = "bkg_rint_0001";
const PAY_DB_ID = "paydb_rint_0001";
const PAY_ID = "pay_RINTTEST00001";
const ORDER_ID = "order_RINTTEST0001";
const RFND_ID = "rfnd_RINTTEST0001";

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
  newRequestId: () => "req_rint_test",
}));

const requireAdmin = vi.hoisted(() => vi.fn(async () => ({ id: "adm1", email: "a@b.c", role: "SUPERADMIN" })));
vi.mock("@/lib/auth/guard", () => ({
  requireAdmin,
  requireSuperAdmin: requireAdmin,
  getAdmin: async () => ({ id: "adm1", email: "a@b.c", role: "SUPERADMIN" }),
}));

const createRefund = vi.hoisted(() =>
  vi.fn(async (_paymentId: string, paise: number) => ({ id: RFND_ID, amount: paise, status: "processed" }))
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

import { POST } from "@/app/api/admin/payments/[id]/refund/route";
import { handleWebhook } from "@/lib/services/paymentService";
import { sendRefundProcessedEmail } from "@/lib/services/emailService";

function freshFake(): FakePrisma {
  const f = createFakePrisma({
    bookings: [
      {
        id: BID,
        bookingRef: "KB-RINT-0001",
        type: "room",
        status: "paid",
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
        id: PAY_DB_ID,
        bookingId: BID,
        amount: 1000,
        currency: "INR",
        paymentMethod: "razorpay",
        razorpayOrderId: ORDER_ID,
        razorpayPaymentId: PAY_ID,
        razorpaySignature: "sig",
        status: "CAPTURED",
        method: "upi",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });
  db.set(f);
  return f;
}

function refundReq(body: unknown): NextRequest {
  return {
    nextUrl: { pathname: `/api/admin/payments/${PAY_DB_ID}/refund` },
    headers: new Headers(),
    json: async () => body,
  } as unknown as NextRequest;
}

const refundProcessedEvent: WebhookEnvelope = {
  event: "refund.processed",
  payload: {
    refund: {
      entity: {
        id: RFND_ID,
        payment_id: PAY_ID,
        amount: 100000,
        currency: "INR",
        status: "processed",
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "adm1", email: "a@b.c", role: "SUPERADMIN" } as any);
});

describe("Refund integration — admin route → refund.processed webhook", () => {
  it("initiates via the admin route then completes via the webhook", async () => {
    const fake = freshFake();

    const res = await POST(refundReq({}), { params: { id: PAY_DB_ID } } as any);
    expect(res.status).toBe(201);
    const bodyJson = (await res.json()) as { data: { status: string; razorpayRefundId: string } };
    expect(bodyJson.data.status).toBe("INITIATED");
    expect(bodyJson.data.razorpayRefundId).toBe(RFND_ID);
    expect(createRefund).toHaveBeenCalledTimes(1);

    // DB: one INITIATED refund + a REFUND_INITIATED audit row.
    expect([...fake._state.refunds.values()][0].status).toBe("INITIATED");
    expect(
      fake._state.paymentEvents.filter((e: any) => e.kind === "REFUND_INITIATED")
    ).toHaveLength(1);

    const bookingBefore = [...fake._state.bookings.values()][0].status;

    // Webhook completes the refund.
    const result = await handleWebhook(refundProcessedEvent, { requestId: "req" });
    expect((result as { action?: string }).action).toBe("applied:refund_processed");
    expect([...fake._state.refunds.values()][0].status).toBe("PROCESSED");
    expect(vi.mocked(sendRefundProcessedEmail)).toHaveBeenCalledTimes(1);
    // Booking status is untouched by the refund lifecycle.
    expect([...fake._state.bookings.values()][0].status).toBe(bookingBefore);
  });

  it("a duplicate refund.processed webhook does not double-email", async () => {
    const fake = freshFake();
    await POST(refundReq({}), { params: { id: PAY_DB_ID } } as any);

    await handleWebhook(refundProcessedEvent, { requestId: "req" });
    await handleWebhook(refundProcessedEvent, { requestId: "req" });

    expect([...fake._state.refunds.values()][0].status).toBe("PROCESSED");
    expect(vi.mocked(sendRefundProcessedEmail)).toHaveBeenCalledTimes(1);
  });

  it("rejects an unauthorized caller and creates no refund", async () => {
    const fake = freshFake();
    requireAdmin.mockRejectedValue(new AuthError("Authentication required"));

    const res = await POST(refundReq({}), { params: { id: PAY_DB_ID } } as any);
    expect(res.status).toBe(401);
    expect(createRefund).not.toHaveBeenCalled();
    expect(fake._state.refunds.size).toBe(0);
  });
});
