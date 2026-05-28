// Feature: razorpay-payment-hardening, Property 10: webhook transport-layer guards
//
// For any webhook request:
//   • body length > 1,000,000 bytes → HTTP 413, and NO HMAC computation occurs;
//   • Content-Type other than application/json (case-insensitive) → HTTP 415;
//   • regardless of outcome, the response carries Cache-Control: no-store,
//     max-age=0 and x-request-id.
//
// These guards run before the body is read or any crypto is done, so we drive the
// real route POST handler with a minimal request stub (the handler only touches
// request.nextUrl.pathname, request.headers.get, request.text). The Razorpay
// webhook verifier is a spy so we can assert it was never called on the early
// rejections.

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { NextRequest } from "next/server";

const verifyWebhookSig = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/db/client", () => ({ prisma: {}, checkDatabaseConnection: async () => true }));

vi.mock("@/lib/logger", () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  newRequestId: () => "req_transport_test",
}));

// The route imports verifyRazorpayWebhookSignature directly; paymentService (pulled
// in transitively) imports the rest. Stub them all so import resolves and so the
// HMAC verifier is observable.
vi.mock("@/lib/payments/razorpay", () => ({
  verifyRazorpayWebhookSignature: verifyWebhookSig,
  verifyRazorpaySignature: () => true,
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

import { POST } from "@/app/api/payments/webhook/route";

function fakeReq(opts: {
  pathname?: string;
  headers?: Record<string, string>;
  body?: string;
}): NextRequest {
  const h = new Headers(opts.headers ?? {});
  return {
    nextUrl: { pathname: opts.pathname ?? "/api/payments/webhook" },
    headers: h,
    text: async () => opts.body ?? "",
  } as unknown as NextRequest;
}

function assertTransportHeaders(res: Response) {
  expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  expect(res.headers.get("x-request-id")).toBeTruthy();
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyWebhookSig.mockReturnValue(false);
});

describe("Property 10 — webhook transport guards", () => {
  it("rejects any non-JSON Content-Type with 415 before any HMAC work", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 40 }).filter((s) => !s.toLowerCase().includes("application/json")),
        async (contentType) => {
          verifyWebhookSig.mockClear();
          const res = await POST(
            fakeReq({ headers: { "content-type": contentType }, body: "{}" })
          );
          expect(res.status).toBe(415);
          expect(verifyWebhookSig).not.toHaveBeenCalled();
          assertTransportHeaders(res);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("rejects an oversized Content-Length with 413 before any HMAC work", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1_000_001, max: 5_000_000_000 }),
        async (length) => {
          verifyWebhookSig.mockClear();
          const res = await POST(
            fakeReq({
              headers: {
                "content-type": "application/json",
                "content-length": String(length),
              },
              body: "{}",
            })
          );
          expect(res.status).toBe(413);
          expect(verifyWebhookSig).not.toHaveBeenCalled();
          assertTransportHeaders(res);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("accepts a Content-Length at the 1MB boundary (off-by-one guard)", async () => {
    // Exactly 1,000,000 is allowed; the verifier runs and (mocked false) → 401.
    const res = await POST(
      fakeReq({
        headers: {
          "content-type": "application/json",
          "content-length": "1000000",
          "x-razorpay-signature": "deadbeef",
        },
        body: "{}",
      })
    );
    expect(verifyWebhookSig).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
    assertTransportHeaders(res);
  });

  it("rejects an oversized raw body with 413 even when Content-Length is absent", async () => {
    const big = "x".repeat(1_000_001);
    const res = await POST(
      fakeReq({ headers: { "content-type": "application/json" }, body: big })
    );
    expect(res.status).toBe(413);
    expect(verifyWebhookSig).not.toHaveBeenCalled();
    assertTransportHeaders(res);
  });

  it("Content-Type matching is case-insensitive", async () => {
    const res = await POST(
      fakeReq({
        headers: {
          "content-type": "APPLICATION/JSON; charset=UTF-8",
          "x-razorpay-signature": "deadbeef",
        },
        body: "{}",
      })
    );
    // Passes the content-type guard, so the verifier is consulted (→ 401 here).
    expect(verifyWebhookSig).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(401);
    assertTransportHeaders(res);
  });

  it("carries the transport headers on the 401 invalid-signature path too", async () => {
    verifyWebhookSig.mockReturnValue(false);
    const res = await POST(
      fakeReq({
        headers: { "content-type": "application/json", "x-razorpay-signature": "bad" },
        body: '{"event":"payment.captured"}',
      })
    );
    expect(res.status).toBe(401);
    assertTransportHeaders(res);
  });

  it("carries the transport headers on the 400 invalid-JSON path", async () => {
    verifyWebhookSig.mockReturnValue(true); // pass signature, fail JSON.parse
    const res = await POST(
      fakeReq({
        headers: { "content-type": "application/json", "x-razorpay-signature": "ok" },
        body: "this is not json{",
      })
    );
    expect(res.status).toBe(400);
    assertTransportHeaders(res);
  });
});
