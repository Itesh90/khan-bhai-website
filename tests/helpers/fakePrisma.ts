/**
 * In-memory Prisma fake — Khan Bhai S. payment tests.
 *
 * Implements the exact subset of Prisma operations that `paymentService`
 * (`confirmPayment`, `handleWebhook`, `initiateRefund`, `applyRefundEvent`) and
 * `auditLog.recordPaymentEvent` exercise, so the REAL services can run against
 * it with no live database. Used by the Property 7 interleaving suite.
 *
 * Fidelity notes — why this is a faithful model and not a re-implementation:
 *
 *   • Transaction serialization. `$transaction(fn)` acquires a process-wide
 *     mutex for the duration of `fn`. In production every payment transaction
 *     opens with `SELECT … FOR UPDATE` on the single Payment row keyed by this
 *     booking/order, so concurrent verify + webhook transactions serialize on
 *     that row. Because Property 7 always targets ONE payment, "serialize on the
 *     one row" and "serialize all transactions" are equivalent — the mutex
 *     reproduces the row lock's effect exactly. Crucially, callback bodies that
 *     re-read inside the transaction (the services' TOCTOU guard) observe the
 *     committed writes of any earlier transaction, just like the real lock.
 *
 *   • Pre-transaction reads interleave. Work the services do BEFORE opening the
 *     transaction (booking lookup, fast-path idempotency, Razorpay fetch) is not
 *     under the mutex, so under `Promise.all` two handlers can both take a stale
 *     pre-lock read and then serialize at the transaction boundary — exactly the
 *     race the row lock exists to neutralize.
 *
 *   • Writes apply immediately within the serialized critical section. The
 *     services never throw mid-transaction in the Property 7 event set (the only
 *     in-transaction `recordPaymentEvent` calls carry no `eventId`, so no P2002),
 *     so MVCC-style rollback is unnecessary here. Unique-constraint violations
 *     ARE modelled (real `Prisma.PrismaClientKnownRequestError` with code P2002)
 *     for `eventId` and `razorpayRefundId` so any future event-id path is exact.
 */
import { Prisma } from "@prisma/client";

export interface SeedData {
  bookings?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  refunds?: Record<string, unknown>[];
  paymentEvents?: Record<string, unknown>[];
}

type Row = Record<string, any>;

function p2002(target: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed on the fields: (\`${target}\`)`,
    { code: "P2002", clientVersion: "fake", meta: { target: [target] } } as any
  );
}

function clone<T>(o: T): T {
  return o == null ? o : ({ ...(o as any) } as T);
}

function matchesWhere(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  for (const k of Object.keys(where)) {
    if (row[k] !== where[k]) return false;
  }
  return true;
}

function applySelect(row: Row, select: Row | undefined): Row {
  if (!select) return clone(row);
  const out: Row = {};
  for (const k of Object.keys(select)) if (select[k]) out[k] = row[k];
  return out;
}

export function createFakePrisma(seed: SeedData = {}) {
  let counter = 1;
  const nextId = (prefix: string) => `${prefix}_fake_${counter++}`;

  const bookings = new Map<string, Row>();
  const payments = new Map<string, Row>();
  const refunds = new Map<string, Row>();
  const paymentEvents: Row[] = [];

  for (const b of seed.bookings ?? []) bookings.set(b.id as string, { ...b });
  for (const p of seed.payments ?? []) payments.set(p.id as string, { ...p });
  for (const r of seed.refunds ?? []) refunds.set(r.id as string, { ...r });
  for (const e of seed.paymentEvents ?? []) paymentEvents.push({ ...e });

  const findPaymentBy = (field: string, value: unknown): Row | null => {
    for (const p of payments.values()) if (p[field] === value) return p;
    return null;
  };
  const findRefundBy = (field: string, value: unknown): Row | null => {
    for (const r of refunds.values()) if (r[field] === value) return r;
    return null;
  };

  const withBookingIncludes = (b: Row | null, include: Row | undefined): Row | null => {
    if (!b) return null;
    const out = clone(b);
    if (!include) return out;
    if (include.payment) out.payment = clone(findPaymentBy("bookingId", b.id));
    if (include.room) out.room = null;
    if (include.tour) out.tour = null;
    if (include.paymentEvents)
      out.paymentEvents = paymentEvents.filter((e) => e.bookingId === b.id).map(clone);
    return out;
  };

  const withPaymentIncludes = (p: Row | null, include: Row | undefined): Row | null => {
    if (!p) return null;
    const out = clone(p);
    if (!include) return out;
    if (include.booking) out.booking = clone(bookings.get(p.bookingId));
    if (include.refunds)
      out.refunds = [...refunds.values()].filter((r) => r.paymentId === p.id).map(clone);
    return out;
  };

  const booking = {
    findUnique: async ({ where, include }: any) => {
      const b = where.id
        ? bookings.get(where.id)
        : where.bookingRef
          ? [...bookings.values()].find((x) => x.bookingRef === where.bookingRef)
          : undefined;
      return withBookingIncludes(b ?? null, include);
    },
    update: async ({ where, data, include }: any) => {
      const b = bookings.get(where.id);
      if (!b) throw new Error(`fake: booking ${where.id} not found`);
      Object.assign(b, data, { updatedAt: new Date() });
      return withBookingIncludes(b, include);
    },
  };

  const payment = {
    findUnique: async ({ where, include }: any) => {
      let p: Row | null = null;
      if (where.id) p = payments.get(where.id) ?? null;
      else if (where.bookingId) p = findPaymentBy("bookingId", where.bookingId);
      else if (where.razorpayOrderId) p = findPaymentBy("razorpayOrderId", where.razorpayOrderId);
      else if (where.razorpayPaymentId)
        p = findPaymentBy("razorpayPaymentId", where.razorpayPaymentId);
      return withPaymentIncludes(p, include);
    },
    upsert: async ({ where, update, create }: any) => {
      const existing = findPaymentBy("bookingId", where.bookingId);
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return clone(existing);
      }
      const fresh: Row = {
        id: nextId("pay"),
        currency: "INR",
        paymentMethod: "razorpay",
        razorpayPaymentId: null,
        razorpaySignature: null,
        method: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
      payments.set(fresh.id, fresh);
      return clone(fresh);
    },
    update: async ({ where, data }: any) => {
      const p = payments.get(where.id);
      if (!p) throw new Error(`fake: payment ${where.id} not found`);
      Object.assign(p, data, { updatedAt: new Date() });
      return clone(p);
    },
  };

  const paymentEvent = {
    create: async ({ data }: any) => {
      if (data.eventId != null) {
        for (const e of paymentEvents) if (e.eventId === data.eventId) throw p2002("eventId");
      }
      const row: Row = {
        id: nextId("evt"),
        paymentId: null,
        bookingId: null,
        eventId: null,
        razorpayEventName: null,
        payload: null,
        processed: false,
        error: null,
        createdAt: new Date(),
        ...data,
      };
      paymentEvents.push(row);
      return clone(row);
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const e of paymentEvents)
        if (matchesWhere(e, where)) {
          Object.assign(e, data);
          count++;
        }
      return { count };
    },
    findFirst: async ({ where, select }: any) => {
      for (const e of paymentEvents) if (matchesWhere(e, where)) return applySelect(e, select);
      return null;
    },
    count: async ({ where }: any = {}) =>
      paymentEvents.filter((e) => matchesWhere(e, where)).length,
    findMany: async ({ where }: any = {}) =>
      paymentEvents.filter((e) => matchesWhere(e, where)).map(clone),
  };

  const refund = {
    findUnique: async ({ where, include }: any) => {
      let r: Row | null = null;
      if (where.id) r = refunds.get(where.id) ?? null;
      else if (where.razorpayRefundId) r = findRefundBy("razorpayRefundId", where.razorpayRefundId);
      if (!r) return null;
      const out = clone(r);
      if (include?.payment) {
        const pay = payments.get(r.paymentId) ?? null;
        out.payment = withPaymentIncludes(pay, include.payment.include);
      }
      return out;
    },
    create: async ({ data }: any) => {
      for (const r of refunds.values())
        if (r.razorpayRefundId === data.razorpayRefundId) throw p2002("razorpayRefundId");
      const row: Row = {
        id: nextId("rfnd"),
        currency: "INR",
        status: "INITIATED",
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      refunds.set(row.id, row);
      return clone(row);
    },
    update: async ({ where, data }: any) => {
      const r = refunds.get(where.id);
      if (!r) throw new Error(`fake: refund ${where.id} not found`);
      Object.assign(r, data, { updatedAt: new Date() });
      return clone(r);
    },
  };

  // Process-wide transaction mutex — models SELECT … FOR UPDATE serialization.
  let txChain: Promise<void> = Promise.resolve();
  const $transaction = async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    const prev = txChain;
    let release!: () => void;
    txChain = new Promise<void>((r) => {
      release = r;
    });
    await prev;
    try {
      return await arg(api);
    } finally {
      release();
    }
  };

  // The lock query — services ignore its return value; we just satisfy the call.
  const $queryRaw = async (..._args: any[]) => [] as unknown[];
  const $queryRawUnsafe = async (..._args: any[]) => [] as unknown[];

  const api: any = {
    booking,
    payment,
    paymentEvent,
    refund,
    $transaction,
    $queryRaw,
    $queryRawUnsafe,
    // Inspection handle for assertions — not part of the Prisma surface.
    _state: { bookings, payments, refunds, paymentEvents },
  };
  return api;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
