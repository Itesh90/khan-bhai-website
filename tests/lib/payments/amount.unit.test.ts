// Feature: razorpay-payment-hardening, Task 12.4: amount + booking guard unit tests
//
// Two layers:
//   • Schema layer (createOrderSchema): amount must be > 0 and <= 10,000,000.
//   • Service layer (createOrderForBooking): booking-state and payable-amount
//     guards, client/stored amount-mismatch detection, and the CREATED/FAILED
//     upsert that resets the Razorpay payment id + signature on a retry.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrderSchema } from "@/lib/schemas/paymentSchema";
import { createFakePrisma, type FakePrisma, type SeedData } from "../../helpers/fakePrisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

const NEW_ORDER_ID = "order_NEWORDER000001";

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

const warn = vi.hoisted(() => vi.fn());
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn, error: vi.fn(), debug: vi.fn() },
  newRequestId: () => "req_amount_test",
}));

const createOrder = vi.hoisted(() =>
  vi.fn(async (rupees: number, currency: string) => ({
    id: NEW_ORDER_ID,
    amount: Math.round(rupees * 100),
    currency,
    status: "created",
  }))
);
vi.mock("@/lib/payments/razorpay", () => ({
  createRazorpayOrder: createOrder,
  verifyRazorpaySignature: () => true,
  verifyRazorpayWebhookSignature: () => true,
  fetchRazorpayPayment: vi.fn(),
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

import { createOrderForBooking } from "@/lib/services/paymentService";

const BID = "bkg_amount_0001";

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BID,
    bookingRef: "KB-AMT-0001",
    type: "room",
    roomId: null,
    tourId: null,
    guestName: "Test Guest",
    guestEmail: "guest@example.com",
    guestPhone: "+910000000000",
    numberOfGuests: 2,
    status: "pending",
    totalPrice: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "paydb_amount_0001",
    bookingId: BID,
    amount: 1000,
    currency: "INR",
    paymentMethod: "razorpay",
    razorpayOrderId: "order_OLDORDER000001",
    razorpayPaymentId: null,
    razorpaySignature: null,
    status: "CREATED",
    method: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup(seed: SeedData): FakePrisma {
  const f = createFakePrisma(seed);
  db.set(f);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createOrderSchema amount bounds", () => {
  it("rejects amount <= 0", () => {
    expect(createOrderSchema.safeParse({ booking_id: "b1", amount: 0 }).success).toBe(false);
    expect(createOrderSchema.safeParse({ booking_id: "b1", amount: -1 }).success).toBe(false);
  });

  it("rejects amount above the 10,000,000 cap but accepts the boundary", () => {
    expect(
      createOrderSchema.safeParse({ booking_id: "b1", amount: 10_000_001 }).success
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({ booking_id: "b1", amount: 10_000_000 }).success
    ).toBe(true);
    expect(createOrderSchema.safeParse({ booking_id: "b1", amount: 1 }).success).toBe(true);
  });
});

describe("createOrderForBooking — booking-state guards", () => {
  it("throws NotFoundError when the booking does not exist", async () => {
    setup({ bookings: [] });
    await expect(createOrderForBooking({ bookingId: BID })).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("throws ConflictError for a cancelled booking", async () => {
    setup({ bookings: [bookingRow({ status: "cancelled" })] });
    await expect(createOrderForBooking({ bookingId: BID })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("throws ConflictError for an already-paid booking", async () => {
    setup({ bookings: [bookingRow({ status: "paid" })] });
    await expect(createOrderForBooking({ bookingId: BID })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("throws ConflictError for a confirmed booking", async () => {
    setup({ bookings: [bookingRow({ status: "confirmed" })] });
    await expect(createOrderForBooking({ bookingId: BID })).rejects.toBeInstanceOf(
      ConflictError
    );
  });

  it("throws ConflictError when an AUTHORIZED payment already exists", async () => {
    setup({ bookings: [bookingRow()], payments: [paymentRow({ status: "AUTHORIZED" })] });
    await expect(createOrderForBooking({ bookingId: BID })).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("throws ConflictError when a CAPTURED payment already exists", async () => {
    setup({ bookings: [bookingRow()], payments: [paymentRow({ status: "CAPTURED" })] });
    await expect(createOrderForBooking({ bookingId: BID })).rejects.toBeInstanceOf(
      ConflictError
    );
  });
});

describe("createOrderForBooking — amount guards", () => {
  it("throws ValidationError when the booking has no payable amount", async () => {
    setup({ bookings: [bookingRow({ totalPrice: 0 })] });
    await expect(createOrderForBooking({ bookingId: BID })).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("throws ValidationError and logs when the client amount diverges from the stored total", async () => {
    setup({ bookings: [bookingRow({ totalPrice: 1000 })] });
    await expect(
      createOrderForBooking({ bookingId: BID, expectedAmount: 999 })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(warn).toHaveBeenCalledWith("payments.create.amount_mismatch", expect.any(Object));
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("accepts a matching client amount", async () => {
    setup({ bookings: [bookingRow({ totalPrice: 1000 })] });
    const res = await createOrderForBooking({ bookingId: BID, expectedAmount: 1000 });
    expect(res.orderId).toBe(NEW_ORDER_ID);
    expect(res.amount).toBe(100000); // paise
  });
});

describe("createOrderForBooking — retry upsert resets stale Razorpay fields", () => {
  it("resets razorpayPaymentId + signature on an existing CREATED payment", async () => {
    const fake = setup({
      bookings: [bookingRow()],
      payments: [
        paymentRow({
          status: "CREATED",
          razorpayOrderId: "order_OLDORDER000001",
          razorpayPaymentId: "pay_STALE0000001",
          razorpaySignature: "stalesig",
        }),
      ],
    });
    await createOrderForBooking({ bookingId: BID });
    const p = [...fake._state.payments.values()][0];
    expect(p.razorpayOrderId).toBe(NEW_ORDER_ID);
    expect(p.razorpayPaymentId).toBeNull();
    expect(p.razorpaySignature).toBeNull();
    expect(p.status).toBe("CREATED");
  });

  it("re-opens a FAILED payment for a new attempt", async () => {
    const fake = setup({
      bookings: [bookingRow()],
      payments: [
        paymentRow({
          status: "FAILED",
          razorpayPaymentId: "pay_FAILED00001",
          razorpaySignature: "failedsig",
        }),
      ],
    });
    await createOrderForBooking({ bookingId: BID });
    const p = [...fake._state.payments.values()][0];
    expect(p.status).toBe("CREATED");
    expect(p.razorpayOrderId).toBe(NEW_ORDER_ID);
    expect(p.razorpayPaymentId).toBeNull();
    expect(p.razorpaySignature).toBeNull();
  });

  it("writes exactly one ORDER_CREATED audit event on success", async () => {
    const fake = setup({ bookings: [bookingRow()] });
    await createOrderForBooking({ bookingId: BID });
    const events = fake._state.paymentEvents.filter((e: any) => e.kind === "ORDER_CREATED");
    expect(events).toHaveLength(1);
    expect(events[0].processed).toBe(true);
    expect(events[0].bookingId).toBe(BID);
  });
});
