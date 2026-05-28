# Razorpay Payment Hardening — Full Overview

## What Has Been Done So Far

No application code has been modified. The work completed is a **spec** (structured plan) that lives in `.kiro/specs/razorpay-payment-hardening/`:

| File | Purpose |
|------|---------|
| `requirements.md` | 18 requirements with user stories and acceptance criteria |
| `design.md` | Architecture, data models, sequence diagrams, 20 correctness properties, testing strategy |
| `tasks.md` | 24 task groups (50 leaf sub-tasks) with dependency ordering |
| `.config.kiro` | Workflow metadata |

---

## Current State of the Payment System (Before Changes)

### What Already Works Well
- Lazy Razorpay SDK initialization (singleton, fails at runtime not build time)
- HMAC-SHA256 signature verification with `crypto.timingSafeEqual`
- Raw-body webhook signature verification (no JSON re-stringify)
- Prisma-transactional state-machine guards
- Single-fire notifications (email + WhatsApp on capture)
- Structured logger with redacted Razorpay IDs
- In-memory rate limiter
- ID format validation (regex on `order_*`, `pay_*`)

### What Needs Fixing / Adding
| Gap | Risk |
|-----|------|
| Duplicate URL surface (`/api/payment/*` AND `/api/payments/*`) | Two webhook URLs, confusion, divergence risk |
| No persistent audit log | Can't reconstruct payment history without grepping logs |
| No event-id-level webhook idempotency | Razorpay retries can re-fire emails |
| No Zod schema for webhook payloads | Malformed events cause TypeErrors deep in handler |
| No refund flow | Admin can't reverse a captured payment |
| Confirmation page trusts URL params | Customer can be misled by manipulated URLs |
| No `SELECT ... FOR UPDATE` row lock | Tiny race window between verify and webhook |

---

## Phase-by-Phase Implementation Plan

### Phase 1: Foundations (Tasks 1–6)

**Goal:** Introduce pure new modules that don't change any runtime behaviour. Safe to deploy immediately.

#### Changes:

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `vitest`, `@vitest/coverage-v8`, `fast-check` as devDependencies; add `test` and `test:coverage` scripts |
| `vitest.config.ts` | Create | Test runner config with `pool: "forks"`, path aliases, setup file |
| `tests/setup.ts` | Create | Load `.env.test`, stub Razorpay env vars for tests |
| `tests/generators/razorpayIdArb.ts` | Create | fast-check generators for `order_*`, `pay_*`, `rfnd_*`, `evt_*` IDs |
| `tests/generators/paiseArb.ts` | Create | Integer paise generator + rupee conversion helper |
| `tests/generators/bookingArb.ts` | Create | Booking record arbitrary |
| `tests/generators/paymentArb.ts` | Create | Payment record arbitrary |
| `tests/generators/webhookEnvelopeArb.ts` | Create | Valid webhook envelope generators for all event types |
| `tests/generators/eventTraceArb.ts` | Create | Mixed verify/webhook/refund event sequences with duplicates |
| `lib/payments/stateMachine.ts` | Create | `PAYMENT_TRANSITIONS`, `BOOKING_TRANSITIONS`, `canTransitionPayment()`, `canTransitionBooking()`, `assertTransition()` |
| `lib/services/paymentService.ts` | Modify | Re-export transition tables from new `stateMachine.ts` (no logic change) |
| `lib/schemas/bookingSchema.ts` | Modify | Re-export booking transitions from `stateMachine.ts` |
| `lib/payments/webhookSchema.ts` | Create | Zod schemas: `paymentEntitySchema`, `orderEntitySchema`, `refundEntitySchema`, `webhookEnvelopeSchema` |
| `lib/payments/redact.ts` | Create | `redactPayload(obj)` — recursive redaction of secrets and Razorpay IDs |
| `lib/logger.ts` | Modify | Import and use shared `redactPayload` (same behaviour, shared policy) |
| `lib/payments/auditLog.ts` | Create | Skeleton: `PaymentEventKind` type, `RecordPaymentEventInput` interface, stub functions |
| `tests/lib/payments/razorpay.signatures.property.test.ts` | Create | Property tests P1 (payment signature round-trip) + P2 (webhook signature round-trip) |
| `tests/lib/payments/razorpay.malformed.property.test.ts` | Create | Property test P3 (malformed inputs rejected before crypto) |
| `tests/lib/payments/stateMachine.property.test.ts` | Create | Property test P6 (state-machine reachability, 500 runs) |
| `tests/lib/payments/redact.property.test.ts` | Create | Property test P16 (redaction policy totality) |
| `tests/lib/payments/webhookSchema.property.test.ts` | Create | Property test P9 (schema validation) |
| `tests/lib/payments/razorpay.singleton.test.ts` | Create | Property test P19 (cached singleton) |

#### What This Achieves:
- Test infrastructure ready for all subsequent phases
- State machine logic centralised and independently testable
- Webhook payload shape defined and validated
- Redaction policy shared between logger and audit log
- All foundation modules importable by later tasks without circular deps

---

### Phase 2: Surface Consolidation (Tasks 7–8)

**Goal:** Add the new database tables and wire audit logging into existing handlers. Still no behaviour change visible to end users.

#### Changes:

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `PaymentEventKind` enum, `RefundStatus` enum, `PaymentEvent` model (with `eventId @unique`), `Refund` model, inverse relations on `Payment` and `Booking` |
| `prisma/migrations/YYYYMMDD_add_payment_event_and_refund/` | Create | Additive SQL: `CREATE TABLE payment_events`, `CREATE TABLE refunds`, indexes. No ALTER on existing tables |
| `lib/payments/auditLog.ts` | Modify | Replace stubs with real `prisma.paymentEvent.create` / `findFirst` implementations |
| `app/api/payments/create-order/route.ts` | Modify | Add `recordPaymentEvent({ kind: "ORDER_CREATED" })` inside existing transaction |
| `app/api/payments/verify/route.ts` | Modify | Add `VERIFY_ATTEMPTED` before signature check, `VERIFY_SUCCEEDED` / `VERIFY_FAILED` after |
| `app/api/payments/webhook/route.ts` | Modify | Add `WEBHOOK_RECEIVED` after signature verification and JSON parse |

#### What This Achieves:
- `PaymentEvent` table captures every payment-related action
- `Refund` table ready for Phase 4
- Existing handlers now write audit rows without changing their response shape or status codes
- No migration of existing data needed — new tables are additive

---

### Phase 3: Audit + Idempotency (Tasks 9–14)

**Goal:** Tighten the webhook handler, add event-level deduplication, and add row-level locking to eliminate the verify/webhook race condition.

#### Changes:

| File | Action | Description |
|------|--------|-------------|
| `app/api/payments/webhook/route.ts` | Modify | Add `Content-Type` check (415), `Content-Length` > 1MB check (413), `Cache-Control: no-store` header, Zod parse after signature verification, event-id idempotency lookup before `handleWebhook`, `P2002` catch on `WEBHOOK_RECEIVED` insert for race-safe dedup |
| `lib/services/paymentService.ts` (`confirmPayment`) | Modify | Add `SELECT id FROM payments WHERE booking_id = $1 FOR UPDATE` inside the transaction before the existing re-read |
| `lib/services/paymentService.ts` (`handleWebhook`) | Modify | Add `SELECT id FROM payments WHERE razorpay_order_id = $1 FOR UPDATE` inside the transaction; write `WEBHOOK_PROCESSED` (processed=true) in same tx; write `WEBHOOK_REJECTED` for illegal transitions and unknown orders; return `action = "idempotent:already_captured"` when loser of race |
| `lib/services/paymentService.ts` (`confirmPayment`) | Modify | Return `{ alreadyCaptured: true }` when row is already CAPTURED and payment ID matches |
| `tests/lib/payments/webhook.transport.property.test.ts` | Create | Property test P10 (transport-layer guards) |
| `tests/lib/payments/interleave.property.test.ts` | Create | Property test P7 (interleaving idempotency, 500 runs) |
| `tests/lib/payments/amount.property.test.ts` | Create | Property tests P4 (amount-paise equality) + P5 (cross-check rejection) + P15 (currency rejection) |
| `tests/lib/payments/amount.unit.test.ts` | Create | Unit tests for booking guards, amount bounds, upsert logic |

#### What This Achieves:
- Webhook handler rejects malformed payloads early with clear errors
- Duplicate Razorpay webhook deliveries are detected by event ID and short-circuited
- Concurrent verify + webhook for the same payment serialise on the row lock — exactly one performs the capture, exactly one sends notifications
- The "losing" handler returns a success response (no error to the user or Razorpay)

---

### Phase 4: Confirmation Truth Source + Refunds (Tasks 15–20)

**Goal:** Make the confirmation page trustworthy, and add the refund flow.

#### Changes:

| File | Action | Description |
|------|--------|-------------|
| `lib/utils/rateLimit.ts` | Modify | Add `RATE_LIMITS.BOOKING_BY_REF = { limit: 60, windowMs: 60_000 }` |
| `app/api/bookings/by-ref/[ref]/route.ts` | Create | Public GET endpoint: validate ref format, lookup booking, return only safe fields (`bookingRef`, `guestFirstName`, `itemName`, `itemType`, `status`, `totalPrice`, `currency`, `paymentMethod?`) |
| `app/confirmation/page.tsx` | Rewrite | Server Component that fetches `/api/bookings/by-ref/{ref}` and renders based on server-returned status. URL params accepted for backwards compat but NOT authoritative |
| `lib/schemas/paymentSchema.ts` | Modify | Add `refundSchema` (optional amount, reason, currency=INR) |
| `lib/services/paymentService.ts` | Modify | Add `initiateRefund(paymentId, input, ctx)` — validates CAPTURED status, computes available amount, calls Razorpay refund API, creates Refund row + REFUND_INITIATED event in one transaction |
| `app/api/admin/payments/[id]/refund/route.ts` | Create | Admin POST endpoint: `requireAdmin()`, parse body, call `initiateRefund`, return 201 |
| `lib/services/paymentService.ts` (`handleWebhook`) | Modify | Add `refund.processed` and `refund.failed` branches: update Refund status, write PaymentEvent, send refund email (exactly once on INITIATED→PROCESSED) |
| `lib/services/emailService.ts` | Modify | Add `sendRefundProcessedEmail(refund, payment, booking)` template + dispatch |
| `tests/lib/payments/byref.property.test.ts` | Create | Property test P11 (field exposure) |
| `tests/lib/payments/confirmation.integration.test.ts` | Create | Property test P12 (UI driven by server truth) |
| `tests/lib/payments/refund.property.test.ts` | Create | Property tests P13 (refund guards) + P14 (refunds don't mutate booking) |
| `tests/lib/payments/refund.integration.test.ts` | Create | End-to-end refund flow test |
| `tests/lib/payments/requestId.property.test.ts` | Create | Property test P17 (request-id correlation) |
| `tests/lib/payments/notification.property.test.ts` | Create | Property test P18 (notification durability) |

#### What This Achieves:
- Confirmation page shows real booking status from the database — URL manipulation has no effect
- Admins can issue full or partial refunds via API
- Refund lifecycle tracked in DB (INITIATED → PROCESSED/FAILED) via webhooks
- Customer gets a refund-processed email exactly once
- Booking status is never changed by a refund (separate admin action to cancel)

---

### Phase 5: Migration & Cutover (Tasks 21–24)

**Goal:** Remove the duplicate `/api/payment/*` routes in three safe deploys.

#### Deploy 1 — Forward with Logging (Task 21)

| File | Action | Description |
|------|--------|-------------|
| `app/api/payments/create-order/route.ts` | Modify | Add `logger.warn("payments.legacy_route_hit")` when request URL starts with `/api/payment/` |
| `app/api/payments/verify/route.ts` | Modify | Same legacy-hit warning |
| `app/api/payments/webhook/route.ts` | Modify | Same legacy-hit warning |

**Operator action between Deploy 1 and Deploy 2:** Update the Razorpay dashboard webhook URL from `/api/payment/webhook` to `/api/payments/webhook`.

#### Deploy 2 — Return 410 Gone (Task 22)

| File | Action | Description |
|------|--------|-------------|
| `app/api/payment/create-order/route.ts` | Rewrite | Fixed handler returning HTTP 410 + JSON `{ error: "Gone — use /api/payments/create-order" }` |
| `app/api/payment/verify/route.ts` | Rewrite | Fixed handler returning HTTP 410 + JSON `{ error: "Gone — use /api/payments/verify" }` |
| `app/api/payment/webhook/route.ts` | Rewrite | Fixed handler returning HTTP 410 + JSON `{ error: "Gone — use /api/payments/webhook" }` |

#### Deploy 3 — Delete Legacy Folder (Task 23)

| File | Action | Description |
|------|--------|-------------|
| `app/api/payment/` (entire directory) | Delete | Remove all legacy route files |
| `README.md` / `DEVELOPMENT.md` | Modify | Update docs to list `/api/payments/webhook` as the only webhook URL |

#### What This Achieves:
- Single canonical URL surface (`/api/payments/*`)
- No risk of two divergent code paths
- One webhook URL to register with Razorpay
- Clean codebase with no dead routes

---

## New Database Tables

### `payment_events` (append-only audit log)

| Column | Type | Notes |
|--------|------|-------|
| `id` | cuid | Primary key |
| `paymentId` | string? | FK → Payment |
| `bookingId` | string? | FK → Booking |
| `kind` | enum | ORDER_CREATED, VERIFY_ATTEMPTED, VERIFY_SUCCEEDED, VERIFY_FAILED, WEBHOOK_RECEIVED, WEBHOOK_PROCESSED, WEBHOOK_REJECTED, REFUND_INITIATED, REFUND_PROCESSED |
| `eventId` | string? | Razorpay webhook event ID (unique constraint for dedup) |
| `razorpayEventName` | string? | e.g. "payment.captured" |
| `payload` | JSON? | Redacted — no secrets, IDs masked |
| `processed` | boolean | Flips to true when state change commits |
| `error` | text? | Error message on rejection |
| `requestId` | string | Correlates with x-request-id header |
| `createdAt` | datetime | Auto-set |

### `refunds`

| Column | Type | Notes |
|--------|------|-------|
| `id` | cuid | Primary key |
| `paymentId` | string | FK → Payment |
| `razorpayRefundId` | string | Unique (Razorpay refund ID) |
| `amount` | Decimal(10,2) | Refund amount in rupees |
| `currency` | string | Default "INR" |
| `status` | enum | INITIATED, PROCESSED, FAILED |
| `reason` | string? | Admin-provided reason |
| `createdAt` | datetime | Auto-set |
| `updatedAt` | datetime | Auto-updated |

---

## New API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/bookings/by-ref/{ref}` | Public | Fetch non-sensitive booking fields by reference |
| POST | `/api/admin/payments/{id}/refund` | Admin | Initiate a full or partial refund |

---

## New Modules

| Path | Purpose |
|------|---------|
| `lib/payments/stateMachine.ts` | Centralised Payment + Booking transition tables and helpers |
| `lib/payments/webhookSchema.ts` | Zod schema for Razorpay webhook envelope validation |
| `lib/payments/redact.ts` | Shared redaction helper for audit log and logger |
| `lib/payments/auditLog.ts` | `recordPaymentEvent()` and `isWebhookEventProcessed()` |

---

## Test Suite Summary

| Category | Count | Library | Key Properties |
|----------|-------|---------|----------------|
| Property-based tests | 20 properties | fast-check (100–500 runs) | HMAC round-trips, state-machine reachability, interleaving idempotency, redaction totality, field exposure |
| Unit tests | ~15 test files | vitest | Edge cases, guards, format validation, rate limits |
| Integration tests | 6 scenarios | vitest + Prisma test schema | End-to-end flows: verify-first, webhook-first, duplicate webhook, refund, confirmation page, legacy forwarding |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking in-flight payments during deploy | Migrations are additive only; no existing columns altered; legacy routes forward during transition window |
| Double-charging on verify/webhook race | `SELECT ... FOR UPDATE` row lock + status-based fast-path idempotency |
| Duplicate emails from webhook retries | Event-ID-level deduplication via `eventId @unique` constraint |
| Secrets in logs or audit table | Shared `redactPayload()` used by both logger and audit log; property test P16 verifies totality |
| Confirmation page spoofing | Server-fetched booking status; URL params are cosmetic only |

---

## How to Execute

1. Open `.kiro/specs/razorpay-payment-hardening/tasks.md`
2. Either "Run All Tasks" to execute end-to-end, or click individual tasks
3. Between Deploy 1 and Deploy 2 (tasks 21 and 22), update the Razorpay dashboard webhook URL manually
4. After Deploy 3 (task 23), verify no references to `/api/payment/` remain in the codebase

---

*Generated: May 21, 2026*
*Spec: `.kiro/specs/razorpay-payment-hardening/`*
