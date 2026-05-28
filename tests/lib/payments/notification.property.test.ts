// Feature: razorpay-payment-hardening, Property 18: notification durability
//
// Notifications are fired-and-forget AFTER the state change commits, so:
//   • injecting a failure into any of sendPaymentConfirmation /
//     sendAdminPaymentNotification / sendOwnerWhatsAppNotice must NOT change the
//     committed Payment + Booking state (it equals the all-succeed case), and
//     must NOT cause the handler to throw;
//   • replaying the captured event after a notification failure does NOT retry
//     the notification — the documented exactly-once (not at-least-once)
//     guarantee. The state-machine idempotency short-circuits before any resend.
//
// Drives the real handleWebhook against the in-memory Prisma fake.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { createFakePrisma, type FakePrisma } from "../../helpers/fakePrisma";
import type { WebhookEnvelope } from "@/lib/payments/webhookSchema";

const BID = "bkg_notif_0001";
const PAY_DB_ID = "paydb_notif_0001";
const ORDER_ID = "order_NOTIFTEST00001";
const PAY_ID = "pay_NOTIFTEST00001";

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
  newRequestId: () => "req_notif_test",
}));

vi.mock("@/lib/payments/razorpay", () => ({
  verifyRazorpaySignature: () => true,
  verifyRazorpayWebhookSignature: () => true,
  fetchRazorpayPayment: vi.fn(),
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

import { handleWebhook } from "@/lib/services/paymentService";
import {
  sendPaymentConfirmation,
  sendAdminPaymentNotification,
  sendOwnerWhatsAppNotice,
} from "@/lib/services/emailService";

function freshFake(): FakePrisma {
  const f = createFakePrisma({
    bookings: [
      {
        id: BID,
        bookingRef: "KB-NOTIF-0001",
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
        id: PAY_DB_ID,
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

const capturedEvent: WebhookEnvelope = {
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: PAY_ID,
        order_id: ORDER_ID,
        amount: 100000,
        currency: "INR",
        status: "captured",
        method: "upi",
      },
    },
  },
};

function dbSnapshot(fake: FakePrisma) {
  const p = [...fake._state.payments.values()][0];
  const b = [...fake._state.bookings.values()][0];
  return {
    paymentStatus: p.status,
    razorpayPaymentId: p.razorpayPaymentId,
    bookingStatus: b.status,
  };
}

function setEmailBehavior(failing: Set<string>) {
  const set = (fn: any, key: string) =>
    failing.has(key)
      ? fn.mockRejectedValue(new Error(`${key} transport down`))
      : fn.mockResolvedValue(undefined);
  set(vi.mocked(sendPaymentConfirmation), "confirmation");
  set(vi.mocked(sendAdminPaymentNotification), "admin");
  set(vi.mocked(sendOwnerWhatsAppNotice), "whatsapp");
}

// Settle the fire-and-forget .catch() microtasks so a rejected notification can
// never surface as an unhandled rejection after the handler returns.
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Property 18 — notification durability", () => {
  it("committed state is identical whether notifications succeed or fail", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.subarray(["confirmation", "admin", "whatsapp"], { minLength: 0, maxLength: 3 }),
        async (failingList) => {
          // Baseline: all notifications succeed.
          vi.clearAllMocks();
          setEmailBehavior(new Set());
          const ok = freshFake();
          await handleWebhook(capturedEvent, { requestId: "req" });
          await flush();
          const okState = dbSnapshot(ok);

          // Same event, with the chosen notifications failing.
          vi.clearAllMocks();
          setEmailBehavior(new Set(failingList));
          const failed = freshFake();
          await expect(
            handleWebhook(capturedEvent, { requestId: "req" })
          ).resolves.toBeDefined(); // handler never throws on notification failure
          await flush();

          expect(dbSnapshot(failed)).toEqual(okState);
          expect(okState).toEqual({
            paymentStatus: "CAPTURED",
            razorpayPaymentId: PAY_ID,
            bookingStatus: "paid",
          });
        }
      ),
      { numRuns: 200 }
    );
  });

  it("replaying the captured event after a notification failure does NOT retry it", async () => {
    vi.clearAllMocks();
    setEmailBehavior(new Set(["confirmation", "admin", "whatsapp"]));
    const fake = freshFake();

    await handleWebhook(capturedEvent, { requestId: "req" });
    await flush();
    // Exactly one attempt during the capture that actually transitioned.
    expect(vi.mocked(sendPaymentConfirmation)).toHaveBeenCalledTimes(1);

    // Replay: the payment is already CAPTURED → idempotent short-circuit, so the
    // failed notification is NOT retried (exactly-once, not at-least-once).
    const res = await handleWebhook(capturedEvent, { requestId: "req" });
    await flush();
    expect((res as { action?: string }).action).toBe("idempotent:already_captured");
    expect(vi.mocked(sendPaymentConfirmation)).toHaveBeenCalledTimes(1);
    expect(dbSnapshot(fake)).toEqual({
      paymentStatus: "CAPTURED",
      razorpayPaymentId: PAY_ID,
      bookingStatus: "paid",
    });
  });
});
