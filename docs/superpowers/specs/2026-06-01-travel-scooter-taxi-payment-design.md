# Design Spec — Scooter Rental + Taxi in Travel, with aligned online payment

**Date:** 2026-06-01
**Project:** khan-bhai-website (Next.js 14 + Prisma/PostgreSQL + Razorpay)
**Status:** Approved scope, pending spec review

---

## 1. Goal

Add two new bookable travel-desk services — **scooter rental** and **taxi/cab** — to the
Travel section, each bookable online with full Razorpay payment (UPI / card / netbanking /
wallet). As part of the same work, **fix the currently-broken tour booking path** and make
**GST display consistent with the amount charged** across the whole site, so that the price
a customer sees is always the price they are charged and the price stored in the database.

## 2. Background — current state (audit findings)

The Razorpay engine is solid: server-authoritative pricing, HMAC signature verification,
Razorpay-side cross-check, webhook idempotency, payment/booking state machine, refunds, and
an append-only audit log. UPI/card/netbanking/wallet all work via the hosted checkout modal
(no method restriction). `/api/payment/*` routes are thin aliases of `/api/payments/*`.

Booking entry points and their status today:

| Page | Checkout link | Result |
|------|---------------|--------|
| Stay (`app/stay/page.tsx:107`) | `?type=room&id=deluxe/balcony/suite` | ✅ Works — ids + prices match `rooms` seed |
| Home (`app/page.tsx:343`) | `?type=room&id=suite` | ✅ Works |
| Restaurant (`app/restaurant/page.tsx:192`) | `?id=restaurant` (flat ₹200/cover) | ⚠️ Works, but GST display bug |
| Travel (`app/travel/page.tsx:116`) | `?type=tour&id=nainital/corbett/kedarnath` | ❌ Broken |

**Bugs to fix in this work:**

1. **Tour bookings fail completely.** Travel page sends tour id `nainital`; the seed DB id is
   `tour_nainital_001`. `createBooking` (`lib/services/bookingService.ts:206`) looks it up,
   finds nothing → throws `NotFoundError("Selected tour not found")`. Compounding: the seed ids
   contain underscores, which the `tour_id` regex `^[a-z0-9-]+$` in
   `lib/schemas/bookingSchema.ts` would reject anyway.
2. **Tour price mismatch.** Travel page shows Nainital ₹6,500 / 3-day; seed says ₹4,500 / 2-day.
   (Corbett ₹8,000 and Kedarnath ₹12,000 happen to match.)
3. **GST display ≠ amount charged (tours + restaurant tables).** `app/checkout/page.tsx:94`
   computes `total = Math.round(rawSubtotal * 1.18)` for non-room types, but the server stores
   and charges the base price with no GST added (`bookingService.createBooking`:
   restaurant `200 * guests`, tour `tour.price * guests`). So a table guest sees "Pay ₹472" but
   is charged ₹400, and the confirmation page shows ₹472 while the DB records ₹400. Rooms are
   consistent (catalog price treated as GST-inclusive total).

## 3. Architecture decision

**Chosen:** Two new first-class booking types, `scooter` and `taxi`, backed by a single shared
catalog module `lib/constants/travel.ts` that is imported by **both** the client (travel page +
checkout, for display) **and** the server (`bookingService`, for the authoritative price). One
constant, read by both sides → the catalog cannot drift. This is the structural fix for the
class of bug that broke tours.

**Rejected:** Reusing the existing `tour` type for scooter/taxi. The `tour` path requires a real
`Tour` DB row and uses per-person pricing (`price × guests`), which fits neither per-day scooter
pricing nor fixed-route taxi pricing. It would force fake catalog rows and special-casing.

**Precedent:** The `restaurant` type already prices from a server-side constant (flat `200 ×
guests`) with no catalog table. Scooter/taxi follow the same lighter pattern — no new DB tables.

## 4. Pricing model (confirmed with user)

- **Scooter:** `dailyRate × days × quantity`. Priced per day; user picks a model, a rental start
  date, number of days, and quantity of scooters.
- **Taxi:** `routePrice × cars`. Fixed price per pre-defined route; user picks a route, travel
  date, pickup time, and number of cars (defaults to 1).

All catalog prices (rooms, tours, tables, scooter, taxi) are treated as the **GST-inclusive
final amount** — the number charged. GST is shown as an inclusive split on the summary, matching
how rooms already behave. (See §8.)

## 5. Data model changes (Prisma) — `prisma/schema.prisma`

```prisma
enum BookingType {
  room
  tour
  restaurant
  scooter   // NEW
  taxi      // NEW
}

model Booking {
  // ... existing fields ...
  vehicleType  String?   // NEW: scooter model id OR taxi route id (e.g. "activa", "route-nainital")
}
```

- 2 additive enum values + 1 nullable column. Additive and backwards-compatible.
- Field reuse (no extra columns): `checkInDate`/`checkOutDate` = scooter rental start/end;
  `checkInDate` + `timeSlot` = taxi travel date + pickup time; `numberOfGuests` = quantity
  (scooters / cars).

**Manual migration step (user runs):** `npx prisma migrate dev` then `npx prisma generate`.

## 6. Shared catalog — new file `lib/constants/travel.ts`

Pure module, **no Prisma / no server-only imports** so it is safe to import from client
components. Single source of truth for scooter/taxi.

```ts
export interface ScooterModel { id: string; name: string; dailyRate: number; img: string; }
export interface TaxiRoute    { id: string; name: string; price: number;     img: string; }

export const SCOOTER_MODELS: ScooterModel[] = [
  { id: "activa",  name: "Honda Activa 6G", dailyRate: 500, img: "<image>" },
  { id: "jupiter", name: "TVS Jupiter",     dailyRate: 450, img: "<image>" },
];

export const TAXI_ROUTES: TaxiRoute[] = [
  { id: "route-nainital", name: "Haldwani → Nainital",       price: 2500, img: "<image>" },
  { id: "route-corbett",  name: "Haldwani → Jim Corbett",    price: 3500, img: "<image>" },
  { id: "airport-pickup", name: "Airport / Station Pickup",  price: 1200, img: "<image>" },
  { id: "fullday-hire",   name: "Full-day Cab (8h / 80km)",  price: 3000, img: "<image>" },
];

export const getScooter = (id: string) => SCOOTER_MODELS.find((s) => s.id === id);
export const getTaxiRoute = (id: string) => TAXI_ROUTES.find((r) => r.id === id);
```

Prices are agreed defaults; trivially editable in this one file. Images reuse existing
`/public` assets or suitable Unsplash placeholders consistent with the current pages.

## 7. Component & service changes

### 7.1 Travel page — `app/travel/page.tsx`
- Keep the existing Tours section.
- Add two new sections below it: **"Scooter Rentals"** (from `SCOOTER_MODELS`) and
  **"Taxi & Cabs"** (from `TAXI_ROUTES`), styled with the existing card primitives.
- Card price labels: `₹500 / day`, `₹2,500 / trip`.
- Book buttons link to `/checkout?type=scooter&id=<modelId>` and
  `/checkout?type=taxi&id=<routeId>`.

### 7.2 Checkout — `app/checkout/page.tsx`
- Extend the item `type` union and catalog with `scooter` and `taxi`, built from the shared
  module (so any catalog addition appears automatically).
- The page already derives `item` from `id`; extend the lookup to include scooter models and
  taxi routes by id.
- Per-type form fields:
  - **scooter:** rental start date, number of **days** (≥1), **quantity** (≥1). Compute
    `total = dailyRate × days × qty`. Sends `check_in = start`, `check_out = start + days`,
    `guests = qty`, `vehicle_type = modelId`.
  - **taxi:** travel **date**, **pickup time** (reuse the time-slot select pattern), **cars**
    (default 1). Compute `total = routePrice × cars`. Sends `check_in = date`,
    `timeSlot = pickup time`, `guests = cars`, `vehicle_type = routeId`.
- Summary card labels adapt per type ("Per day" / "Days"; "Per trip" / "Cars").
- Downstream payment flow (create-order → Razorpay modal → verify → confirmation) is
  **unchanged**, so UPI/card/etc. work identically to rooms.

### 7.3 Booking schema — `lib/schemas/bookingSchema.ts`
- Add `scooter`, `taxi` to the `booking_type` enum (and to `listBookingsQuerySchema.type`).
- Add `vehicle_type: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/).optional()`.
- `superRefine`:
  - `scooter`: require `vehicle_type`, `check_in`, `check_out` (`check_out > check_in`); cap days
    at a sane max (e.g. 30).
  - `taxi`: require `vehicle_type`, `check_in`, `timeSlot`.

### 7.4 Booking service — `lib/services/bookingService.ts`
- Add `scooter` and `taxi` branches to `createBooking`:
  - **scooter:** `const m = getScooter(input.vehicle_type)`; 404 if unknown; `days =
    calculateNights(check_in, check_out)` (≥1); `totalPrice = m.dailyRate * days *
    input.guests`. Persist `vehicleType`, dates, `numberOfGuests`.
  - **taxi:** `const r = getTaxiRoute(input.vehicle_type)`; 404 if unknown; `totalPrice =
    r.price * input.guests`. Persist `vehicleType`, `checkInDate`, `timeSlot`,
    `numberOfGuests`.
- The client `amount` remains a sanity check only; `createOrderForBooking` already treats the
  DB `totalPrice` as authoritative (`lib/services/paymentService.ts:98`). No payment-service
  change needed.

### 7.5 Tour fix — `prisma/seed.ts`
- Change tour ids to `nainital`, `corbett`, `kedarnath` (match the page, pass the regex).
- Reconcile price/duration to the page's displayed values: Nainital ₹6,500 / 3-day, Corbett
  ₹8,000 / 3-day, Kedarnath ₹12,000 / 4-day.
- Update the sample tour booking (`KB-SEED-CONF-003`) and its `totalPrice` to reference the new
  id and price (4 guests × ₹6,500 = ₹26,000 — adjust accordingly).
- Remove/replace stale `tour_*_001` rows so re-seeding is clean (`onDelete: SetNull` keeps any
  existing bookings safe). **Manual step (user runs):** `npm run db:seed`.

### 7.6 GST consistency — `app/checkout/page.tsx`
- Treat all catalog prices as the GST-inclusive final for every type. Replace the
  `type === "room" ? rawSubtotal : Math.round(rawSubtotal * 1.18)` branch so **`total =
  rawSubtotal` for all types**, and show GST as the inclusive split (`subtotal = total / 1.18`,
  `gst = total − subtotal`) used by rooms today.
- Net effect: button amount = Razorpay charge = DB `totalPrice` = confirmation total,
  everywhere. No server change required (server already charges the base/inclusive amount).

### 7.7 Display touch points
- `lib/services/publicBooking.ts` → `itemNameFor`: for `scooter`/`taxi`, resolve the name from
  `vehicleType` via the shared module (`getScooter`/`getTaxiRoute`); fall back to a generic
  label. Add `vehicleType` + `type` to `PublicBookingInput`. Keeps confirmation page + emails
  correct. (Module is pure, so importing it keeps `publicBooking` DB-free / testable.)
- `app/api/bookings/by-ref/[ref]/route.ts`: already passes the full booking to `toPublicBooking`;
  ensure `vehicleType` is selected (it's a scalar column, included by default).
- `app/admin/page.tsx` → `itemLabel` (≈line 96) and date column: add `scooter`/`taxi` cases to
  show the model/route name and the relevant date.
- Email templates (`lib/services/emailService.ts`) print `booking.type` generically — no change
  required (they will show "scooter"/"taxi").

## 8. Data flow (scooter example)

1. Travel page → `/checkout?type=scooter&id=activa`.
2. Checkout looks up `activa` in `SCOOTER_MODELS`, renders scooter form, computes display total
   `500 × days × qty`.
3. `POST /api/bookings` `{ booking_type:"scooter", vehicle_type:"activa", check_in, check_out,
   guests:qty }` → `createBooking` recomputes `totalPrice` server-side from the shared module
   (authoritative) → returns `booking_id`, `booking_ref`, `amount`.
4. `POST /api/payments/create-order` (amount = sanity check) → Razorpay order.
5. Razorpay modal (UPI/card/etc.) → `POST /api/payments/verify` → booking `paid`.
6. `/confirmation?ref=…` reads `by-ref` → shows model name + the exact amount charged.

## 9. Testing (mirror existing `tests/` style + Vitest)

- `bookingService` scooter price = `rate × days × qty`; taxi price = `routePrice × cars`.
- Unknown `vehicle_type` → `NotFoundError`.
- `bookingSchema` superRefine: scooter requires dates + vehicle_type; taxi requires date +
  timeSlot + vehicle_type.
- `toPublicBooking` returns correct `itemName` for scooter/taxi from `vehicleType`.
- (Regression) tour booking with id `nainital` now resolves and prices at the seed value.

## 10. Out of scope

- No admin CRUD UI for managing scooter models / taxi routes (catalog is code-managed in
  `lib/constants/travel.ts`).
- No per-km taxi pricing (fixed routes only, per the chosen pricing model).
- No new DB tables for scooter/taxi catalog.
- No changes to the payment engine, refund, or webhook logic.

## 11. Manual steps the user performs (Claude only prepares code)

1. `npx prisma migrate dev` (+ `npx prisma generate`) — applies enum values + `vehicleType`.
2. `npm run db:seed` — fixes tour ids/prices.
3. `npm run test` to confirm green, then build/deploy via the usual Vercel/VPS flow.

## 12. Risks / notes

- **Migration touches an enum** — additive `ALTER TYPE … ADD VALUE`, safe and non-breaking.
- **Re-seed changes tour ids** — fine pre-launch; `onDelete: SetNull` protects any existing
  bookings. If real tour bookings already exist in production, migrate their `tourId` instead of
  deleting (note for the user; unlikely pre-launch).
- **Shared module on the client** — must stay free of server-only imports to avoid bundling
  Prisma into the client.
