# Khan Bhai S. — Technical Specifications & Implementation Guide

---

## API Endpoints Specification

### Payment Endpoints

#### POST /api/payment/create-order
**Purpose**: Create a Razorpay order before payment

**Request Body**:
```json
{
  "amount": 250000,
  "currency": "INR",
  "receipt": "booking-uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "9876543210",
  "booking_type": "room"
}
```

**Response (Success)**:
```json
{
  "order_id": "order_2Ey7YI0JF7YUS3",
  "amount": 250000,
  "currency": "INR",
  "receipt": "booking-uuid"
}
```

**Response (Error)**:
```json
{
  "error": "Amount must be greater than 0",
  "code": "VALIDATION_ERROR"
}
```

**Status Codes**:
- 200: Order created successfully
- 400: Validation error
- 500: Server error (Razorpay API down)

**Security**: Rate limited to 10 requests per IP per hour

---

#### POST /api/payment/verify
**Purpose**: Verify Razorpay payment signature and confirm booking

**Request Body**:
```json
{
  "razorpay_order_id": "order_2Ey7YI0JF7YUS3",
  "razorpay_payment_id": "pay_2Ey7YI0JF7YUS3",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
  "booking_id": "uuid-here"
}
```

**Verification Logic**:
```
computed_hash = HMAC-SHA256(
  razorpay_order_id + "|" + razorpay_payment_id,
  RAZORPAY_KEY_SECRET
)

if (computed_hash !== razorpay_signature) {
  return { error: "Payment verification failed" }
}
```

**Response (Success)**:
```json
{
  "success": true,
  "booking_id": "uuid-here",
  "message": "Payment verified and booking confirmed"
}
```

**Response (Fraud Detected)**:
```json
{
  "success": false,
  "error": "Payment verification failed - possible fraud attempt",
  "code": "SIGNATURE_MISMATCH"
}
```

**Side Effects** (on success):
1. Update booking status: 'pending' → 'paid'
2. Save payment record to DB
3. Send email to customer
4. Send email to owner
5. Send WhatsApp notification to owner
6. Redirect to /confirmation page

---

### Booking Endpoints

#### POST /api/bookings
**Purpose**: Create a new booking

**Request Body**:
```json
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "9876543210",
  "booking_type": "room",
  "check_in": "2026-05-15",
  "check_out": "2026-05-17",
  "guests": 2,
  "room_id": "uuid-or-null",
  "tour_id": "uuid-or-null",
  "special_requests": "Late checkout needed"
}
```

**Response (Success)**:
```json
{
  "id": "booking-uuid",
  "booking_type": "room",
  "customer_name": "John Doe",
  "status": "pending",
  "amount": 250000,
  "created_at": "2026-05-01T10:00:00Z"
}
```

**Validation (Zod Schema)**:
- customer_name: required, string, min 3 chars
- customer_email: required, valid email format
- customer_phone: required, 10 digit Indian number
- check_in: required, date, must be today or future
- check_out: required, date, must be after check_in
- guests: required, integer, min 1
- booking_type: enum ['room', 'tour']

---

#### GET /api/rooms
**Purpose**: Fetch all available rooms

**Query Parameters**:
- `available` (optional): boolean - filter by availability
- `max_guests` (optional): integer - filter by capacity

**Response**:
```json
{
  "rooms": [
    {
      "id": "room-uuid-1",
      "name": "Standard Room",
      "description": "Cozy room with basic amenities",
      "price_per_night": 120000,
      "capacity": 2,
      "amenities": ["WiFi", "AC", "TV"],
      "images": ["https://...", "https://..."],
      "available": true
    }
  ],
  "count": 4
}
```

**Status Codes**:
- 200: Success
- 500: Database error

---

#### GET /api/tours
**Purpose**: Fetch all available tours

**Response**:
```json
{
  "tours": [
    {
      "id": "tour-uuid-1",
      "title": "Nainital Weekend",
      "destination": "Nainital",
      "duration_days": 2,
      "price_per_person": 450000,
      "includes": ["Accommodation", "Meals", "Guide"],
      "itinerary": [
        { "day": 1, "activities": "..." },
        { "day": 2, "activities": "..." }
      ],
      "images": ["https://...", "https://..."],
      "available": true
    }
  ],
  "count": 4
}
```

---

#### GET /api/bookings/:id
**Purpose**: Fetch booking details (public)

**Route**: `/api/bookings/booking-uuid-here`

**Response**:
```json
{
  "id": "booking-uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "booking_type": "room",
  "check_in": "2026-05-15",
  "check_out": "2026-05-17",
  "guests": 2,
  "amount": 250000,
  "status": "paid",
  "created_at": "2026-05-01T10:00:00Z"
}
```

---

### Admin Endpoints (Protected)

#### POST /api/admin/login
**Purpose**: Admin authentication

**Request Body**:
```json
{
  "email": "owner@khanbhais.com",
  "password": "secure-password-here"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "user": {
    "id": "admin-uuid",
    "email": "owner@khanbhais.com",
    "name": "Owner Name",
    "role": "superadmin"
  },
  "token": "jwt-token-here"
}
```

**Security**:
- Password compared with bcrypt hash
- JWT stored in HttpOnly cookie
- Cookie expires in 24 hours
- All /admin/* routes protected by middleware

---

#### GET /api/admin/bookings
**Purpose**: Fetch all bookings (admin only)

**Headers Required**:
```
Authorization: Bearer {JWT_TOKEN}
```

**Query Parameters**:
- `status` (optional): 'pending' | 'paid' | 'cancelled' | 'confirmed'
- `limit` (optional): default 20
- `offset` (optional): default 0

**Response**:
```json
{
  "bookings": [
    {
      "id": "uuid",
      "customer_name": "John Doe",
      "customer_phone": "9876543210",
      "booking_type": "room",
      "check_in": "2026-05-15",
      "amount": 250000,
      "status": "paid",
      "created_at": "2026-05-01T10:00:00Z"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

#### PATCH /api/admin/bookings/:id
**Purpose**: Update booking status

**Request Body**:
```json
{
  "status": "confirmed"
}
```

**Allowed Status Transitions**:
- 'pending' → 'confirmed' | 'cancelled'
- 'paid' → 'confirmed' | 'cancelled'

**Response**:
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "status": "confirmed",
    "updated_at": "2026-05-01T10:30:00Z"
  }
}
```

---

#### GET /api/admin/inquiries
**Purpose**: Fetch contact form inquiries

**Response**:
```json
{
  "inquiries": [
    {
      "id": "inquiry-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "message": "I'm interested in booking...",
      "type": "room",
      "read": false,
      "created_at": "2026-05-01T10:00:00Z"
    }
  ],
  "unread_count": 3
}
```

---

## Email Templates

### Template 1: Owner Booking Alert

**Subject**: New Booking: [Room/Tour] from [Name]

**Body**:
```
Hi Owner,

You have a new booking!

Booking Details:
- Booking ID: [BOOKING_ID]
- Type: [Room/Tour Name]
- Customer: [CUSTOMER_NAME]
- Phone: [CUSTOMER_PHONE]
- Check-in: [CHECK_IN_DATE]
- Check-out: [CHECK_OUT_DATE]
- Number of Guests: [GUESTS]
- Total Amount: ₹[AMOUNT]

Payment Status: [STATUS]

Click here to view in admin panel: [DASHBOARD_LINK]

Reply to customer:
WhatsApp: [WHATSAPP_LINK]
Email: [CUSTOMER_EMAIL]

— Khan Bhai S. Automated System
```

---

### Template 2: Customer Confirmation Email

**Subject**: Booking Confirmed! Your Reservation at Khan Bhai S.

**Body**:
```
Hi [CUSTOMER_NAME],

Thank you for booking with us! Your reservation is confirmed.

Booking Confirmation:
- Booking ID: [BOOKING_ID]
- Type: [Room/Tour Name]
- Check-in: [CHECK_IN_DATE]
- Check-out: [CHECK_OUT_DATE]
- Number of Guests: [GUESTS]
- Total Paid: ₹[AMOUNT]

You will receive further details 24 hours before your stay.

Need to contact us?
- WhatsApp: [OWNER_WHATSAPP_LINK]
- Phone: [OWNER_PHONE]
- Email: [OWNER_EMAIL]

Confirmation PDF attached for your records.

Looking forward to hosting you!

— Team Khan Bhai S.
```

---

## WhatsApp Integration

### WhatsApp Click-to-Chat Links

**Format**: `https://wa.me/[PHONE_NUMBER]?text=[MESSAGE]`

**Example**:
```
https://wa.me/919876543210?text=Hi%20Khan%20Bhai%2C%20I%20have%20a%20question%20about%20booking
```

**Used On**:
1. **Floating Button**: On all pages
2. **Restaurant Page**: "Reserve a Table" button
3. **Confirmation Page**: "Chat with Owner" button
4. **Contact Page**: Direct messaging option

**Message Format** (Auto-filled):
```
Hi Khan Bhai,

I'm interested in booking [ROOM/TOUR NAME] from [CHECK_IN] to [CHECK_OUT] for [GUESTS] guests.

Booking ID: [BOOKING_ID]
Amount: ₹[AMOUNT]

Please confirm availability.

Thanks
[CUSTOMER_NAME]
```

---

## Database Relationships

### Booking → Payment
```
bookings.id ← payments.booking_id
bookings.payment_id ← payments.razorpay_payment_id
```

### Booking → Room
```
bookings.room_id → rooms.id
(null if booking is for tour)
```

### Booking → Tour
```
bookings.tour_id → tours.id
(null if booking is for room)
```

### Admin Roles
```
admins.role = 'superadmin' | 'staff'
- superadmin: full access (login, view, edit, delete)
- staff: read-only access (view bookings, inquiries only)
```

---

## Authentication Flow

### Login Process

```
1. User visits /admin/login
2. Enters email + password
3. NextAuth validates against admins table
4. Password verified with bcrypt.compare()
5. If valid: Generate JWT token
6. Store JWT in HttpOnly cookie
7. Redirect to /admin/dashboard
```

### Protected Routes

```
middleware.ts intercepts all /admin/* requests:
1. Check for JWT in HttpOnly cookie
2. Verify signature with NEXTAUTH_SECRET
3. If invalid/expired: Redirect to /admin/login
4. If valid: Allow request through
5. Pass user data to request context
```

### Logout

```
1. Clear HttpOnly cookie
2. Redirect to /admin/login
3. All subsequent /admin/* requests rejected
```

---

## Payment Security Checklist

### Before Going Live

- [ ] Razorpay KYC completed (to unlock live mode)
- [ ] Live API keys (rzp_live_xxxxx) generated
- [ ] Live mode enabled in .env
- [ ] HTTPS enforced everywhere (Vercel auto-SSL)
- [ ] Webhook secret configured in Razorpay dashboard
- [ ] Rate limiting enabled (10 requests/IP/hour)
- [ ] Error logging configured (no sensitive data in logs)
- [ ] Database backups scheduled (Supabase auto-backups)
- [ ] Admin password policy enforced (min 12 chars, special chars)
- [ ] Email SMTP credentials secured in .env
- [ ] All .env secrets never committed to Git

### Test Mode Safety

- [ ] Use test payment method: 4111 1111 1111 1111 (Razorpay test card)
- [ ] Do NOT use real card details in test mode
- [ ] Verify HMAC signature validation working
- [ ] Test webhook delivery (Razorpay Dashboard → Webhooks)
- [ ] Test email notifications reaching owner

---

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# NextAuth
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars
NEXTAUTH_URL=https://khanbhais.com (or vercel.app domain)

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx (or rzp_live_xxxxx)
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Email (Nodemailer)
GMAIL_USER=owner@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx (16-char app password)

# Owner Contact
OWNER_PHONE=+919876543210
OWNER_EMAIL=owner@khanbhais.com
OWNER_WHATSAPP=919876543210 (without +)

# Application
NEXT_PUBLIC_APP_URL=https://khanbhais.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXX
```

---

## File Structure

```
khan-bhai-website/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   ├── restaurant/
│   │   └── page.tsx
│   ├── stay/
│   │   └── page.tsx
│   ├── travel/
│   │   └── page.tsx
│   ├── checkout/
│   │   └── page.tsx
│   ├── confirmation/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── bookings/
│   │   │   └── page.tsx
│   │   ├── inquiries/
│   │   │   └── page.tsx
│   │   └── layout.tsx             # Admin layout with nav
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts           # NextAuth config
│       ├── payment/
│       │   ├── create-order/
│       │   │   └── route.ts
│       │   └── verify/
│       │       └── route.ts
│       ├── bookings/
│       │   ├── route.ts           # GET, POST
│       │   └── [id]/
│       │       └── route.ts       # GET, PATCH
│       ├── rooms/
│       │   └── route.ts           # GET
│       ├── tours/
│       │   └── route.ts           # GET
│       └── admin/
│           ├── bookings/
│           │   ├── route.ts       # GET (protected)
│           │   └── [id]/
│           │       └── route.ts   # PATCH (protected)
│           └── inquiries/
│               └── route.ts       # GET (protected)
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── RoomCard.tsx
│   ├── TourCard.tsx
│   ├── BookingForm.tsx
│   └── AdminDashboard.tsx
├── lib/
│   ├── db.ts                      # Prisma client
│   ├── auth.ts                    # Auth helpers
│   ├── payment.ts                 # Razorpay helpers
│   ├── email.ts                   # Nodemailer config
│   └── validation.ts              # Zod schemas
├── styles/
│   └── globals.css                # Color tokens, fonts
├── public/
│   ├── logo.svg
│   └── images/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── seed.ts                    # Initial data
├── .env.local                     # Environment variables (never commit)
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Prisma Schema (Abbreviated)

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Booking {
  id            String    @id @default(uuid())
  booking_type  String    // 'room' or 'tour'
  customer_name String
  customer_phone String
  customer_email String
  check_in      DateTime
  check_out     DateTime
  guests        Int
  amount        Decimal
  status        String    // 'pending', 'paid', 'cancelled', 'confirmed'
  payment_id    String?
  room_id       String?
  tour_id       String?
  created_at    DateTime  @default(now())

  payment       Payment?  @relation(fields: [payment_id], references: [razorpay_payment_id])
  room          Room?     @relation(fields: [room_id], references: [id])
  tour          Tour?     @relation(fields: [tour_id], references: [id])
}

model Payment {
  id                    String   @id @default(uuid())
  booking_id           String
  razorpay_order_id    String
  razorpay_payment_id  String
  razorpay_signature   String
  amount               Decimal
  currency             String   @default("INR")
  status               String   // 'created', 'authorized', 'captured', 'failed'
  method               String   // 'upi', 'card', 'netbanking', 'wallet'
  created_at           DateTime @default(now())

  booking Booking?
}

model Room {
  id               String   @id @default(uuid())
  name             String
  description      String
  price_per_night  Decimal
  capacity         Int
  amenities        String[] // JSON array
  images           String[] // JSON array of URLs
  available        Boolean  @default(true)

  bookings Booking[]
}

model Tour {
  id               String   @id @default(uuid())
  title            String
  destination      String
  duration_days    Int
  price_per_person Decimal
  includes         String[] // JSON array
  images           String[] // JSON array of URLs
  itinerary        Json     // JSON day-by-day plan
  available        Boolean  @default(true)

  bookings Booking[]
}

model Admin {
  id          String   @id @default(uuid())
  email       String   @unique
  password_hash String
  name        String
  role        String   // 'superadmin' or 'staff'
  last_login  DateTime?

  @@index([email])
}

model ContactInquiry {
  id        String   @id @default(uuid())
  name      String
  email     String
  phone     String
  message   String
  type      String   // 'room', 'tour', 'general'
  read      Boolean  @default(false)
  created_at DateTime @default(now())
}
```

---

## Performance Optimization

### Image Optimization
- Use Next.js Image component with priority="low"
- Auto-convert to WebP
- Lazy load below-fold images
- Serve from Unsplash CDN (already optimized)

### Database Queries
- Use Prisma select() to fetch only needed fields
- Implement pagination (limit + offset)
- Index on: bookings.created_at, bookings.status, admins.email

### Frontend Performance
- Split code: dynamic imports for modals
- Remove unused Tailwind classes: purge: enabled
- Compress CSS with Tailwind minification
- Compress images: ~100KB per image max

### Caching
- Set ISR (Incremental Static Regeneration) revalidate: 3600s for /stay, /travel
- Cache API responses: 5 minutes for rooms, tours
- Browser cache: 30 days for images, 7 days for pages

---

## Testing Checklist

### Unit Tests
- [ ] Zod validation schemas
- [ ] HMAC signature verification
- [ ] Email template rendering
- [ ] WhatsApp link generation

### Integration Tests
- [ ] Payment flow (create order → verify signature)
- [ ] Booking creation + email trigger
- [ ] Admin login + session validation
- [ ] API authentication middleware

### E2E Tests
- [ ] User visits /stay → selects room → checkout → payment → confirmation
- [ ] Admin logs in → views bookings → updates status
- [ ] Contact form submission

### Manual Testing
- [ ] Test on iPhone 12, iPhone SE
- [ ] Test on Android (Samsung Galaxy, Pixel)
- [ ] Test on iPad and tablet
- [ ] Test on desktop (Chrome, Safari, Firefox)
- [ ] Mobile hamburger menu
- [ ] Form submission on slow 3G network
- [ ] Payment in test mode (use Razorpay test card)

---

## Deployment Checklist

### Before Deploying to Production

- [ ] All 21 client confirmations received
- [ ] All environment variables set in Vercel dashboard
- [ ] Database migrations run on Supabase
- [ ] Seed data loaded (test admin account)
- [ ] Razorpay test keys verified working
- [ ] Email SMTP credentials verified
- [ ] SEO meta tags added
- [ ] OG images generated
- [ ] Mobile testing complete
- [ ] Performance audit (Lighthouse 80+)
- [ ] Security headers configured
- [ ] Error logging configured
- [ ] Backup strategy defined
- [ ] Monitoring alerts set up

### Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Test payment flow with real payment
- [ ] Verify emails sending successfully
- [ ] Check analytics integration
- [ ] Load test with 100+ concurrent users
- [ ] 7-day stability check before live payments

---

## Future Enhancements (V2+)

- [ ] Restaurant menu management + online ordering
- [ ] Real-time availability calendar
- [ ] Staff roles + booking assignment
- [ ] Advanced analytics dashboard
- [ ] SMS notifications (WhatsApp API v2)
- [ ] Video tours for rooms
- [ ] AR room previews
- [ ] Multi-language support
- [ ] Payment subscriptions
- [ ] Loyalty program
- [ ] Automated cancellation refunds
- [ ] Dynamic pricing

---

**Document Version**: 1.0
**Last Updated**: 2026-05-01
**Status**: Ready for Development
