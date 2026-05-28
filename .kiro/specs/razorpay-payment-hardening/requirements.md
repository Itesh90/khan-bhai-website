# Requirements Document

## Introduction

This spec covers the verification and hardening of the Razorpay payment integration for the Khan Bhai S. website (Next.js + Prisma + PostgreSQL). The current implementation already includes HMAC-SHA256 signature verification, a payment state machine, idempotent verify and webhook handlers, and structured logging. However, the codebase exposes the payment endpoints under two parallel URL prefixes (`/api/payment/*` and `/api/payments/*`), lacks a persistent audit log of payment events, has no refund flow, and the customer-facing confirmation page trusts URL parameters instead of querying the booking. The webhook handler also lacks schema-level validation of incoming payloads and event-id-level idempotency.

The goal is to (a) verify that every part of the existing flow is correct and well-tested, and (b) close the remaining gaps so the integration is safe to operate in production: a single canonical URL surface, a `PaymentEvent` audit table with event-id deduplication, validated webhook payloads, refund support, a trustworthy confirmation page, and a small but meaningful test suite covering signature verification, the state machine, and webhook idempotency.

This spec does NOT cover: changing payment provider, multi-currency support beyond INR, partial-amount payments, subscription/recurring billing, payouts, or Razorpay Route (vendor split-settlement).

## Glossary

- **Razorpay**: The third-party Indian payment gateway used for collecting payments. Provides Orders API, Payments API, Webhooks, and a hosted JS Checkout SDK.
- **Order**: A Razorpay-side record (id prefix `order_`) created server-side that fixes the amount and currency for a single payment attempt.
- **Payment**: A Razorpay-side record (id prefix `pay_`) created when a user pays against an Order. The `Payment` Prisma model is the local mirror of this record plus the link back to the booking.
- **Booking**: The local domain entity (Prisma `Booking` model) representing a room stay, tour, or restaurant reservation. A Booking has at most one Payment.
- **Booking_Ref**: A short human-readable reference for a booking (e.g. `KB-XXXXXX`) shown to customers and used as the Razorpay `receipt`.
- **Signature**: The HMAC-SHA256 hex digest Razorpay uses to authenticate (i) the redirect from the Checkout SDK back to the merchant (`razorpay_signature`) and (ii) webhook callbacks (`x-razorpay-signature` header).
- **Webhook**: An HTTP POST sent by Razorpay to a configured merchant URL announcing a payment lifecycle event. Signed with `RAZORPAY_WEBHOOK_SECRET`.
- **Webhook_Event_Id**: The `id` field on a Razorpay webhook envelope (e.g. `evt_xxx`); unique per delivery and used for event-level deduplication.
- **Payment_State_Machine**: The set of allowed transitions over `PaymentStatus` (`CREATED → AUTHORIZED | CAPTURED | FAILED`, `AUTHORIZED → CAPTURED | FAILED`; `CAPTURED` and `FAILED` are terminal except for refund flow).
- **Booking_State_Machine**: The set of allowed transitions over `BookingStatus` (`pending → paid → confirmed`; `cancelled` reachable from any non-terminal state). `paid` is set automatically by payment capture; `confirmed` is a separate manual admin action.
- **Idempotency**: The property that repeated invocations of a handler with the same input produce the same persisted state and the same external side effects (notifications, etc.) exactly once.
- **PaymentEvent**: A new Prisma model added by this spec — an append-only audit log of every order-create, verify, and webhook event, keyed by `Webhook_Event_Id` (when applicable) for event-level idempotency.
- **Refund**: A Razorpay-initiated reversal of a captured payment. Modeled by a new `Refund` Prisma row linked to the Payment.
- **Canonical_Route**: The single agreed URL prefix for the payment API. This spec selects `/api/payments/*` as canonical and removes `/api/payment/*`.
- **Server_Authoritative_Amount**: The rule that the chargeable amount is always derived from the Booking's stored `totalPrice` server-side; any client-supplied amount is treated as advisory and used only as a sanity check.

## Requirements

### Requirement 1: Canonical Payment Route Surface

**User Story:** As a developer maintaining the payment integration, I want a single canonical URL prefix for payment endpoints, so that there is one webhook URL to register with Razorpay and no risk of two divergent code paths.

#### Acceptance Criteria

1. THE Payment_API SHALL expose order creation, verification, and webhook handling under the prefix `/api/payments/` only.
2. THE Payment_API SHALL NOT expose any handler under the legacy prefix `/api/payment/` after this spec is implemented.
3. WHEN a request is sent to a legacy `/api/payment/*` route, THE Payment_API SHALL return HTTP 410 (Gone) with a JSON body indicating the canonical replacement path.
4. THE Documentation SHALL list `/api/payments/webhook` as the only Razorpay webhook URL to register.
5. THE Webhook_Endpoint SHALL be reachable at exactly one URL path; duplicate aliases SHALL be removed.

### Requirement 2: Razorpay Order Creation

**User Story:** As a customer ready to pay, I want the system to create a Razorpay order tied to my booking, so that I can complete payment through the Razorpay Checkout SDK with the correct amount.

#### Acceptance Criteria

1. WHEN a `POST /api/payments/create-order` request is received with a valid `booking_id`, THE Payment_API SHALL create a Razorpay order whose `amount` (in paise) equals `round(Booking.totalPrice * 100)`.
2. THE Payment_API SHALL use the Booking's stored `totalPrice` as the Server_Authoritative_Amount; any `amount` field in the request body SHALL be used only as a sanity check.
3. IF the request body's `amount` differs from `Booking.totalPrice`, THEN THE Payment_API SHALL reject the request with HTTP 400 and SHALL log a structured `payments.create.amount_mismatch` event.
4. IF the booking is not found, THEN THE Payment_API SHALL return HTTP 404.
5. IF the booking has status `cancelled`, `paid`, or `confirmed`, THEN THE Payment_API SHALL return HTTP 409 (Conflict) and SHALL NOT create a new order.
6. IF an existing Payment row for the booking has status `AUTHORIZED` or `CAPTURED`, THEN THE Payment_API SHALL return HTTP 409 (Conflict) and SHALL NOT overwrite the row.
7. WHEN a prior Payment row for the booking has status `CREATED` or `FAILED`, THE Payment_API SHALL upsert the row with the new Razorpay order id and reset `razorpayPaymentId` and `razorpaySignature` to null.
8. THE Payment_API SHALL set the Razorpay `receipt` field to the Booking's `bookingRef`, truncated to at most 40 characters.
9. THE Payment_API SHALL include `booking_id` and `booking_ref` in the Razorpay order `notes` field.
10. THE Payment_API SHALL return a JSON response containing `orderId`, `amount` (paise), `currency`, `key` (Razorpay public key id), `bookingId`, `bookingRef`, and `receipt`.
11. THE Payment_API SHALL NOT include `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` in any response body, log line, or error message.
12. WHEN order creation is requested for an amount greater than 10,000,000 INR, THE Payment_API SHALL reject the request with HTTP 400.
13. THE Payment_API SHALL rate-limit order creation by client IP at 10 requests per hour and SHALL return HTTP 429 with a `Retry-After` header when the limit is exceeded.

### Requirement 3: Razorpay SDK Initialization and Credential Handling

**User Story:** As an operator deploying the application, I want the Razorpay SDK to fail loudly at request time when credentials are missing but never at build time, so that builds succeed in environments without secrets and runtime errors are easy to diagnose.

#### Acceptance Criteria

1. THE Razorpay_Client SHALL be lazily instantiated on first use, not at module load time.
2. IF `NEXT_PUBLIC_RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` is missing when the Razorpay_Client is first requested, THEN THE Razorpay_Client SHALL throw an error containing the names of the missing variables and SHALL NOT include the values of any other secrets.
3. THE Razorpay_Client SHALL be cached as a module-level singleton after successful first instantiation.
4. THE Server SHALL NOT export `RAZORPAY_KEY_SECRET` from any module.
5. THE Server SHALL expose `RAZORPAY_KEY_ID` (the public key id) only via a server-rendered response field named `key` from `/api/payments/create-order`.

### Requirement 4: Payment Signature Verification

**User Story:** As a security-conscious operator, I want every payment-success callback from the Razorpay Checkout SDK to be cryptographically verified, so that an attacker cannot forge a successful payment by calling our verify endpoint directly.

#### Acceptance Criteria

1. WHEN `POST /api/payments/verify` is called, THE Payment_API SHALL compute `expected = HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` and SHALL compare it to `razorpay_signature` using `crypto.timingSafeEqual`.
2. IF the signature does not match, THEN THE Payment_API SHALL return HTTP 400 with a generic `Payment verification failed` error and SHALL NOT update any Payment or Booking row.
3. THE Payment_API SHALL reject any `razorpay_order_id` not matching `^order_[A-Za-z0-9]+$` and any `razorpay_payment_id` not matching `^pay_[A-Za-z0-9]+$` before performing crypto work.
4. THE Payment_API SHALL reject any `razorpay_signature` whose length exceeds 256 characters or contains non-hexadecimal characters.
5. THE Payment_API SHALL log signature verification failures using the structured logger with the order id and payment id redacted (prefix + last 4 characters only).
6. THE Payment_API SHALL NOT log raw signature values, request bodies containing signatures, or the Razorpay key secret.
7. WHEN verification succeeds, THE Payment_API SHALL fetch the corresponding payment from Razorpay (`fetchRazorpayPayment`) and SHALL reject the request if the returned `order_id` differs from the supplied `razorpay_order_id`.
8. WHEN verification succeeds, THE Payment_API SHALL reject the request if the Razorpay-side `amount` (paise) differs from `round(Booking.totalPrice * 100)`.
9. IF the cross-check fetch to Razorpay fails for transient reasons (network, 5xx), THEN THE Payment_API SHALL still complete verification using the cryptographically valid signature and SHALL log a `payments.verify.fetch_failed` warning.
10. THE Payment_API SHALL rate-limit verification attempts by client IP at 5 requests per hour and SHALL return HTTP 429 with a `Retry-After` header when the limit is exceeded.

### Requirement 5: Payment Verification Idempotency and State Machine

**User Story:** As a customer who reloads the confirmation page or whose webhook arrives before the redirect, I want repeated verification calls to never double-charge me or double-fire confirmation emails, so that my booking ends up in exactly one consistent state.

#### Acceptance Criteria

1. THE Payment_State_Machine SHALL allow only the following transitions: `CREATED → AUTHORIZED`, `CREATED → CAPTURED`, `CREATED → FAILED`, `AUTHORIZED → CAPTURED`, `AUTHORIZED → FAILED`.
2. THE Payment_State_Machine SHALL treat `CAPTURED` and `FAILED` as terminal states with respect to forward transitions (refunds are modeled separately under Requirement 12).
3. WHEN `POST /api/payments/verify` is called with a `razorpay_payment_id` already recorded as `CAPTURED` for the same Booking, THE Payment_API SHALL return HTTP 200 with `already_captured = true` and SHALL NOT re-fire notifications.
4. WHEN `POST /api/payments/verify` is called with a `razorpay_order_id` that does not match the Payment row's `razorpayOrderId` for the supplied `booking_id`, THE Payment_API SHALL return HTTP 400.
5. THE Payment_API SHALL apply the Payment row update and Booking status transition in a single Prisma transaction.
6. WHEN, and only when, the verify call is the transition that moves the Payment from a non-terminal state into `CAPTURED`, THE Payment_API SHALL send the customer payment-confirmation email, the admin payment notification, and the owner WhatsApp notice exactly once.
7. WHEN the Payment transitions into `CAPTURED` and the Booking status is `pending`, THE Payment_API SHALL update the Booking status to `paid` within the same transaction.
8. THE Payment_API SHALL NOT change the Booking status to `confirmed` automatically; `confirmed` SHALL be reachable only by a separate admin action.
9. IF a notification send fails, THEN THE Payment_API SHALL log a structured error and SHALL NOT roll back the Payment or Booking state change.

### Requirement 6: Webhook Signature Verification

**User Story:** As a security-conscious operator, I want every Razorpay webhook to be verified against the raw request body, so that an attacker cannot inject fake payment events.

#### Acceptance Criteria

1. WHEN `POST /api/payments/webhook` is called, THE Payment_API SHALL read the request body as a raw UTF-8 string before any JSON parsing.
2. THE Payment_API SHALL compute `expected = HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` and SHALL compare it to the `x-razorpay-signature` header using `crypto.timingSafeEqual`.
3. IF the `RAZORPAY_WEBHOOK_SECRET` environment variable is empty, THEN THE Webhook_Endpoint SHALL return HTTP 401 for all incoming requests and SHALL log a `webhook.secret_missing` error.
4. IF the signature does not match or the header is absent, THEN THE Webhook_Endpoint SHALL return HTTP 401 and SHALL NOT process the event.
5. IF the request body exceeds 1,000,000 bytes, THEN THE Webhook_Endpoint SHALL return HTTP 413 without computing the signature.
6. THE Webhook_Endpoint SHALL set the response header `Cache-Control: no-store, max-age=0` on every response.
7. THE Webhook_Endpoint SHALL reject any request whose `Content-Type` is not `application/json` with HTTP 415.
8. THE Webhook_Endpoint SHALL NOT use `JSON.parse` then `JSON.stringify` to recompute the body for signature checks; the signed bytes are the original request body.

### Requirement 7: Webhook Payload Validation

**User Story:** As a developer maintaining the webhook handler, I want incoming webhook payloads validated against a typed schema, so that malformed events fail fast with a clear error rather than causing a TypeError deep in the handler.

#### Acceptance Criteria

1. THE Webhook_Endpoint SHALL validate the parsed JSON body against a Zod schema covering `event` (string), `account_id` (string, optional), `id` (Webhook_Event_Id, optional), and `payload.payment.entity` and `payload.order.entity` shapes.
2. IF the body fails JSON parsing, THEN THE Webhook_Endpoint SHALL return HTTP 400.
3. IF the body fails schema validation, THEN THE Webhook_Endpoint SHALL return HTTP 400 and SHALL log a `webhook.malformed_event` warning containing the validation error message and the event type if available.
4. WHEN validation succeeds for an event type the handler does not recognize, THE Webhook_Endpoint SHALL respond with HTTP 200 and `action = "ignored:unhandled"` and SHALL log an `info` event.

### Requirement 8: Webhook Event Handling and State Transitions

**User Story:** As an operator who relies on webhooks for the source of truth on payment status, I want each Razorpay event mapped deterministically to a Payment_State_Machine transition, so that the database always reflects the real state.

#### Acceptance Criteria

1. WHEN a `payment.authorized` event is received, THE Webhook_Endpoint SHALL transition the matching Payment from `CREATED` to `AUTHORIZED` and SHALL update `razorpayPaymentId` and `method` from the payload.
2. WHEN a `payment.captured` event is received, THE Webhook_Endpoint SHALL transition the matching Payment to `CAPTURED` and SHALL update the Booking from `pending` to `paid` if currently `pending`.
3. WHEN an `order.paid` event is received, THE Webhook_Endpoint SHALL behave identically to `payment.captured` for the matching order.
4. WHEN a `payment.failed` event is received, THE Webhook_Endpoint SHALL transition the matching Payment to `FAILED` only if the current status is `CREATED` or `AUTHORIZED`.
5. IF a webhook event would cause a transition disallowed by the Payment_State_Machine, THEN THE Webhook_Endpoint SHALL log a `webhook.illegal_transition` warning and SHALL return HTTP 200 with `action = "rejected:illegal_transition"` without modifying state.
6. WHEN the webhook references a `razorpay_order_id` not present in the database, THE Webhook_Endpoint SHALL return HTTP 200 with `action = "ignored:unknown_order"` and SHALL log a warning, so that Razorpay does not retry indefinitely.
7. THE Webhook_Endpoint SHALL apply Payment and Booking updates in a single Prisma transaction.
8. WHEN, and only when, the webhook is the transition that moves the Payment into `CAPTURED`, THE Webhook_Endpoint SHALL send the customer payment-confirmation email, the admin payment notification, and the owner WhatsApp notice exactly once.

### Requirement 9: Webhook Event-Level Idempotency

**User Story:** As an operator, I want Razorpay's automatic retries to never re-process the same event, so that confirmation emails go out exactly once and audit logs are not duplicated.

#### Acceptance Criteria

1. THE Payment_API SHALL persist a PaymentEvent row for each verified webhook delivery, keyed by Webhook_Event_Id.
2. WHEN a webhook arrives with a Webhook_Event_Id that already has a `processed` PaymentEvent row, THE Webhook_Endpoint SHALL return HTTP 200 with `action = "idempotent:duplicate_event"` and SHALL NOT re-apply the state transition or re-send notifications.
3. WHEN a Razorpay webhook payload does not include an `id`, THE Webhook_Endpoint SHALL fall back to status-based idempotency (current behavior) and SHALL log an `info` event noting the missing event id.
4. THE PaymentEvent insert SHALL occur in the same transaction as the Payment and Booking updates.
5. THE PaymentEvent table SHALL have a unique constraint on Webhook_Event_Id so that concurrent duplicate deliveries cannot both insert.

### Requirement 10: Payment Event Audit Log

**User Story:** As an operator triaging a support ticket, I want a complete record of every payment-related event with timestamps and actor, so that I can reconstruct what happened to a booking without grepping logs.

#### Acceptance Criteria

1. THE PaymentEvent model SHALL include the fields: `id` (cuid), `paymentId` (nullable foreign key), `bookingId` (nullable foreign key), `kind` (enum: `ORDER_CREATED`, `VERIFY_ATTEMPTED`, `VERIFY_SUCCEEDED`, `VERIFY_FAILED`, `WEBHOOK_RECEIVED`, `WEBHOOK_PROCESSED`, `WEBHOOK_REJECTED`, `REFUND_INITIATED`, `REFUND_PROCESSED`), `eventId` (Webhook_Event_Id, unique-when-present), `razorpayEventName` (string, optional), `payload` (Json, redacted), `processed` (boolean), `error` (text, optional), `requestId` (string), `createdAt`.
2. THE Payment_API SHALL write a `ORDER_CREATED` PaymentEvent on every successful order-create request.
3. THE Payment_API SHALL write a `VERIFY_ATTEMPTED` PaymentEvent on every verify request before signature checking and a `VERIFY_SUCCEEDED` or `VERIFY_FAILED` PaymentEvent after the result is known.
4. THE Webhook_Endpoint SHALL write a `WEBHOOK_RECEIVED` PaymentEvent before applying any state change and a `WEBHOOK_PROCESSED` or `WEBHOOK_REJECTED` PaymentEvent after the handler completes.
5. THE PaymentEvent `payload` SHALL be redacted: signatures, full Razorpay key id, and any field matching `secret` SHALL be removed before persistence.
6. THE PaymentEvent table SHALL be append-only; the application SHALL NOT update or delete PaymentEvent rows after insert.
7. THE PaymentEvent table SHALL have indexes on `paymentId`, `bookingId`, and `createdAt`.

### Requirement 11: Confirmation Page Truth Source

**User Story:** As a customer arriving at the confirmation page, I want the page to display the real status of my booking from the server, so that I am not misled by a manipulated URL.

#### Acceptance Criteria

1. WHEN the confirmation page loads with a `ref` query parameter, THE Confirmation_Page SHALL fetch the booking from `GET /api/bookings/by-ref/{ref}` and SHALL render fields from the response.
2. THE Bookings_API SHALL expose a public `GET /api/bookings/by-ref/{bookingRef}` endpoint returning only non-sensitive fields: `bookingRef`, `guestNameFirstName` (first name only), `itemName`, `itemType`, `status`, `totalPrice`, `currency`, `paymentMethod` (when status is `paid` or `confirmed`).
3. THE Bookings_API SHALL NOT return guest email, full guest name, phone number, or any Razorpay ids from the by-ref endpoint.
4. IF the booking is not found, THEN THE Bookings_API SHALL return HTTP 404 and THE Confirmation_Page SHALL render a "Booking not found" state.
5. WHEN the booking status is not `paid` or `confirmed`, THE Confirmation_Page SHALL display a pending-payment message and SHALL NOT show "Confirmed · paid".
6. THE Confirmation_Page SHALL NOT trust `total`, `name`, or `item` query parameters as authoritative values for status display.
7. THE Bookings_API SHALL rate-limit `GET /api/bookings/by-ref/{ref}` at 60 requests per IP per minute.

### Requirement 12: Refund Support

**User Story:** As an admin who needs to cancel a booking after payment, I want to issue a refund and have it tracked in the database, so that the booking and accounting state stay consistent.

#### Acceptance Criteria

1. THE Refund model SHALL include the fields: `id` (cuid), `paymentId` (foreign key to Payment), `razorpayRefundId` (string, unique), `amount` (Decimal), `currency` (string), `status` (enum: `INITIATED`, `PROCESSED`, `FAILED`), `reason` (string, optional), `createdAt`, `updatedAt`.
2. THE Admin_API SHALL expose `POST /api/admin/payments/{paymentId}/refund` which SHALL be authenticated as an admin and SHALL accept an optional `amount` (defaulting to the full captured amount) and `reason`.
3. THE Admin_API SHALL reject refund requests for Payments not in status `CAPTURED` with HTTP 409.
4. THE Admin_API SHALL reject refund requests where `amount` exceeds the Payment's captured amount minus the sum of prior `PROCESSED` refunds with HTTP 400.
5. WHEN a refund is initiated, THE Admin_API SHALL call Razorpay `payments.refund(paymentId, { amount: paise, notes })`, SHALL persist a Refund row with status `INITIATED`, and SHALL write a `REFUND_INITIATED` PaymentEvent.
6. WHEN a `refund.processed` webhook is received, THE Webhook_Endpoint SHALL update the matching Refund row to `PROCESSED`, SHALL write a `REFUND_PROCESSED` PaymentEvent, and SHALL send the customer a refund-processed email.
7. WHEN a `refund.failed` webhook is received, THE Webhook_Endpoint SHALL update the matching Refund row to `FAILED` and SHALL write a `WEBHOOK_PROCESSED` PaymentEvent with `error` populated.
8. THE Admin_API SHALL NOT change the Booking status as a side effect of a refund; cancellation of the Booking SHALL be a separate admin action.

### Requirement 13: Booking Status Transitions

**User Story:** As an operator, I want a clearly defined Booking_State_Machine, so that the meaning of `pending`, `paid`, `confirmed`, and `cancelled` is unambiguous and enforced.

#### Acceptance Criteria

1. THE Booking_State_Machine SHALL allow only the following transitions: `pending → paid` (automatic on payment capture), `paid → confirmed` (manual admin action), `pending → cancelled`, `paid → cancelled`, `confirmed → cancelled`.
2. THE Payment_API SHALL be the only writer permitted to perform the `pending → paid` transition.
3. THE Admin_API SHALL be the only writer permitted to perform the `paid → confirmed` transition.
4. IF any code path attempts a Booking transition outside the allowed set, THEN THE Booking_State_Machine SHALL throw a `ConflictError` and SHALL log a `booking.illegal_transition` warning.
5. THE Booking_State_Machine SHALL NOT allow transitions out of `cancelled`.

### Requirement 14: Amount and Currency Handling

**User Story:** As a customer, I want the amount I am charged to exactly match the price displayed at booking, so that I am never over- or under-charged due to rounding or currency confusion.

#### Acceptance Criteria

1. THE Payment_API SHALL store all amounts in `Decimal(10,2)` rupees and SHALL convert to paise only at the Razorpay boundary using `Math.round(amount * 100)`.
2. THE Payment_API SHALL use `INR` as the only supported currency in this spec.
3. IF a request body specifies a currency other than `INR`, THEN THE Payment_API SHALL reject the request with HTTP 400.
4. THE Payment_API SHALL reject any amount less than or equal to 0 with HTTP 400.
5. THE Payment_API SHALL reject any amount greater than 10,000,000 INR with HTTP 400.
6. WHEN comparing amounts during cross-check, THE Payment_API SHALL compare paise integers, not floating-point rupees.

### Requirement 15: Logging, Redaction, and Request Correlation

**User Story:** As an operator triaging an incident, I want every payment-related log line to be structured, correlatable by request id, and free of secrets, so that I can search Logflare/CloudWatch effectively.

#### Acceptance Criteria

1. THE Payment_API SHALL generate a unique `requestId` for every request and SHALL include it in every log line emitted during that request.
2. THE Payment_API SHALL include the `requestId` in the response header `x-request-id`.
3. THE Logger SHALL redact every Razorpay id (order, payment, refund) to the form `prefix_***last4` in log messages.
4. THE Logger SHALL NEVER emit `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, or any field whose name contains `secret`, `password`, or `signature`.
5. THE Payment_API SHALL log signature verification failures, amount mismatches, illegal transitions, and unknown orders at `warn` level.
6. THE Payment_API SHALL log successful captures and refunds at `info` level with the booking ref, redacted order id, and redacted payment id.

### Requirement 16: Concurrency Safety Between Verify and Webhook

**User Story:** As an operator, I want a webhook arriving at the same moment as a `/verify` call to never produce a double capture, double notification, or interleaved state, so that the database is always consistent.

#### Acceptance Criteria

1. THE Payment_API SHALL re-read the Payment row inside each Prisma transaction (`SELECT ... FOR UPDATE` or equivalent serializable read) before applying a state transition.
2. WHEN both `/api/payments/verify` and the webhook handler run concurrently for the same payment, THE Payment_API SHALL ensure exactly one of them performs the `→ CAPTURED` transition and exactly one of them sends notifications.
3. IF a transition is rejected because the Payment is already `CAPTURED`, THEN THE losing handler SHALL return its normal success response with `already_captured = true` (verify) or `action = "idempotent:already_captured"` (webhook).
4. THE Payment_API SHALL guarantee that the PaymentEvent audit row for the winning handler is written in the same transaction as the state change.

### Requirement 17: Test Coverage

**User Story:** As a developer modifying the payment code, I want an automated test suite that covers signature verification, the state machine, idempotency, and the webhook flow, so that regressions are caught before deployment.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for `verifyRazorpaySignature` covering: valid signature, signature with wrong order id, signature with wrong payment id, malformed inputs (non-hex, oversized, non-string), and timing-safe comparison.
2. THE Test_Suite SHALL include unit tests for `verifyRazorpayWebhookSignature` covering: valid signature, wrong secret, missing header, oversized body, and tampered body.
3. THE Test_Suite SHALL include property-based tests for the Payment_State_Machine asserting that every reachable state path through verify and webhook events ends in a state allowed by the transition table.
4. THE Test_Suite SHALL include property-based tests for verify-then-webhook and webhook-then-verify orderings asserting that the final Payment status, Booking status, and notification-send count are independent of arrival order.
5. THE Test_Suite SHALL include integration tests for `POST /api/payments/create-order`, `POST /api/payments/verify`, and `POST /api/payments/webhook` using a mocked Razorpay client and an in-memory or test database.
6. THE Test_Suite SHALL include a test that asserts a webhook with a duplicate Webhook_Event_Id results in zero additional state changes and zero additional notifications.
7. THE Test_Suite SHALL include a round-trip test that signs a payload with the webhook secret and verifies that `verifyRazorpayWebhookSignature` accepts it.

### Requirement 18: Migration and Backwards Compatibility

**User Story:** As an operator deploying this change to production, I want existing in-flight bookings and Razorpay webhook configurations to continue working through the migration, so that no customer payment is lost.

#### Acceptance Criteria

1. THE Migration SHALL add the `PaymentEvent` table and the `Refund` table without modifying existing `Payment` or `Booking` columns.
2. WHEN the application is deployed, existing `Payment` rows SHALL continue to function under the state machine without backfill.
3. THE Documentation SHALL include a step instructing the operator to update the Razorpay dashboard webhook URL from `/api/payment/webhook` to `/api/payments/webhook` before deploying the change that returns 410 from the legacy route.
4. WHILE the legacy route still exists during the transition window, THE Payment_API SHALL forward legacy webhook calls to the canonical handler so that no events are dropped.
5. WHEN the transition window ends, THE Migration SHALL remove the legacy route folder and its tests.
