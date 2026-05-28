# Implementation Plan: Razorpay Payment Hardening

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

The implementation is sequenced so the migration is safe to deploy at every checkpoint:

1. **Foundations** — pure new modules (state machine, audit log, webhook schema, redaction helper) introduced without touching runtime behaviour.
2. **Surface consolidation** — additive Prisma migrations for `PaymentEvent` and `Refund`, then wiring the audit log into the existing canonical handlers.
3. **Audit + idempotency** — Zod-validated webhook payload, event-id deduplication, row-level locking inside the verify and webhook transactions.
4. **Confirmation truth source + refunds** — public `by-ref` endpoint, server-component confirmation page rewrite, admin refund endpoint, and refund webhook branches.
5. **Migration & cutover** — three-deploy legacy route deprecation (forwarding-with-logging → 410 Gone → delete).

Tests are interleaved alongside the modules they cover. Property-based tests use `fast-check` and reference the correctness properties (P1–P20) and requirement clauses they validate. Optional sub-tasks are marked with `*`.

Implementation language is **TypeScript** (matches the existing Next.js + Prisma codebase and the design's File Layout section). Test runner is **vitest** with **fast-check** for property-based tests (per design.md Testing Strategy).

## Tasks

- [ ] 1. Set up test infrastructure and shared generators
  - [ ] 1.1 Add vitest + fast-check dev dependencies and base config
    - Install `vitest`, `@vitest/coverage-v8`, `fast-check` as devDependencies
    - Create `vitest.config.ts` with `pool: "forks"`, path alias for `@/*`, and `setupFiles` pointing at a new `tests/setup.ts`
    - Add `test` and `test:coverage` scripts to `package.json` (use `vitest run` for single-shot execution, never watch mode in CI)
    - Create `tests/setup.ts` that loads `.env.test` and stubs `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` with non-empty test values
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 1.2 Create shared fast-check generators in `tests/generators/`
    - `razorpayIdArb.ts` — generators for `order_…`, `pay_…`, `rfnd_…`, `evt_…` ids with the documented regexes
    - `paiseArb.ts` — integer paise in `(0, 1_000_000_000_000]`; rupee equivalent helper `Math.round(rupees * 100)`
    - `bookingArb.ts` — `BookingStatus` arbitrary plus full Booking record arb seeded with deterministic ids
    - `paymentArb.ts` — `PaymentStatus` arbitrary plus full Payment record arb
    - `webhookEnvelopeArb.ts` — generators for valid `payment.authorized | payment.captured | order.paid | payment.failed | refund.processed | refund.failed` envelopes
    - `eventTraceArb.ts` — sequences of mixed verify/webhook/refund events with random duplicates (centerpiece for Property 7)
    - _Requirements: 17.3, 17.4_


## Foundations (pure new modules, no runtime behaviour change)

- [ ] 2. Implement shared payment state machine module
  - [ ] 2.1 Create `lib/payments/stateMachine.ts` with transition tables and helpers
    - Export `PAYMENT_TRANSITIONS` (CREATED → AUTHORIZED|CAPTURED|FAILED; AUTHORIZED → CAPTURED|FAILED; CAPTURED, FAILED terminal)
    - Export `BOOKING_TRANSITIONS` (pending → paid|cancelled; paid → confirmed|cancelled; confirmed → cancelled; cancelled terminal)
    - Export `canTransitionPayment(from, to)`, `canTransitionBooking(from, to)`, and `assertTransition(table, from, to, ctx)` that throws `ConflictError` and logs `*.illegal_transition` on rejection
    - Update `lib/services/paymentService.ts` and `lib/schemas/bookingSchema.ts` to re-export their existing tables from this new module so callers continue to compile (no behaviour change yet)
    - _Requirements: 5.1, 5.2, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 2.2 Write property tests for state machine reachability
    - **Property 6: State-machine reachability and side-effect coupling**
    - For any sequence of recognised events applied to a Payment in CREATED + Booking in pending, assert: final `Payment.status` is reachable from CREATED via `PAYMENT_TRANSITIONS`; final `Booking.status` is reachable from pending via `BOOKING_TRANSITIONS`; illegal transitions leave both rows unchanged; `confirmed` only reachable via explicit admin confirm; `→ CAPTURED` from `pending` always yields `paid`
    - Use `numRuns: 500`
    - **Validates: Requirements 5.1, 5.2, 5.7, 5.8, 8.1, 8.2, 8.4, 8.5, 13.1, 13.2, 13.3, 13.4, 13.5, 18.2**

- [ ] 3. Implement webhook envelope Zod schema module
  - [ ] 3.1 Create `lib/payments/webhookSchema.ts` with `webhookEnvelopeSchema`
    - Define `paymentEntitySchema`, `orderEntitySchema`, `refundEntitySchema` per design (regex on ids, `moneyPaiseSchema` capped at 10_000_000_000)
    - Export `webhookEnvelopeSchema` covering `event`, `account_id?`, `id?`, `created_at?`, `payload.{payment|order|refund}.entity`
    - Export inferred `WebhookEnvelope` type
    - _Requirements: 7.1_

  - [ ]* 3.2 Write property test for webhook envelope schema validation
    - **Property 9: Webhook envelope schema validation**
    - For any JSON body conforming to the schema, assert `webhookEnvelopeSchema.safeParse` succeeds; for any body missing required fields, wrong-typed fields, or entity ids failing the regex, assert it fails with `ZodError` and produces no `WEBHOOK_PROCESSED` event downstream
    - **Validates: Requirements 7.1, 7.3**

- [ ] 4. Implement redaction helper and audit log module (without DB writes yet)
  - [ ] 4.1 Create `lib/payments/redact.ts` with `redactPayload(obj)`
    - Recursively walk objects; replace values for any key matching `signature`, `secret`, `password`, `token`, `razorpay_signature`, `x-razorpay-signature` with `"[REDACTED]"`
    - Rewrite any string matching `^(order|pay|rfnd|evt)_[A-Za-z0-9]+$` via existing `redactId(...)` from `lib/payments/razorpay.ts`
    - Update `lib/logger.ts` to import and use `redactPayload` so logger and audit log share one redaction policy (no behaviour change for callers)
    - _Requirements: 10.5, 15.3, 15.4_

  - [ ]* 4.2 Write property test for redaction policy totality
    - **Property 16: Redaction policy is total**
    - For any input object containing `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `x-razorpay-signature`, `razorpay_signature`, or any `order_…|pay_…|rfnd_…` id, assert the serialised output of `redactPayload(input)` contains none of those raw values and every Razorpay id appears only as `prefix_***last4`
    - **Validates: Requirements 2.11, 4.5, 4.6, 10.5, 15.3, 15.4**

  - [ ] 4.3 Create `lib/payments/auditLog.ts` skeleton (no DB writes yet)
    - Export `PaymentEventKind` union type
    - Export `RecordPaymentEventInput` interface and `recordPaymentEvent(input)` function signature
    - Export `isWebhookEventProcessed(eventId)` function signature
    - Implementation stubs `console.warn("auditLog not yet wired")` until the Prisma migration lands in task 5; this lets dependent code import the module today
    - _Requirements: 10.1_


- [ ] 5. Property and unit tests for HMAC signature verification
  - [ ] 5.1 Write property tests for payment + webhook signature round-trip
    - **Property 1: Payment-signature round-trip** — for any `order_id` matching `^order_[A-Za-z0-9]+$`, any `payment_id` matching `^pay_[A-Za-z0-9]+$`, and any non-empty secret, the signature `HMAC_SHA256(order_id+"|"+payment_id, secret)` is accepted by `verifyRazorpaySignature`, and any single-bit mutation causes verification to return `false`
    - **Property 2: Webhook-signature round-trip** — for any `rawBody` and any non-empty webhook secret, the signature is accepted by `verifyRazorpayWebhookSignature`, and any byte-level mutation causes verification to return `false` (including JSON re-serialisation, whitespace insertion)
    - Combined into one test file `tests/lib/payments/razorpay.signatures.property.test.ts`
    - **Validates: Requirements 4.1, 4.2, 6.1, 6.2, 6.4, 6.8, 17.1, 17.2, 17.7**

  - [ ] 5.2 Write property test for malformed-input fast-rejection
    - **Property 3: Verify rejects malformed inputs before crypto work**
    - For any tuple where at least one input fails the documented format guard (order_id regex, payment_id regex, signature length > 256, signature non-hex), assert `verifyRazorpaySignature` returns `false` and `crypto.createHmac` is never invoked (use `vi.spyOn(crypto, "createHmac")`)
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 5.3 Write unit tests for signature verification edge cases
    - Length-256 boundary, all-uppercase hex, mixed case, leading whitespace, empty signature
    - Webhook: empty secret throws or returns false consistently; oversized body short-circuits before HMAC
    - **Validates: Requirements 4.3, 4.4, 6.3, 6.5, 17.1, 17.2**

- [ ] 6. Checkpoint — Foundations complete
  - Ensure all tests pass, ask the user if questions arise.

## Surface consolidation (Prisma migrations and audit log wiring)

- [ ] 7. Add Prisma schema for PaymentEvent and Refund
  - [ ] 7.1 Add `PaymentEvent` model and `PaymentEventKind` enum to `prisma/schema.prisma`
    - Fields per design: `id`, `paymentId?`, `bookingId?`, `kind`, `eventId? @unique`, `razorpayEventName?`, `payload? Json`, `processed Boolean @default(false)`, `error? @db.Text`, `requestId`, `createdAt`
    - Indexes on `paymentId`, `bookingId`, `createdAt`, `[kind, createdAt]`
    - Map to `payment_events` table
    - Add inverse relation `paymentEvents PaymentEvent[]` on `Payment` and `Booking` (no column changes, additive only)
    - _Requirements: 9.5, 10.1, 10.7, 18.1_

  - [ ] 7.2 Add `Refund` model and `RefundStatus` enum to `prisma/schema.prisma`
    - Fields per design: `id`, `paymentId`, `razorpayRefundId @unique`, `amount Decimal(10,2)`, `currency @default("INR")`, `status RefundStatus @default(INITIATED)`, `reason?`, `createdAt`, `updatedAt`
    - Indexes on `paymentId`, `status`, `createdAt`
    - Map to `refunds` table
    - Add inverse relation `refunds Refund[]` on `Payment`
    - _Requirements: 12.1, 18.1_

  - [ ] 7.3 Generate and check in the Prisma migration files
    - Run `prisma migrate dev --name add_payment_event_and_refund --create-only` to create the migration SQL without applying
    - Review the generated SQL: must be additive (CREATE TABLE only, no ALTER on `payments` or `bookings` columns)
    - Run `prisma generate` to update the Prisma Client types
    - _Requirements: 18.1, 18.2_

- [ ] 8. Wire audit log writes into existing handlers (no behaviour change beyond persistence)
  - [ ] 8.1 Implement `recordPaymentEvent` and `isWebhookEventProcessed` against Prisma
    - Replace stubs from task 4.3 with real `prisma.paymentEvent.create` / `findFirst` calls
    - Accept optional `tx: Prisma.TransactionClient` so callers can write inside an existing transaction
    - Apply `redactPayload` to `payload` before persistence
    - _Requirements: 9.1, 9.4, 10.1, 10.5_

  - [ ] 8.2 Wire `ORDER_CREATED` audit row into `paymentService.createOrderForBooking`
    - Inside the existing transaction that upserts the Payment row, append `recordPaymentEvent({ kind: "ORDER_CREATED", paymentId, bookingId, payload: redactedOrder, processed: true, requestId, tx })`
    - Do not change response shape or any other behaviour
    - _Requirements: 10.2_

  - [ ] 8.3 Wire `VERIFY_ATTEMPTED` / `VERIFY_SUCCEEDED` / `VERIFY_FAILED` audit rows into the verify route
    - In `app/api/payments/verify/route.ts`: write `VERIFY_ATTEMPTED` (processed=false) before signature checking
    - In `paymentService.confirmPayment`: write `VERIFY_SUCCEEDED` inside the transaction on success, `VERIFY_FAILED` on signature/crosscheck failure with `error` populated
    - _Requirements: 10.3_

  - [ ] 8.4 Wire `WEBHOOK_RECEIVED` audit row into the webhook route
    - In `app/api/payments/webhook/route.ts`: after signature verification and JSON parse, write `WEBHOOK_RECEIVED` with `eventId = body.id ?? null`, `razorpayEventName = body.event`, `processed = false`
    - The handler will flip `processed = true` later when it writes `WEBHOOK_PROCESSED` (task 11)
    - _Requirements: 10.4_

  - [ ]* 8.5 Write integration test for audit-trail completeness
    - **Property 8: Audit-trail completeness**
    - End-to-end: create-order → verify happy path → assert exactly one `ORDER_CREATED`, one `VERIFY_ATTEMPTED`, one `VERIFY_SUCCEEDED` row exists for the booking, all with the same `requestId` chain
    - Webhook happy path → assert `WEBHOOK_RECEIVED` then `WEBHOOK_PROCESSED` exist; on rejected/illegal → assert `WEBHOOK_REJECTED`
    - Assert no `UPDATE` or `DELETE` against `payment_events` other than the documented `processed=true` flip (use a Prisma middleware spy)
    - **Validates: Requirements 9.4, 10.2, 10.3, 10.4, 10.6**


## Audit + idempotency (webhook validation, event-id dedup, row locking)

- [ ] 9. Tighten webhook transport-layer guards
  - [ ] 9.1 Add Content-Type, Content-Length header check, and Cache-Control to webhook route
    - In `app/api/payments/webhook/route.ts`: reject `Content-Type !== application/json` (case-insensitive) with HTTP 415 before any HMAC work
    - Reject when `Content-Length` header is present and exceeds 1_000_000 with HTTP 413, before reading the body
    - Ensure every response sets `Cache-Control: no-store, max-age=0` and `x-request-id` (preserve existing `withHeaders` wrapper, extend if needed)
    - _Requirements: 6.5, 6.6, 6.7, 15.2_

  - [ ] 9.2 Apply Zod parse against the verified raw body
    - After `verifyRazorpayWebhookSignature` succeeds, `JSON.parse(rawBody)` once and pass through `webhookEnvelopeSchema.parse(...)`
    - On `JSON.parse` failure → HTTP 400, log nothing (avoid leaking parse errors)
    - On Zod failure → HTTP 400, log `webhook.malformed_event` warning with the validation error message and `event` if available, do NOT write a `WEBHOOK_PROCESSED` row
    - On unrecognised event type that passes the schema → HTTP 200 with `action = "ignored:unhandled"`, log `info`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 6.8_

  - [ ]* 9.3 Write property test for webhook transport-layer guards
    - **Property 10: Webhook transport-layer guards**
    - For any webhook request: oversized body → HTTP 413 and HMAC never invoked (spy on `crypto.createHmac`); wrong Content-Type → HTTP 415; every response carries `Cache-Control: no-store, max-age=0` and `x-request-id`
    - **Validates: Requirements 6.5, 6.6, 6.7, 15.2**

- [ ] 10. Implement webhook event-id deduplication
  - [ ] 10.1 Add idempotency lookup before applying state change
    - In `app/api/payments/webhook/route.ts` after writing `WEBHOOK_RECEIVED`: if `body.id` is present, call `isWebhookEventProcessed(body.id)`; if true, return HTTP 200 with `{ ok: true, action: "idempotent:duplicate_event" }` and do not call `handleWebhook`
    - When `body.id` is absent, fall through to the existing status-based idempotency (current behaviour) and log `info` event noting the missing event id
    - _Requirements: 9.2, 9.3_

  - [ ] 10.2 Make `WEBHOOK_RECEIVED` insert use `eventId @unique` for race-safe dedup
    - When inserting the `WEBHOOK_RECEIVED` row with an `eventId`, catch `P2002` (unique constraint violation) and treat it identically to "already processed" — return `idempotent:duplicate_event` 200
    - This guarantees concurrent duplicate deliveries cannot both proceed to the handler
    - _Requirements: 9.5_

- [ ] 11. Strengthen verify and webhook transactions with row-level locking
  - [ ] 11.1 Add `SELECT … FOR UPDATE` row lock inside `paymentService.confirmPayment`
    - Inside the existing `prisma.$transaction(async (tx) => { … })`, before the existing re-read, issue `await tx.$queryRaw\`SELECT id FROM payments WHERE booking_id = ${bookingId} FOR UPDATE\``
    - Then proceed with the existing `tx.payment.findUnique` re-read and transition logic
    - Preserve the fast-path idempotency check (`razorpayPaymentId === input.razorpay_payment_id` and `status === CAPTURED`) outside the transaction; the row lock is the defence-of-last-resort
    - _Requirements: 5.5, 16.1, 16.2_

  - [ ] 11.2 Add `SELECT … FOR UPDATE` row lock inside `paymentService.handleWebhook`
    - Same pattern as 11.1, scoped to `WHERE razorpay_order_id = ${orderId}`
    - Ensure the `WEBHOOK_PROCESSED` audit-row write (`recordPaymentEvent({ kind: "WEBHOOK_PROCESSED", processed: true, eventId, tx })`) and the `processed=true` flip on the existing `WEBHOOK_RECEIVED` row both occur inside the same transaction as the Payment/Booking update
    - _Requirements: 8.7, 9.4, 16.1, 16.2, 16.4_

  - [ ] 11.3 Implement `WEBHOOK_REJECTED` audit row for illegal transitions and unknown orders
    - In `handleWebhook`: when the matched Payment status would yield an illegal transition, write `WEBHOOK_REJECTED` (processed=true) with `error="illegal_transition"`, return `action = "rejected:illegal_transition"` with HTTP 200, do not modify state
    - When the order id is not found in the DB, write `WEBHOOK_REJECTED` with `error="unknown_order"` (or skip the row if no `paymentId` is available — emit the warning log either way), return `action = "ignored:unknown_order"` with HTTP 200
    - When loser of the race sees `status="CAPTURED"`, return `action = "idempotent:already_captured"` HTTP 200 without re-firing notifications
    - _Requirements: 8.5, 8.6, 16.3_

  - [ ] 11.4 Wire `already_captured = true` short-circuit in verify
    - Ensure `confirmPayment` returns `{ alreadyCaptured: true }` when the row is already `CAPTURED` and the `razorpay_payment_id` matches; the verify route propagates this to the response body unchanged
    - _Requirements: 5.3, 16.3_

  - [ ]* 11.5 Write property test for state-machine + interleaving idempotency
    - **Property 7: Interleaved verify, webhook, and refund events are idempotent and exactly-once**
    - Use `eventTraceArb` to generate sequences mixing verify(success/failure), webhook(authorized/captured/order.paid/failed/refund.processed/refund.failed), with random duplicates and any interleaving
    - Apply each trace against a fresh in-memory or test-DB Payment+Booking pair via the real `confirmPayment` and `handleWebhook` services, with notifications spied
    - Assert: final `(Payment.status, Booking.status, Refund.status, PaymentEvent rows)` is independent of arrival order; customer-confirmation email count = 1 if any event produced `→ CAPTURED` else 0; refund-processed email count = number of distinct `INITIATED→PROCESSED` transitions; replaying any event with already-`processed=true` row produces zero changes; `order.paid` and `payment.captured` for the same order de-dup
    - Use `numRuns: 500`
    - **Validates: Requirements 5.3, 5.6, 8.3, 8.6, 8.8, 9.2, 9.5, 12.6, 12.7, 16.2, 16.3, 16.4**


- [ ] 12. Property tests for amount handling and currency rejection
  - [ ]* 12.1 Write property test for amount-paise equality at every boundary
    - **Property 4: Amount-paise equality at every boundary**
    - For any `Booking.totalPrice` in `(0, 10_000_000]` rupees, assert: value sent to mocked `razorpay.orders.create` equals `Math.round(totalPrice * 100)`; value compared during verify cross-check uses the same formula; equality is decided over integer paise
    - **Validates: Requirements 2.1, 2.2, 4.8, 14.1, 14.6**

  - [ ]* 12.2 Write property test for cross-check rejection on order/amount mismatch
    - **Property 5: Razorpay-side cross-check rejects mismatches**
    - For any signature-valid input, if mocked `razorpay.payments.fetch(...)` returns a different `order_id` or a different `amount` (paise), assert HTTP 400 and assert `prisma.payment.update` was never called
    - **Validates: Requirements 4.7, 4.8**

  - [ ]* 12.3 Write property test for currency rejection
    - **Property 15: Currency rejection**
    - For any `currency` other than the literal `"INR"` supplied to `POST /api/payments/create-order` or admin refund, assert HTTP 400 and assert no Razorpay SDK method is called (spy on the singleton)
    - **Validates: Requirements 14.3**

  - [ ]* 12.4 Write unit tests for amount and booking guards
    - Booking already paid / cancelled / confirmed → 409 (one example each)
    - Booking not found → 404
    - Amount ≤ 0 → 400; amount > 10_000_000 INR → 400
    - Amount mismatch when client supplies divergent value → 400 with `payments.create.amount_mismatch` log
    - Existing payment AUTHORIZED or CAPTURED → 409 (no overwrite)
    - Existing payment CREATED or FAILED → upsert with new order id, `razorpayPaymentId` and `razorpaySignature` reset to null
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.12, 14.4, 14.5_

- [ ] 13. Property test for cached-singleton Razorpay client
  - [ ]* 13.1 Write property test for `getRazorpay()` returning the same instance
    - **Property 19: Razorpay client is a cached singleton**
    - For any sequence of `getRazorpay()` calls within a single process where credentials are configured, assert all returned references are `===` identical
    - Add an example test for missing credentials path: importing the module without env does NOT throw; calling `getRazorpay()` throws an error containing the missing variable names but no other secret values
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ] 14. Checkpoint — Audit + idempotency complete
  - Ensure all tests pass, ask the user if questions arise.

## Confirmation truth source + refunds

- [ ] 15. Implement public booking-by-ref endpoint
  - [ ] 15.1 Add `BOOKING_BY_REF` rate-limit profile and route handler
    - Add `RATE_LIMITS.BOOKING_BY_REF = { limit: 60, windowMs: 60_000 }` in `lib/utils/rateLimit.ts`
    - Create `app/api/bookings/by-ref/[ref]/route.ts` exporting `GET(request, { params })`
    - Validate `params.ref` against `^KB-[A-Z0-9]{6,12}$`; on mismatch return 404 (avoid enumeration oracle)
    - Look up Booking + linked Payment by `bookingRef`; on miss return `{ error: "Booking not found" }` 404
    - Compute `guestFirstName = guestName.split(/\s+/)[0]`
    - Return only: `{ bookingRef, guestFirstName, itemName, itemType, status, totalPrice, currency, paymentMethod? }`. Include `paymentMethod` only when status is `paid` or `confirmed`
    - Apply rate limit, set `Cache-Control: no-store`, set `x-request-id`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7_

  - [ ]* 15.2 Write property test for by-ref endpoint field exposure
    - **Property 11: by-ref endpoint exposes only documented fields**
    - For any `Booking` row (with or without linked Payment), assert the JSON response key set is a subset of `{ bookingRef, guestFirstName, itemName, itemType, status, totalPrice, currency, paymentMethod }` and never contains `{ id, guestName, guestEmail, guestPhone, razorpayOrderId, razorpayPaymentId, razorpaySignature, specialRequests }`
    - **Validates: Requirements 11.2, 11.3**

  - [ ]* 15.3 Write unit tests for by-ref edge cases
    - Malformed ref → 404; unknown ref → 404 (same response shape)
    - Status not `paid|confirmed` → response omits `paymentMethod`
    - Rate-limit threshold → 429 with `Retry-After` header after 60 requests in window
    - _Requirements: 11.4, 11.7_

- [ ] 16. Rewrite confirmation page as Server Component
  - [ ] 16.1 Convert `app/confirmation/page.tsx` to a Server Component fetching `by-ref`
    - Read `searchParams.ref`; if missing, render a "Booking reference required" state
    - Server-fetch `GET /api/bookings/by-ref/{ref}` via relative `fetch` (Next.js App Router server fetch); set `cache: "no-store"`
    - Render based on the server response status:
      - `paid` or `confirmed` → "Reservation Confirmed" with item, ref, total, method
      - `pending` → "Awaiting payment confirmation — refresh in a moment" message
      - `cancelled` → "This booking was cancelled" with link home
      - 404 → "Booking not found"
    - Accept `total`, `name`, `item` query params for backwards compatibility but do NOT use them as authoritative for status display
    - _Requirements: 11.1, 11.5, 11.6_

  - [ ]* 16.2 Write integration test for confirmation page server-fetch shape
    - **Property 12: Confirmation UI is driven by server truth**
    - Render the page server-side with a known ref; assert the rendered HTML contains "Confirmed · paid" if and only if the server response `status ∈ { "paid", "confirmed" }`, regardless of `total`, `name`, `item` URL parameter values
    - Test cases: paid + manipulated `total=999999` URL param → still shows true `totalPrice`; pending + `total=...` → still shows "Awaiting payment"; unknown ref → "Booking not found"
    - **Validates: Requirements 11.5, 11.6**


- [ ] 17. Implement admin refund endpoint
  - [ ] 17.1 Add `refundSchema` to `lib/schemas/paymentSchema.ts`
    - Optional `amount` (Decimal rupees), optional `reason` (string, max 512), optional `currency` defaulting to `"INR"`
    - Reject any `currency !== "INR"` (Property 15 / Requirement 14.3)
    - _Requirements: 12.2, 14.3_

  - [ ] 17.2 Implement `paymentService.initiateRefund(paymentId, input, ctx)`
    - Load Payment by id; reject 409 if `status !== "CAPTURED"`
    - Compute `availableForRefund = capturedPaise - sum(prior PROCESSED refund paise)`
    - Default requested amount to the captured rupee amount; reject 400 if `requested > availableForRefund / 100`
    - Call `razorpay.payments.refund(payment.razorpayPaymentId, { amount: paise, notes: { reason, requestId } })`
    - Inside a single transaction: `prisma.refund.create` with status `INITIATED`, write `REFUND_INITIATED` `PaymentEvent`
    - Do NOT modify Booking status (refund and cancel are separate admin actions)
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.8_

  - [ ] 17.3 Create `app/api/admin/payments/[id]/refund/route.ts` POST handler
    - Authenticate via existing `requireAdmin()` helper (allow `SUPERADMIN` and `STAFF`)
    - Parse body with `refundSchema`
    - Call `initiateRefund`; map errors via `handleApiError`
    - Return 201 with the persisted Refund row shape on success
    - _Requirements: 12.2, 12.3, 12.4, 12.5_

  - [ ]* 17.4 Write property test for refund initiation guards and atomicity
    - **Property 13: Refund initiation guards and atomicity**
    - For any `(payment.status, capturedPaise, priorRefundedSum, requested)` tuple: assert `status !== "CAPTURED"` → 409 + no Refund row; `requested > available` → 400 + no Refund row; otherwise → 201 + exactly one Refund row with `status="INITIATED"` and exactly one `REFUND_INITIATED` PaymentEvent in the same transaction
    - **Validates: Requirements 12.3, 12.4, 12.5**

- [ ] 18. Implement refund webhook branches
  - [ ] 18.1 Add `applyRefundEvent(event, tx)` branch to `paymentService.handleWebhook`
    - On `refund.processed`: load Refund by `razorpayRefundId`; only when transitioning `INITIATED → PROCESSED`, update status to `PROCESSED`, write `REFUND_PROCESSED` PaymentEvent (processed=true), and post-commit fire `sendRefundProcessedEmail` exactly once
    - On `refund.failed`: load Refund; update status to `FAILED`; write `WEBHOOK_PROCESSED` PaymentEvent with `error` populated from the payload's `error_description`
    - Both branches respect the existing event-id idempotency lookup from task 10
    - Booking status MUST NOT be modified on either branch
    - _Requirements: 12.6, 12.7, 12.8_

  - [ ] 18.2 Add `sendRefundProcessedEmail` to the email service
    - Add a new template + dispatch function in `lib/services/emailService.ts` (or equivalent existing module) that takes a Refund + Payment + Booking and emails the customer
    - Wire the call into `applyRefundEvent` post-commit, fire-and-forget, behind try/catch with structured warn logging
    - _Requirements: 12.6_

  - [ ]* 18.3 Write property test that refunds do not mutate Booking status
    - **Property 14: Refunds do not mutate Booking status**
    - For any successful refund initiation followed by any subsequent `refund.processed` or `refund.failed` webhook, assert `Booking.status` value before equals value after
    - **Validates: Requirements 12.8**

  - [ ]* 18.4 Write integration test for end-to-end refund flow
    - admin POST refund (auth'd) → mocked Razorpay returns `rfnd_xxx` → DB has `Refund(INITIATED)` + `REFUND_INITIATED` event
    - Webhook `refund.processed` arrives → DB has `Refund(PROCESSED)` + `REFUND_PROCESSED` event + exactly one refund email sent
    - Replay the same webhook → no additional email, Refund unchanged
    - _Requirements: 12.5, 12.6, 12.7, 9.2_

- [ ] 19. Property tests for request-id correlation and notification durability
  - [ ]* 19.1 Write property test for request-id correlation
    - **Property 17: Request-id correlation**
    - For any request to a payment route, assert the value in the `x-request-id` response header equals the `requestId` field of every log line emitted during the request, equals `PaymentEvent.requestId` of every audit row written, and equals the `requestId` propagated to error responses
    - **Validates: Requirements 15.1, 15.2**

  - [ ]* 19.2 Write property test for notification durability
    - **Property 18: Notification durability**
    - For any injected failure of `sendPaymentConfirmation`, `sendAdminPaymentNotification`, or `sendOwnerWhatsAppNotice` after a successful `→ CAPTURED` transition, assert post-request DB state of `Payment` and `Booking` equals the state when notifications succeed; replaying the event after a notification failure does NOT retry the notification
    - **Validates: Requirements 5.9**

- [ ] 20. Checkpoint — Confirmation truth source + refunds complete
  - Ensure all tests pass, ask the user if questions arise.


## Migration & cutover (three-deploy legacy route deprecation)

- [ ] 21. Deploy 1 — forward legacy routes with structured logging
  - [ ] 21.1 Add `payments.legacy_route_hit` log to canonical handlers
    - In each canonical handler (`app/api/payments/create-order/route.ts`, `app/api/payments/verify/route.ts`, `app/api/payments/webhook/route.ts`), inspect `request.url`/`request.nextUrl.pathname`; when it begins with `/api/payment/` (singular), emit `logger.warn("payments.legacy_route_hit", { path, requestId })` once per request
    - Preserve the existing `export { POST } from "@/app/api/payments/..."` re-exports under `app/api/payment/*`
    - This lets the operator measure traffic on the legacy paths in production logs before flipping to 410
    - _Requirements: 1.4, 18.4_

  - [ ]* 21.2 Write integration test for legacy-route equivalence
    - **Property 20: Legacy-route equivalence (transition window only)**
    - For a well-formed body, send the same request to `/api/payment/create-order` and to `/api/payments/create-order`; assert identical HTTP status, response body, and persisted DB state
    - Repeat for `/api/payment/verify` vs `/api/payments/verify` and `/api/payment/webhook` vs `/api/payments/webhook`
    - Assert the legacy hit produced a `payments.legacy_route_hit` warn log line
    - **Validates: Requirements 18.4**

- [ ] 22. Deploy 2 — return 410 Gone from legacy routes
  - [ ] 22.1 Replace each legacy route body with a 410 Gone handler
    - In `app/api/payment/create-order/route.ts`, `app/api/payment/verify/route.ts`, `app/api/payment/webhook/route.ts`: replace the canonical re-export with a fixed POST handler returning HTTP 410 and JSON `{ error: "Gone — use /api/payments/{...}" }` (with the correct path per route)
    - Set `Cache-Control: no-store, max-age=0` on the response
    - Preserve `runtime = "nodejs"` and `dynamic = "force-dynamic"` exports for consistency
    - The webhook 410 deploy is gated on operator confirmation (per design "Migration Plan") that the Razorpay dashboard URL has been updated; document this dependency in the task notes
    - _Requirements: 1.2, 1.3, 1.5_

  - [ ]* 22.2 Write unit tests for 410 responses on legacy routes
    - One example test per legacy path asserting HTTP 410, JSON body matching the documented shape, and `Cache-Control: no-store, max-age=0`
    - _Requirements: 1.3_

- [ ] 23. Deploy 3 — delete legacy route folder
  - [ ] 23.1 Remove `app/api/payment/` directory and any references
    - Delete the `app/api/payment/create-order`, `app/api/payment/verify`, `app/api/payment/webhook` folders
    - Remove any documentation references to the singular `/api/payment/*` paths
    - Update README / DEVELOPMENT.md / docs to list `/api/payments/webhook` as the only Razorpay webhook URL to register
    - _Requirements: 1.1, 1.2, 1.4, 18.5_

  - [ ]* 23.2 Verify no live references remain to `/api/payment/`
    - grep the codebase for `/api/payment/` (singular) and assert zero non-test, non-docs hits
    - Update or remove any leftover legacy-route tests
    - _Requirements: 18.5_

- [ ] 24. Final checkpoint — Migration & cutover complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP. Core implementation tasks (state machine, audit log, migrations, route handlers, refund flow, three-deploy cutover) are mandatory.
- Each task references specific requirements clauses (e.g., `_Requirements: 9.1, 9.5_`) for traceability back to `requirements.md`.
- Property test sub-tasks explicitly reference the property number from `design.md` Correctness Properties (P1–P20) and the requirements they validate.
- Tasks 21, 22, 23 are the three migration deploys; they MUST ship in order, with deploy 22 (410 Gone) gated on the operator updating the Razorpay dashboard webhook URL between deploys 21 and 22 (Requirement 18.3).
- The `SELECT … FOR UPDATE` row lock in tasks 11.1 and 11.2 is the defence-of-last-resort behind the existing fast-path idempotency check — both layers are preserved.
- Property test runs use `numRuns: 100` minimum, `numRuns: 500` for state-machine reachability (Property 6) and interleaving idempotency (Property 7).
- Implementation language: TypeScript (matches existing Next.js + Prisma codebase). Test runner: vitest with fast-check.

## Task Dependency Graph

Note on serialization: many tasks edit the same files (`lib/services/paymentService.ts`, `app/api/payments/webhook/route.ts`, `prisma/schema.prisma`). Those tasks MUST be placed in different waves to avoid merge conflicts even when they appear logically independent.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "5.2", "5.3", "13.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "4.3"] },
    { "id": 3, "tasks": ["7.1"] },
    { "id": 4, "tasks": ["7.2"] },
    { "id": 5, "tasks": ["7.3"] },
    { "id": 6, "tasks": ["8.1", "15.1", "17.1"] },
    { "id": 7, "tasks": ["8.2", "8.4", "15.2", "15.3", "16.1"] },
    { "id": 8, "tasks": ["8.3", "9.1", "16.2"] },
    { "id": 9, "tasks": ["9.2"] },
    { "id": 10, "tasks": ["10.1"] },
    { "id": 11, "tasks": ["10.2", "11.1"] },
    { "id": 12, "tasks": ["11.2"] },
    { "id": 13, "tasks": ["11.3"] },
    { "id": 14, "tasks": ["11.4", "17.2"] },
    { "id": 15, "tasks": ["17.3", "18.1"] },
    { "id": 16, "tasks": ["18.2"] },
    { "id": 17, "tasks": ["8.5", "9.3", "11.5", "12.1", "12.2", "12.3", "12.4", "17.4", "18.3", "18.4", "19.1", "19.2"] },
    { "id": 18, "tasks": ["21.1"] },
    { "id": 19, "tasks": ["21.2"] },
    { "id": 20, "tasks": ["22.1"] },
    { "id": 21, "tasks": ["22.2"] },
    { "id": 22, "tasks": ["23.1"] },
    { "id": 23, "tasks": ["23.2"] }
  ]
}
```
