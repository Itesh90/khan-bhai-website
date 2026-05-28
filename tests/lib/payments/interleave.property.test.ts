// Feature: razorpay-payment-hardening, Property 7: interleaved verify/webhook/refund idempotency
//
// The hardest correctness claim in the payment system. Note carefully what is
// and is NOT true:
//
//   • Full order-independence is FALSE. A trace containing both payment.captured
//     and payment.failed resolves to whichever reaches a terminal state first
//     (CAPTURED rejects a later failed; FAILED rejects a later captured). So we
//     do NOT assert "any permutation yields the same state".
//
//   • What IS true, and what the row lock + status-based idempotency guarantee:
//       1. DEDUP-EQUIVALENCE — removing duplicate deliveries (same event id),
//          preserving order, never changes business state or notification counts.
//          (The append-only audit log legitimately records every delivery, so we
//          compare Payment/Booking/Refund state + email counts, not event rows.)
//       2. EXACTLY-ONCE CAPTURE — the customer confirmation email is sent once
//          iff a → CAPTURED transition occurred (i.e. iff final status CAPTURED,
//          since CAPTURED is terminal), under sequential AND concurrent delivery.
//       3. REFUND EXACTLY-ONCE — refund-processed emails == refunds that
//          transitioned INITIATED → PROCESSED.
//       4. BOOKING INVARIANCE — refunds never move Booking status.
//
// Per task 11.5 we drive the REAL confirmPayment / handleWebhook / initiateRefund
// services against an in-memory Prisma fake whose $transaction holds a mutex,
// faithfully reproducing the production SELECT … FOR UPDATE row lock. Property 6
// (test #F) removes nothing but execution order: it runs the same capture events
// via Promise.all and asserts the exactly-once invariant still holds — this is
// the test that fails if the row lock is ever removed.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { createFakePrisma, type FakePrisma } from "../../helpers/fakePrisma";
import { eventTraceArb, type TraceEvent } from "../../generators/eventTraceArb";
import type { WebhookEnvelope } from "@/lib/payments/webhookSchema";

const C = vi.hoisted(() => ({
  BOOKING_ID: "bkg_seed_0001",
  PAY_DB_ID: "paydb_seed_0001",
  ORDER_ID: "order_TESTORDER00001",
  PAY_ID: "pay_TESTPAYMENT0001",
  RFND_ID: "rfnd_TESTREFUND00001",
  AMOUNT_RUPEES: 1000,
  AMOUNT_PAISE: 100000,
}));

// A movable handle the mocked db client points at; reset to a fresh fake per run.
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

vi.mock("@/lib/db/client", () => ({
  prisma: db.proxy,
  checkDatabaseConnection: async () => true,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  newRequestId: () => "req_test",
}));

vi.mock("@/lib/payments/razorpay", () => ({
  verifyRazorpaySignature: () => true,
  verifyRazorpayWebhookSignature: () => true,
  // A successful verify always cross-checks to a captured payment of the right amount.
  fetchRazorpayPayment: vi.fn(async () => ({
    status: "captured",
    method: "upi",
    order_id: C.ORDER_ID,
    amount: C.AMOUNT_PAISE,
  })),
  createRazorpayOrder: vi.fn(async () => ({
    id: C.ORDER_ID,
    amount: C.AMOUNT_PAISE,
    currency: "INR",
  })),
  createRazorpayRefund: vi.fn(async () => ({
    id: C.RFND_ID,
    amount: C.AMOUNT_PAISE,
    status: "processed",
  })),
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

import { confirmPayment, handleWebhook, initiateRefund } from "@/lib/services/paymentService";
import {
  sendPaymentConfirmation,
  sendAdminPaymentNotification,
  sendPaymentFailedNotification,
  sendOwnerWhatsAppNotice,
  sendRefundProcessedEmail,
} from "@/lib/services/emailService";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function seedFixture() {
  return {
    bookings: [
      {
        id: C.BOOKING_ID,
        bookingRef: "KB-TEST-0001",
        type: "room",
        roomId: null,
        tourId: null,
        guestName: "Test Guest",
        guestEmail: "guest@example.com",
        guestPhone: "+910000000000",
        numberOfGuests: 2,
        status: "pending",
        totalPrice: C.AMOUNT_RUPEES,
        checkInDate: null,
        checkOutDate: null,
        specialRequests: null,
        diningArea: null,
        timeSlot: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    payments: [
      {
        id: C.PAY_DB_ID,
        bookingId: C.BOOKING_ID,
        amount: C.AMOUNT_RUPEES,
        currency: "INR",
        paymentMethod: "razorpay",
        razorpayOrderId: C.ORDER_ID,
        razorpayPaymentId: null,
        razorpaySignature: null,
        status: "CREATED",
        method: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
}

function freshFake(): FakePrisma {
  const f = createFakePrisma(seedFixture());
  db.set(f);
  return f;
}

function envelopeFor(event: string): WebhookEnvelope {
  const payEntity = {
    id: C.PAY_ID,
    order_id: C.ORDER_ID,
    amount: C.AMOUNT_PAISE,
    currency: "INR",
    method: "upi",
  };
  switch (event) {
    case "payment.authorized":
      return { event, payload: { payment: { entity: { ...payEntity, status: "authorized" } } } };
    case "payment.captured":
      return { event, payload: { payment: { entity: { ...payEntity, status: "captured" } } } };
    case "payment.failed":
      return {
        event,
        payload: {
          payment: {
            entity: { ...payEntity, status: "failed", error_description: "declined" },
          },
        },
      };
    case "order.paid":
      return {
        event,
        payload: {
          order: {
            entity: { id: C.ORDER_ID, amount: C.AMOUNT_PAISE, currency: "INR", status: "paid" },
          },
          payment: { entity: { ...payEntity, status: "captured" } },
        },
      };
    case "refund.processed":
      return {
        event,
        payload: {
          refund: {
            entity: {
              id: C.RFND_ID,
              payment_id: C.PAY_ID,
              amount: C.AMOUNT_PAISE,
              currency: "INR",
              status: "processed",
            },
          },
        },
      };
    case "refund.failed":
      return {
        event,
        payload: {
          refund: {
            entity: {
              id: C.RFND_ID,
              payment_id: C.PAY_ID,
              amount: C.AMOUNT_PAISE,
              currency: "INR",
              status: "failed",
              error_description: "refund failed at bank",
            },
          },
        },
      };
    default:
      throw new Error(`unhandled event ${event}`);
  }
}

// Maps a generated trace event to the real service call it represents.
// verify(failure) models a signature mismatch — the route rejects it before any
// service runs, so it is a deliberate no-op on persisted state.
async function applyEvent(ev: TraceEvent): Promise<void> {
  try {
    if (ev.kind === "verify") {
      if (ev.outcome === "failure") return;
      await confirmPayment({
        bookingId: C.BOOKING_ID,
        razorpayOrderId: C.ORDER_ID,
        razorpayPaymentId: C.PAY_ID,
        razorpaySignature: "sig_valid_hex",
        requestId: "req_test",
      });
    } else if (ev.kind === "webhook") {
      await handleWebhook(envelopeFor(ev.event), { requestId: "req_test" });
    } else {
      // refund initiate — full refund of the available balance.
      await initiateRefund(C.PAY_DB_ID, {}, { requestId: "req_test" });
    }
  } catch {
    // Service-level guards (already-paid, already-refunded, cross-check failures)
    // throw by design. They must leave persisted state unchanged — which the
    // dedup-equivalence and invariant assertions below verify.
  }
}

async function runTrace(
  trace: TraceEvent[],
  opts: { concurrent?: boolean } = {}
): Promise<void> {
  if (opts.concurrent) {
    await Promise.all(trace.map(applyEvent));
  } else {
    for (const ev of trace) await applyEvent(ev);
  }
}

function emailCounts() {
  return {
    confirmation: vi.mocked(sendPaymentConfirmation).mock.calls.length,
    admin: vi.mocked(sendAdminPaymentNotification).mock.calls.length,
    whatsapp: vi.mocked(sendOwnerWhatsAppNotice).mock.calls.length,
    failed: vi.mocked(sendPaymentFailedNotification).mock.calls.length,
    refund: vi.mocked(sendRefundProcessedEmail).mock.calls.length,
  };
}


function businessState(fake: FakePrisma) {
  const p = [...fake._state.payments.values()][0];
  const b = [...fake._state.bookings.values()][0];
  const refunds = [...fake._state.refunds.values()]
    .map((r) => ({
      razorpayRefundId: r.razorpayRefundId,
      status: r.status,
      amount: Number(r.amount),
    }))
    .sort((x, y) => x.razorpayRefundId.localeCompare(y.razorpayRefundId));
  return {
    paymentStatus: p?.status ?? null,
    razorpayPaymentId: p?.razorpayPaymentId ?? null,
    bookingStatus: b?.status ?? null,
    refunds,
  };
}

// Keep the first occurrence of each distinct logical event; drop later duplicates.
function dedupPreservingOrder(trace: TraceEvent[]): TraceEvent[] {
  const key = (e: TraceEvent) =>
    e.kind === "verify"
      ? `verify:${e.outcome}`
      : e.kind === "webhook"
        ? `webhook:${e.event}`
        : `refund:${e.outcome}`;
  const seen = new Set<string>();
  const out: TraceEvent[] = [];
  for (const e of trace) {
    const k = key(e);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(e);
    }
  }
  return out;
}

// Capture-pipeline events only. Dedup-equivalence (test C) is sound exactly
// because payment state is MONOTONIC — CREATED → AUTHORIZED → CAPTURED|FAILED,
// both terminal — so a duplicate delivery's effect never depends on where it
// lands: keep-first dedup always retains the one effective occurrence. The
// refund pipeline is deliberately excluded because it is NON-monotonic: a
// refund.initiate (or refund.processed) is inert before its precondition exists
// and effective afterwards, so dropping a later "duplicate" would drop a real
// effect. Refund exactly-once is covered by test E instead.
const captureEventArb = fc.constantFrom<TraceEvent>(
  { kind: "verify", outcome: "success" },
  { kind: "verify", outcome: "failure" },
  { kind: "webhook", event: "payment.captured" },
  { kind: "webhook", event: "order.paid" },
  { kind: "webhook", event: "payment.authorized" },
  { kind: "webhook", event: "payment.failed" }
);

// Mirrors eventTraceArb's shape (random duplicates + full shuffle) over the
// monotonic capture alphabet.
const captureTraceArb: fc.Arbitrary<TraceEvent[]> = fc
  .array(captureEventArb, { minLength: 1, maxLength: 10 })
  .chain((events) =>
    fc.subarray(events, { minLength: 0, maxLength: events.length }).chain((dupes) => {
      const all = [...events, ...dupes];
      return fc.shuffledSubarray(all, { minLength: all.length, maxLength: all.length });
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Sanity examples (validate the harness before the property runs) ───────────

describe("Property 7 — harness sanity", () => {
  it("a single successful verify captures exactly once", async () => {
    const fake = freshFake();
    await runTrace([{ kind: "verify", outcome: "success" }]);
    const s = businessState(fake);
    expect(s.paymentStatus).toBe("CAPTURED");
    expect(s.bookingStatus).toBe("paid");
    expect(s.razorpayPaymentId).toBe(C.PAY_ID);
    expect(emailCounts()).toMatchObject({
      confirmation: 1,
      admin: 1,
      whatsapp: 1,
      failed: 0,
      refund: 0,
    });
  });

  it("triple-delivered captured webhook still captures exactly once", async () => {
    const fake = freshFake();
    const cap: TraceEvent = { kind: "webhook", event: "payment.captured" };
    await runTrace([cap, cap, cap]);
    expect(businessState(fake).paymentStatus).toBe("CAPTURED");
    expect(emailCounts().confirmation).toBe(1);
  });

  it("payment.failed before payment.captured leaves the payment FAILED (order matters)", async () => {
    const fake = freshFake();
    await runTrace([
      { kind: "webhook", event: "payment.failed" },
      { kind: "webhook", event: "payment.captured" },
    ]);
    const s = businessState(fake);
    expect(s.paymentStatus).toBe("FAILED");
    expect(s.bookingStatus).toBe("pending");
    expect(emailCounts().confirmation).toBe(0);
  });

  // Regression for the bug the test C counterexample [payment.failed,
  // verify.success, …] surfaced: confirmPayment's FAILED branch used to fire on
  // any finalStatus === "FAILED", so each verify against an already-FAILED
  // payment re-sent the failure email. It is now guarded on a FRESH transition
  // (paymentService `freshlyFailed`, mirroring the capture path's `transitioned`),
  // so the failure email fires exactly once — from the webhook that did the
  // transition — and verify retries are inert.
  it("verify on an already-FAILED payment does NOT re-send the failed email", async () => {
    const fake = freshFake();
    await runTrace([
      { kind: "webhook", event: "payment.failed" }, // → FAILED, the one failed email
      { kind: "verify", outcome: "success" }, // inert: already terminal
      { kind: "verify", outcome: "success" }, // inert
    ]);
    const s = businessState(fake);
    expect(s.paymentStatus).toBe("FAILED");
    expect(emailCounts().confirmation).toBe(0);
    expect(emailCounts().failed).toBe(1);
  });
});

// ── The property suite ───────────────────────────────────────────────────────

describe("Property 7 — interleaving idempotency and exactly-once side effects", () => {
  it("C: removing duplicate deliveries never changes business state or email counts", async () => {
    // Capture pipeline only — see captureEventArb for why refunds are excluded.
    await fc.assert(
      fc.asyncProperty(captureTraceArb, async (trace) => {
        vi.clearAllMocks();
        const f1 = freshFake();
        await runTrace(trace);
        const withDupes = { state: businessState(f1), emails: emailCounts() };

        vi.clearAllMocks();
        const f2 = freshFake();
        await runTrace(dedupPreservingOrder(trace));
        const deduped = { state: businessState(f2), emails: emailCounts() };

        expect(withDupes).toEqual(deduped);
      }),
      { numRuns: 500 }
    );
  });

  it("D: customer confirmation email fires exactly once iff the payment ends CAPTURED", async () => {
    await fc.assert(
      fc.asyncProperty(eventTraceArb, async (trace) => {
        vi.clearAllMocks();
        const fake = freshFake();
        await runTrace(trace);
        const s = businessState(fake);
        const c = emailCounts();

        const captured = s.paymentStatus === "CAPTURED";
        expect(c.confirmation).toBe(captured ? 1 : 0);
        // Admin + WhatsApp notices are coupled to the same capture transition.
        expect(c.admin).toBe(c.confirmation);
        expect(c.whatsapp).toBe(c.confirmation);
        // Failure notice is exactly-once on the single fresh → FAILED transition.
        expect(c.failed).toBe(s.paymentStatus === "FAILED" ? 1 : 0);
        // Refund-processed email count equals refunds that reached PROCESSED.
        expect(c.refund).toBe(s.refunds.filter((r) => r.status === "PROCESSED").length);
        // Payment never leaves the reachable set; booking is paid iff captured.
        expect(["CREATED", "AUTHORIZED", "CAPTURED", "FAILED"]).toContain(s.paymentStatus);
        expect(["pending", "paid"]).toContain(s.bookingStatus);
        expect(s.bookingStatus === "paid").toBe(captured);
      }),
      { numRuns: 500 }
    );
  });

  it("E: refunds are exactly-once and never mutate booking status", async () => {
    const capture: TraceEvent = { kind: "webhook", event: "payment.captured" };
    await fc.assert(
      fc.asyncProperty(eventTraceArb, async (tail) => {
        vi.clearAllMocks();
        const fake = freshFake();
        // Force a capture first so refund.initiate has a CAPTURED payment to act on.
        await runTrace([capture, ...tail]);
        const s = businessState(fake);
        const c = emailCounts();

        expect(s.paymentStatus).toBe("CAPTURED");
        // A refund must never roll the booking back from paid.
        expect(s.bookingStatus).toBe("paid");
        // At most one refund row exists (fixed refund id; second initiate is rejected).
        expect(s.refunds.length).toBeLessThanOrEqual(1);
        // Exactly-once refund email: one per refund that reached PROCESSED.
        expect(c.refund).toBe(s.refunds.filter((r) => r.status === "PROCESSED").length);
        expect(c.refund).toBeLessThanOrEqual(1);
      }),
      { numRuns: 300 }
    );
  });

  it("F: concurrent delivery still captures exactly once (proves the row lock)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(captureEventArb, { minLength: 1, maxLength: 8 }),
        async (events) => {
          vi.clearAllMocks();
          const fake = freshFake();
          await runTrace(events, { concurrent: true });
          const s = businessState(fake);
          const c = emailCounts();

          // The invariant that the SELECT … FOR UPDATE lock exists to guarantee:
          // no interleaving can produce two capture notifications.
          expect(c.confirmation).toBeLessThanOrEqual(1);
          expect(c.confirmation).toBe(s.paymentStatus === "CAPTURED" ? 1 : 0);
          expect(c.admin).toBe(c.confirmation);
          expect(c.whatsapp).toBe(c.confirmation);
          expect(s.bookingStatus === "paid").toBe(s.paymentStatus === "CAPTURED");
        }
      ),
      { numRuns: 300 }
    );
  });
});
