# Khan Bhai S. — Technical Architecture Document

**Project**: Khan Bhai S. - Luxury Hotel, Restaurant & Travel Experience
**Document Type**: Technical Architecture Design
**Version**: 1.0
**Date**: May 1, 2026
**Status**: Implementation Ready
**Companion Document**: `SYSTEM_DESIGN.md` (describes *what* to build; this document describes *how*)

---

## Table of Contents

1. [Layered Architecture Overview](#1-layered-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Architecture](#4-database-architecture)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Payment Processing Architecture](#6-payment-processing-architecture)
7. [Email & Notification Architecture](#7-email--notification-architecture)
8. [Caching Strategy](#8-caching-strategy)
9. [Error Handling & Logging](#9-error-handling--logging)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Security Architecture](#11-security-architecture)
12. [Scalability Considerations](#12-scalability-considerations)

---

## 1. Layered Architecture Overview

The system is structured as a classic 5-layer architecture, all within a single Next.js monorepo deployed to Vercel.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                                │
│                     HTML + JS + CSS (React)                              │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP/HTTPS
┌───────────────────────────────▼──────────────────────────────────────────┐
│                     PRESENTATION LAYER                                   │
│                                                                          │
│   Next.js App Router Pages     React Components      Framer Motion       │
│   /app/**/*.tsx                /components/**        animations          │
│   (Server + Client Components) (atomic, feature)     Tailwind CSS        │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ fetch() / server actions
┌───────────────────────────────▼──────────────────────────────────────────┐
│                          API LAYER                                        │
│                                                                          │
│   Next.js Route Handlers       Middleware Stack                          │
│   /app/api/**/*.ts             auth → validate → handler → respond       │
│   REST-style endpoints         NextAuth session checks                   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ function calls
┌───────────────────────────────▼──────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                                 │
│                                                                          │
│   /lib/services/               /lib/validators/        /lib/utils/       │
│   bookingService.ts            bookingSchema.ts         formatDate.ts    │
│   paymentService.ts            paymentSchema.ts         generateId.ts    │
│   emailService.ts              inquirySchema.ts         currency.ts      │
│   adminService.ts                                                        │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ Prisma Client calls
┌───────────────────────────────▼──────────────────────────────────────────┐
│                      DATA ACCESS LAYER                                   │
│                                                                          │
│   /lib/prisma.ts (singleton)   /prisma/schema.prisma                    │
│   Prisma ORM queries           Type-safe DB client                       │
│   Connection pool via Supabase Prisma Migrate                            │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ TCP/SSL (connection pooler)
┌───────────────────────────────▼──────────────────────────────────────────┐
│                        DATABASE LAYER                                    │
│                                                                          │
│   PostgreSQL 15 on Supabase    6 tables with FK constraints              │
│   Row Level Security (RLS)     pgbouncer connection pooling              │
│   Automated backups            SSL-encrypted connections                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Key Files |
|-------|---------------|-----------|
| Presentation | Render UI, manage local state, user interactions | `/app/**/*.tsx`, `/components/**/*.tsx` |
| API | Route HTTP requests, enforce auth, return responses | `/app/api/**/*.ts` |
| Business Logic | Orchestrate operations, apply rules, call services | `/lib/services/*.ts`, `/lib/validators/*.ts` |
| Data Access | Database queries, ORM mappings, transactions | `/lib/prisma.ts`, `/prisma/schema.prisma` |
| Database | Persist data, enforce constraints, indexing | Supabase PostgreSQL |

---

## 2. Frontend Architecture

### 2.1 Page Routing Structure (App Router)

```
/app
├── layout.tsx                     ← Root layout: fonts, providers, global styles
├── page.tsx                       ← / (Homepage)
│
├── stay/
│   └── page.tsx                   ← /stay (Rooms listing)
│
├── restaurant/
│   └── page.tsx                   ← /restaurant (Menu + reservations)
│
├── travel/
│   └── page.tsx                   ← /travel (Tour listing)
│
├── checkout/
│   └── page.tsx                   ← /checkout (Booking + payment form)
│
├── confirmation/
│   └── page.tsx                   ← /confirmation?id={booking_id}
│
├── contact/
│   └── page.tsx                   ← /contact (Contact form)
│
├── admin/
│   ├── login/
│   │   └── page.tsx               ← /admin/login
│   └── dashboard/
│       ├── layout.tsx             ← Admin layout (protected)
│       ├── page.tsx               ← /admin/dashboard (overview)
│       ├── bookings/
│       │   └── page.tsx           ← /admin/dashboard/bookings
│       └── inquiries/
│           └── page.tsx           ← /admin/dashboard/inquiries
│
└── api/                           ← API Route Handlers (see Section 3)
```

**Rendering strategy per route**:

```
Route                  Strategy          Reason
─────────────────────────────────────────────────────────
/                      Static (SSG)      Marketing content, rarely changes
/stay                  Server Component  Fetch rooms on each request for freshness
/restaurant            Static (SSG)      Menu rarely changes; revalidate daily
/travel                Server Component  Tour data changes periodically
/checkout              Client Component  Interactive form, booking state needed
/confirmation          Server Component  Fetch confirmed booking by ID
/contact               Client Component  Form with client-side validation
/admin/**              Client Component  Protected, dynamic admin data
```

### 2.2 Component Organization

Components are organized with a **feature-based** approach layered over **atomic design** principles.

```
/components
│
├── ui/                            ← Atomic primitives (no business logic)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Badge.tsx
│   ├── Spinner.tsx
│   └── Toast.tsx
│
├── layout/                        ← Layout-level components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MobileNav.tsx
│   └── AdminSidebar.tsx
│
├── home/                          ← Homepage-specific components
│   ├── Hero.tsx
│   ├── FeaturedRooms.tsx
│   ├── FeaturedTours.tsx
│   ├── HowItWorks.tsx
│   ├── Testimonials.tsx
│   └── CallToAction.tsx
│
├── rooms/                         ← Room feature components
│   ├── RoomCard.tsx
│   ├── RoomGrid.tsx
│   ├── RoomModal.tsx
│   └── RoomFilters.tsx
│
├── tours/                         ← Tour feature components
│   ├── TourCard.tsx
│   ├── TourGrid.tsx
│   ├── TourModal.tsx
│   └── TourFilters.tsx
│
├── booking/                       ← Booking flow components
│   ├── CheckoutForm.tsx
│   ├── BookingSummary.tsx
│   ├── DateRangePicker.tsx
│   ├── GuestCounter.tsx
│   └── ConfirmationDetails.tsx
│
├── payment/                       ← Payment components
│   ├── PaymentButton.tsx
│   └── PaymentStatus.tsx
│
└── admin/                         ← Admin-only components
    ├── BookingsTable.tsx
    ├── BookingDetailModal.tsx
    ├── InquiriesTable.tsx
    ├── StatusBadge.tsx
    └── DashboardStats.tsx
```

**Component rules**:
- `ui/` components receive only props — no API calls, no context consumption
- Feature components (`rooms/`, `booking/`, etc.) may use hooks and context
- Server Components fetch data; Client Components handle interactions
- Each component file exports a single default component

### 2.3 State Management

State is managed at three levels — **no global state library required**.

```
┌─────────────────────────────────────────────────────────────────┐
│                       STATE HIERARCHY                           │
├───────────────────┬─────────────────────────────────────────────┤
│ Level             │ Tool                  │ Scope               │
├───────────────────┼───────────────────────┼─────────────────────┤
│ Server State      │ Next.js Server Comps  │ Page-level, SSR     │
│ Global UI State   │ React Context         │ App-wide            │
│ Local UI State    │ useState / useReducer │ Component-level     │
│ Form State        │ React Hook Form       │ Form-level          │
│ URL State         │ useSearchParams       │ Filters, pagination │
└───────────────────┴───────────────────────┴─────────────────────┘
```

**Context Providers** (defined in `/app/layout.tsx`):

```typescript
// /lib/context/BookingContext.tsx
type BookingState = {
  selectedRoom: Room | null
  selectedTour: Tour | null
  bookingId: string | null
  checkIn: Date | null
  checkOut: Date | null
  guestCount: number
}

// /lib/context/ToastContext.tsx
type ToastState = {
  message: string
  type: 'success' | 'error' | 'info'
  visible: boolean
}
```

Provider wrapping order in `layout.tsx`:
```tsx
<ToastProvider>
  <BookingProvider>
    {children}
  </BookingProvider>
</ToastProvider>
```

### 2.4 Data Fetching Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│              WHEN TO USE SERVER vs CLIENT FETCHING               │
├──────────────────────────────┬───────────────────────────────────┤
│ Server Component Fetch       │ Client Component Fetch           │
├──────────────────────────────┼───────────────────────────────────┤
│ Initial page load data       │ User-triggered actions           │
│ SEO-critical content         │ Form submissions                 │
│ Rooms list (/stay)           │ Create booking (POST)            │
│ Tours list (/travel)         │ Payment initiation               │
│ Confirmation details         │ Admin status updates             │
│ Admin bookings list          │ Real-time status checks          │
└──────────────────────────────┴───────────────────────────────────┘
```

**Server Component data fetching pattern**:
```typescript
// /app/stay/page.tsx
export default async function StayPage() {
  const rooms = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/rooms`, {
    next: { revalidate: 300 } // 5-minute cache
  }).then(r => r.json())
  
  return <RoomGrid rooms={rooms} />
}
```

**Client Component mutation pattern**:
```typescript
// /components/booking/CheckoutForm.tsx
'use client'
const handleSubmit = async (data: BookingFormData) => {
  setLoading(true)
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const booking = await res.json()
  setBookingId(booking.id) // store in context
}
```

### 2.5 Styling Architecture

```
Styling Stack:
─────────────────────────────────────────────────────
Tailwind CSS          → Utility classes (primary)
CSS Custom Properties → Theme tokens (colors, spacing)
CSS Modules           → Component-scoped styles (rare)
Global CSS            → /app/globals.css (resets, fonts)
```

**Theme tokens** (defined in `tailwind.config.ts`):
```typescript
theme: {
  extend: {
    colors: {
      'luxury-gold':    '#C9A84C',
      'luxury-dark':    '#1A1A1A',
      'luxury-cream':   '#F5F0E8',
      'luxury-brown':   '#5C3D2E',
    },
    fontFamily: {
      serif:   ['Playfair Display', 'serif'],
      sans:    ['Inter', 'sans-serif'],
      display: ['Cormorant Garamond', 'serif'],
    }
  }
}
```

**Style hierarchy** — Tailwind utility → component variant → global reset. Never use inline styles except for dynamic values (e.g., animation transforms).

### 2.6 Animation Architecture (Framer Motion)

Framer Motion is used for **page transitions, scroll reveals, and interactive micro-animations**.

```
Animation Integration Points:
─────────────────────────────────────────────────────────────────
Component                 Animation                   Trigger
─────────────────────────────────────────────────────────────────
Hero                      Fade-in + slide up           Mount
RoomCard / TourCard       Stagger children             Scroll into view
BookingModal              Scale + fade                 Open/close
Navigation                Slide in (mobile)            Toggle
ConfirmationPage          Success animation            Mount
PaymentButton             Loading state                Click
Admin status badge        Color transition             Update
─────────────────────────────────────────────────────────────────
```

**Framer Motion usage rules**:
- All animated components must be Client Components (`'use client'`)
- Use `LazyMotion` with `domAnimation` for bundle optimization
- Wrap scroll animations in `useInView` hooks; avoid layout-shifting animations

```typescript
// Pattern: scroll-reveal
import { motion, useInView } from 'framer-motion'
const ref = useRef(null)
const inView = useInView(ref, { once: true, margin: '-100px' })

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 30 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.6, ease: 'easeOut' }}
/>
```

---

## 3. Backend Architecture

### 3.1 API Route Organization

```
/app/api/
│
├── rooms/
│   └── route.ts                   ← GET /api/rooms
│
├── tours/
│   └── route.ts                   ← GET /api/tours
│
├── bookings/
│   ├── route.ts                   ← POST /api/bookings
│   └── [id]/
│       └── route.ts               ← GET /api/bookings/:id
│
├── payment/
│   ├── create-order/
│   │   └── route.ts               ← POST /api/payment/create-order
│   └── verify/
│       └── route.ts               ← POST /api/payment/verify
│
├── contact/
│   └── route.ts                   ← POST /api/contact
│
├── admin/
│   ├── login/
│   │   └── route.ts               ← POST /api/admin/login
│   ├── logout/
│   │   └── route.ts               ← POST /api/admin/logout
│   ├── bookings/
│   │   ├── route.ts               ← GET /api/admin/bookings
│   │   └── [id]/
│   │       └── route.ts           ← PATCH /api/admin/bookings/:id
│   └── inquiries/
│       ├── route.ts               ← GET /api/admin/inquiries
│       └── [id]/
│           └── route.ts           ← PATCH /api/admin/inquiries/:id
│
└── auth/
    └── [...nextauth]/
        └── route.ts               ← NextAuth handler (GET, POST)
```

**Full API Reference**:

```
Method  Endpoint                         Auth      Description
──────────────────────────────────────────────────────────────────────────
GET     /api/rooms                       None      List all active rooms
GET     /api/tours                       None      List all active tours
POST    /api/bookings                    None      Create pending booking
GET     /api/bookings/:id               None      Get booking by ID
POST    /api/payment/create-order        None      Create Razorpay order
POST    /api/payment/verify             None      Verify & confirm payment
POST    /api/contact                    None      Submit contact inquiry
POST    /api/admin/login                None      Admin authentication
POST    /api/admin/logout               Admin     Clear session
GET     /api/admin/bookings             Admin     All bookings (paginated)
PATCH   /api/admin/bookings/:id         Admin     Update booking status
GET     /api/admin/inquiries            Admin     All inquiries
PATCH   /api/admin/inquiries/:id        Admin     Mark inquiry read/status
```

### 3.2 Middleware Stack

Each API route handler is composed with a middleware chain. The order matters.

```
Incoming Request
      │
      ▼
┌─────────────┐
│  Rate       │  → 429 Too Many Requests (protect from abuse)
│  Limiter    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  CORS       │  → 403 if origin not in allowlist
│  Check      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Auth       │  → 401 Unauthorized (admin routes only)
│  Verify     │  → Decode JWT from HttpOnly cookie
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Input      │  → 400 Bad Request with Zod validation errors
│  Validation │  → Parse and sanitize request body/params
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Route      │  → Execute business logic
│  Handler    │  → Call service functions
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Error      │  → 500 with structured error response
│  Handler    │  → Log error details server-side
└──────┬──────┘
       │
       ▼
   Response (JSON)
```

**Middleware implementation**:

```typescript
// /lib/middleware/withAuth.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export function withAuth(handler: Function) {
  return async (req: Request, context: any) => {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, context, session)
  }
}

// /lib/middleware/withValidation.ts
export function withValidation(schema: ZodSchema, handler: Function) {
  return async (req: Request, context: any, ...rest: any[]) => {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      )
    }
    return handler(req, context, result.data, ...rest)
  }
}

// Usage in route handler:
// /app/api/admin/bookings/[id]/route.ts
export const PATCH = withAuth(withValidation(updateBookingSchema, async (req, context, data, session) => {
  const booking = await bookingService.updateStatus(context.params.id, data.status)
  return NextResponse.json(booking)
}))
```

### 3.3 Service Layer Pattern

Services are pure TypeScript modules with no HTTP concerns. They accept typed inputs and return typed outputs.

```
/lib/services/
├── bookingService.ts
├── paymentService.ts
├── emailService.ts
├── adminService.ts
└── roomService.ts
```

**bookingService.ts pattern**:
```typescript
// /lib/services/bookingService.ts
import { prisma } from '@/lib/prisma'
import { emailService } from './emailService'

export const bookingService = {
  async create(data: CreateBookingInput): Promise<Booking> {
    return prisma.booking.create({ data: { ...data, status: 'PENDING' } })
  },

  async getById(id: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: { room: true, tour: true, payment: true }
    })
  },

  async confirmPayment(bookingId: string, paymentData: PaymentData): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'PAID' }
      })
      await tx.payment.create({ data: { ...paymentData, bookingId } })
      return booking
    })
  },

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status }
    })
    await emailService.sendStatusUpdate(booking)
    return booking
  }
}
```

### 3.4 Database Connection Pooling

Prisma requires a singleton client to avoid exhausting connections in serverless environments.

```typescript
// /lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Connection URL strategy**:
```
Development:   Direct connection    → DATABASE_URL (no pooler)
Production:    Supabase Pooler URL  → DATABASE_URL (pgbouncer port 6543)
                                     (transaction mode for serverless)
```

Environment variables required:
```
DATABASE_URL          → Supabase pooler connection string (production)
DIRECT_URL            → Direct DB connection (for Prisma migrations only)
```

In `schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3.5 Environment Configuration

```
/
├── .env.local              ← Local development (git-ignored)
├── .env.example            ← Template for all required vars (committed)
└── .env.test               ← Test environment overrides
```

**.env.example** (complete variable list):
```
# Database
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true
DIRECT_URL=postgresql://user:pass@host:5432/db

# Authentication
NEXTAUTH_SECRET=32-char-random-string
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@khanbhai.com
ADMIN_PASSWORD_HASH=bcrypt-hash

# Payments
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@khanbhai.com
SMTP_PASS=app-specific-password
EMAIL_FROM="Khan Bhai S. <notifications@khanbhai.com>"
OWNER_EMAIL=owner@khanbhai.com

# Business
OWNER_PHONE=919876543210
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## 4. Database Architecture

### 4.1 Schema Design

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                                   │
│                     (PostgreSQL via Supabase)                            │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────────────────┐
│      rooms       │         │            bookings              │
├──────────────────┤         ├──────────────────────────────────┤
│ id       UUID PK │◄──┐     │ id          UUID PK              │
│ name     TEXT    │   │     │ booking_ref TEXT UNIQUE          │
│ slug     TEXT    │   ├─────│ room_id     UUID FK → rooms.id   │
│ desc     TEXT    │   │     │ tour_id     UUID FK → tours.id   │
│ price    DECIMAL │   │     │ type        ENUM(ROOM,TOUR,REST)  │
│ images   TEXT[]  │   │     │ status      ENUM(PENDING,PAID,   │
│ amenities TEXT[] │   │     │             CONFIRMED,CANCELLED) │
│ capacity INT     │   │     │ cust_name   TEXT NOT NULL        │
│ available BOOL   │   │     │ cust_email  TEXT NOT NULL        │
│ created_at TIMESTP│  │     │ cust_phone  TEXT NOT NULL        │
└──────────────────┘   │     │ check_in    DATE                 │
                        │     │ check_out   DATE                 │
┌──────────────────┐   │     │ guests      INT                  │
│      tours       │   │     │ total_amt   DECIMAL NOT NULL     │
├──────────────────┤   │     │ special_req TEXT                 │
│ id       UUID PK │◄──┤     │ created_at  TIMESTAMP           │
│ name     TEXT    │   │     │ updated_at  TIMESTAMP           │
│ slug     TEXT    │   │     └───────────────┬──────────────────┘
│ desc     TEXT    │   │                     │ 1:1
│ duration TEXT    │   │     ┌───────────────▼──────────────────┐
│ price    DECIMAL │   │     │            payments              │
│ images   TEXT[]  │   │     ├──────────────────────────────────┤
│ includes TEXT[]  │   ├─────│ id              UUID PK          │
│ available BOOL   │   │     │ booking_id      UUID FK UNIQUE   │
│ created_at TIMESTP│  │     │ razorpay_order_id TEXT          │
└──────────────────┘   │     │ razorpay_payment_id TEXT        │
                        │     │ razorpay_signature TEXT         │
┌──────────────────┐   │     │ amount          DECIMAL         │
│    admin_users   │   │     │ currency        TEXT DEFAULT INR │
├──────────────────┤   │     │ status          TEXT             │
│ id       UUID PK │   │     │ paid_at         TIMESTAMP       │
│ email    TEXT UQ │   │     │ created_at      TIMESTAMP       │
│ password TEXT    │   │     └──────────────────────────────────┘
│ role     TEXT    │   │
│ created_at TIMESTP│  │     ┌──────────────────────────────────┐
└──────────────────┘   │     │           inquiries              │
                        │     ├──────────────────────────────────┤
                        └─────│ id          UUID PK              │
                              │ name        TEXT NOT NULL        │
                              │ email       TEXT NOT NULL        │
                              │ phone       TEXT                 │
                              │ message     TEXT NOT NULL        │
                              │ status      ENUM(NEW,READ,DONE) │
                              │ created_at  TIMESTAMP           │
                              └──────────────────────────────────┘
```

**Prisma Schema** (`/prisma/schema.prisma`):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Room {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String
  price       Decimal   @db.Decimal(10, 2)
  images      String[]
  amenities   String[]
  capacity    Int       @default(2)
  available   Boolean   @default(true)
  createdAt   DateTime  @default(now()) @map("created_at")
  bookings    Booking[]

  @@map("rooms")
}

model Tour {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String
  duration    String
  price       Decimal   @db.Decimal(10, 2)
  images      String[]
  includes    String[]
  available   Boolean   @default(true)
  createdAt   DateTime  @default(now()) @map("created_at")
  bookings    Booking[]

  @@map("tours")
}

model Booking {
  id             String        @id @default(uuid())
  bookingRef     String        @unique @map("booking_ref")
  roomId         String?       @map("room_id")
  tourId         String?       @map("tour_id")
  type           BookingType
  status         BookingStatus @default(PENDING)
  customerName   String        @map("customer_name")
  customerEmail  String        @map("customer_email")
  customerPhone  String        @map("customer_phone")
  checkIn        DateTime?     @map("check_in") @db.Date
  checkOut       DateTime?     @map("check_out") @db.Date
  guests         Int           @default(1)
  totalAmount    Decimal       @map("total_amount") @db.Decimal(10, 2)
  specialRequests String?      @map("special_requests")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  room           Room?         @relation(fields: [roomId], references: [id])
  tour           Tour?         @relation(fields: [tourId], references: [id])
  payment        Payment?

  @@index([status])
  @@index([customerEmail])
  @@index([createdAt])
  @@map("bookings")
}

model Payment {
  id                  String   @id @default(uuid())
  bookingId           String   @unique @map("booking_id")
  razorpayOrderId     String   @map("razorpay_order_id")
  razorpayPaymentId   String?  @map("razorpay_payment_id")
  razorpaySignature   String?  @map("razorpay_signature")
  amount              Decimal  @db.Decimal(10, 2)
  currency            String   @default("INR")
  status              String   @default("created")
  paidAt              DateTime? @map("paid_at")
  createdAt           DateTime @default(now()) @map("created_at")
  booking             Booking  @relation(fields: [bookingId], references: [id])

  @@map("payments")
}

model Inquiry {
  id        String        @id @default(uuid())
  name      String
  email     String
  phone     String?
  message   String
  status    InquiryStatus @default(NEW)
  createdAt DateTime      @default(now()) @map("created_at")

  @@index([status])
  @@map("inquiries")
}

model AdminUser {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hash
  role      String   @default("ADMIN")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("admin_users")
}

enum BookingType {
  ROOM
  TOUR
  RESTAURANT
}

enum BookingStatus {
  PENDING
  PAID
  CONFIRMED
  CANCELLED
}

enum InquiryStatus {
  NEW
  READ
  DONE
}
```

### 4.2 Indexing Strategy

```
Table       Index               Type      Purpose
──────────────────────────────────────────────────────────────────
bookings    status              B-tree    Filter by status in admin
bookings    customer_email      B-tree    Look up bookings by email
bookings    created_at          B-tree    Sort/filter by date
bookings    booking_ref         B-tree    Unique, lookup by ref
payments    booking_id          B-tree    Unique FK join
inquiries   status              B-tree    Filter new/read inquiries
rooms       slug                B-tree    Unique, URL lookups
tours       slug                B-tree    Unique, URL lookups
```

Prisma generates these via `@@index` and `@unique` decorators in the schema.

### 4.3 Migration Strategy

```
Development lifecycle:
1. Edit /prisma/schema.prisma
2. Run: npx prisma migrate dev --name describe_change
   → Creates SQL file in /prisma/migrations/
   → Applies migration to dev DB
   → Regenerates Prisma Client

Production deployment:
3. CI/CD runs: npx prisma migrate deploy
   → Applies pending migrations via DIRECT_URL
   → Non-destructive only; breaking changes require manual review

Seeding:
4. /prisma/seed.ts → npx prisma db seed
   → Inserts admin user (bcrypt-hashed password)
   → Inserts sample rooms and tours
```

**Migration naming convention**: `YYYYMMDDHHMMSS_verb_noun.sql`
Example: `20260501120000_create_bookings_table.sql`

### 4.4 Database-Level Validation

Constraints enforced at the database level (not just application level):

```sql
-- NOT NULL on required customer fields
-- CHECK constraint on guests count
-- ENUM types for status fields
-- UNIQUE on booking_ref, payment booking_id, room/tour slugs
-- DECIMAL precision (10,2) for all monetary values
-- FK constraints with appropriate ON DELETE behavior
```

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN AUTHENTICATION FLOW                    │
└─────────────────────────────────────────────────────────────────┘

  Admin Browser                  Next.js API              Database
      │                              │                        │
      │  POST /api/admin/login       │                        │
      │  { email, password }         │                        │
      ├─────────────────────────────►│                        │
      │                              │  findUnique(email)     │
      │                              ├───────────────────────►│
      │                              │◄───────────────────────┤
      │                              │  admin_user record     │
      │                              │                        │
      │                              │  bcrypt.compare(       │
      │                              │    password,           │
      │                              │    hash                │
      │                              │  )                     │
      │                              │                        │
      │                              │  ✓ Valid              │
      │                              │  NextAuth.signIn()     │
      │                              │  → creates JWT session │
      │                              │                        │
      │◄─────────────────────────────┤                        │
      │  Set-Cookie: next-auth.session-token (HttpOnly)       │
      │  Redirect → /admin/dashboard │                        │
      │                              │                        │

  Subsequent Admin Requests:
      │                              │                        │
      │  GET /api/admin/bookings     │                        │
      │  Cookie: next-auth.session-token                      │
      ├─────────────────────────────►│                        │
      │                              │  getServerSession()    │
      │                              │  → decode JWT          │
      │                              │  → verify role=ADMIN   │
      │                              │                        │
      │                              │  ✓ Authorized          │
      │                              │  → continue to handler │
      │◄─────────────────────────────┤                        │
      │  200 OK + bookings data      │                        │
```

### 5.2 NextAuth Configuration

```typescript
// /lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email }
        })
        if (!admin) return null
        
        const isValid = await bcrypt.compare(credentials.password, admin.password)
        if (!isValid) return null
        
        return { id: admin.id, email: admin.email, role: admin.role }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role as string
      return session
    }
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60 // 8 hours
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
}
```

### 5.3 JWT Token Structure

```
Header:  { alg: "HS256", typ: "JWT" }
Payload: {
  sub: admin_user_id,
  email: admin@khanbhai.com,
  role: "ADMIN",
  iat: issued_at_timestamp,
  exp: expiry_timestamp (8h)
}
Signature: HMAC-SHA256(header + payload, NEXTAUTH_SECRET)
```

Token is stored in an **HttpOnly cookie** (`next-auth.session-token`) — inaccessible to JavaScript, preventing XSS theft.

### 5.4 Route Protection

```
Protection is applied at two levels:

1. API Route level (server-side):
   → withAuth() middleware wraps all /api/admin/* handlers
   → Returns 401 if no valid session

2. Page level (middleware.ts):
   → Next.js middleware intercepts /admin/dashboard/** requests
   → Redirects unauthenticated users to /admin/login
```

```typescript
// /middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => token?.role === 'ADMIN'
  }
})

export const config = {
  matcher: ['/admin/dashboard/:path*']
}
```

### 5.5 RBAC Implementation

```
Role        Pages Accessible           API Access
──────────────────────────────────────────────────────────────────
Guest       All public pages           GET /api/rooms, /api/tours
            /checkout, /confirmation   POST /api/bookings
                                       POST /api/payment/*
                                       POST /api/contact

ADMIN       All above + /admin/**      All above +
                                       GET /api/admin/*
                                       PATCH /api/admin/*
                                       POST /api/admin/logout
```

No Staff role is implemented in v1.0 — only Guest and ADMIN.

---

## 6. Payment Processing Architecture

### 6.1 Payment Integration Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     RAZORPAY PAYMENT FLOW                                │
└──────────────────────────────────────────────────────────────────────────┘

  Browser              Next.js API           Razorpay API          Database
    │                      │                      │                    │
    │  1. POST /api/payment/create-order           │                    │
    │  { booking_id, amount }                      │                    │
    ├─────────────────────►│                      │                    │
    │                      │  2. orders.create()  │                    │
    │                      │  { amount_paise,     │                    │
    │                      │    currency: "INR",  │                    │
    │                      │    receipt: booking_ref }                  │
    │                      ├─────────────────────►│                    │
    │                      │◄─────────────────────┤                    │
    │                      │  { order_id, amount } │                    │
    │◄─────────────────────┤                      │                    │
    │  { order_id, key }   │                      │                    │
    │                      │                      │                    │
    │  3. Initialize Razorpay JS Widget            │                    │
    │  4. Guest enters payment details             │                    │
    │                      │                      │                    │
    │  5. (Direct browser → Razorpay)             │                    │
    │─────────────────────────────────────────────►│                    │
    │◄─────────────────────────────────────────────┤                    │
    │  { razorpay_payment_id,                      │                    │
    │    razorpay_order_id,                        │                    │
    │    razorpay_signature }                      │                    │
    │                      │                      │                    │
    │  6. POST /api/payment/verify                 │                    │
    │  { payment_id, order_id,                    │                    │
    │    signature, booking_id }                   │                    │
    ├─────────────────────►│                      │                    │
    │                      │  7. Verify HMAC sig  │                    │
    │                      │  computed = HMAC(    │                    │
    │                      │    order_id|payment_id,                   │
    │                      │    RAZORPAY_SECRET   │                    │
    │                      │  )                   │                    │
    │                      │  if ≠ received → 400 │                    │
    │                      │                      │                    │
    │                      │  8. DB Transaction ──────────────────────►│
    │                      │  UPDATE bookings     │                    │
    │                      │  SET status='PAID'   │                    │
    │                      │  INSERT payments(..) │                    │
    │                      │◄──────────────────────────────────────────┤
    │                      │                      │                    │
    │                      │  9. Send emails (async)                   │
    │◄─────────────────────┤                      │                    │
    │  { success: true,    │                      │                    │
    │    booking_id }      │                      │                    │
    │                      │                      │                    │
    │  10. Redirect to /confirmation?id=...       │                    │
```

### 6.2 Payment State Machine

```
                    ┌──────────┐
                    │  START   │ Guest submits checkout form
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │ PENDING  │ Booking created in DB
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │ (timeout) │         │ (payment success)
              ▼           │         ▼
        ┌──────────┐      │   ┌──────────┐
        │CANCELLED │      │   │   PAID   │ Razorpay sig verified
        └──────────┘      │   └────┬─────┘
              ▲           │        │
              │           │        │ (admin confirms)
              │           │        ▼
              │           │   ┌──────────┐
              └───────────┴───│CONFIRMED │ Admin marks confirmed
                              └──────────┘

Allowed Transitions (enforced in updateStatus service):
  PENDING   → PAID        (payment verification)
  PENDING   → CANCELLED   (admin action or timeout)
  PAID      → CONFIRMED   (admin action)
  PAID      → CANCELLED   (admin action, triggers refund flow)
  CONFIRMED → CANCELLED   (admin action, triggers refund flow)
```

### 6.3 Signature Verification

```typescript
// /lib/services/paymentService.ts
import crypto from 'crypto'

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  receivedSignature: string
): boolean {
  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  )
}
```

`crypto.timingSafeEqual` is used to prevent timing-based side-channel attacks.

### 6.4 Webhook Handling

Razorpay sends server-to-server webhook events for payment lifecycle updates. This provides a backup in case the browser flow fails.

```typescript
// /app/api/payment/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')!
  
  // Verify webhook signature
  const isValid = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex') === signature
  
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  
  const event = JSON.parse(body)
  
  switch (event.event) {
    case 'payment.captured':
      await paymentService.handleCapture(event.payload.payment.entity)
      break
    case 'payment.failed':
      await paymentService.handleFailure(event.payload.payment.entity)
      break
  }
  
  return NextResponse.json({ received: true })
}
```

### 6.5 Refund Handling

```typescript
// Refund flow (admin-initiated)
async function initiateRefund(bookingId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { bookingId } })
  
  // Call Razorpay refund API
  const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
    amount: payment.amount * 100, // paise
    notes: { reason: 'Booking cancelled' }
  })
  
  // Update booking and log refund
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }),
    prisma.payment.update({ where: { bookingId }, data: { status: 'refunded' } })
  ])
  
  await emailService.sendRefundConfirmation(bookingId)
}
```

### 6.6 PCI Compliance Strategy

Khan Bhai S. achieves PCI compliance at **SAQ A level** (the lowest complexity) because:
- Card data is never handled by our servers
- Razorpay's hosted JavaScript widget collects card data directly
- Our servers only receive Razorpay's tokenized payment IDs and signatures
- We never store CVV, full card numbers, or raw card data

---

## 7. Email & Notification Architecture

### 7.1 Email Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL SYSTEM ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

  API Handler              Email Service              Gmail SMTP
      │                        │                          │
      │  emailService.send()   │                          │
      ├───────────────────────►│                          │
      │                        │  Select template         │
      │                        │  Inject data             │
      │                        │  Build HTML              │
      │                        │                          │
      │                        │  nodemailer.sendMail()   │
      │                        ├─────────────────────────►│
      │                        │◄─────────────────────────┤
      │                        │  { messageId }           │
      │◄───────────────────────┤                          │
      │  { success }           │                          │
```

### 7.2 Nodemailer Configuration

```typescript
// /lib/services/emailService.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export const emailService = {
  async sendBookingConfirmation(booking: BookingWithRelations): Promise<void> {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: booking.customerEmail,
      subject: `Booking Confirmed — ${booking.bookingRef}`,
      html: bookingConfirmationTemplate(booking)
    })
  },

  async sendOwnerAlert(booking: BookingWithRelations): Promise<void> {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.OWNER_EMAIL,
      subject: `New Booking: ${booking.customerName} — ${booking.bookingRef}`,
      html: ownerAlertTemplate(booking)
    })
  },

  async sendStatusUpdate(booking: BookingWithRelations): Promise<void> {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: booking.customerEmail,
      subject: `Booking Update — ${booking.bookingRef}`,
      html: statusUpdateTemplate(booking)
    })
  }
}
```

### 7.3 Email Template System

```
/lib/emails/
├── templates/
│   ├── bookingConfirmation.ts    ← Guest confirmation email
│   ├── ownerAlert.ts             ← Owner new booking alert
│   ├── statusUpdate.ts           ← Booking status changed
│   └── refundConfirmation.ts     ← Refund initiated
└── base.ts                       ← Shared HTML wrapper (header, footer, styles)
```

**Template structure**:
```typescript
// /lib/emails/templates/bookingConfirmation.ts
export function bookingConfirmationTemplate(booking: Booking): string {
  return baseEmail({
    title: 'Your Booking is Confirmed!',
    content: `
      <h2>Booking Reference: ${booking.bookingRef}</h2>
      <p>Dear ${booking.customerName},</p>
      <table>
        <tr><td>Check-in:</td><td>${formatDate(booking.checkIn)}</td></tr>
        <tr><td>Check-out:</td><td>${formatDate(booking.checkOut)}</td></tr>
        <tr><td>Guests:</td><td>${booking.guests}</td></tr>
        <tr><td>Total Paid:</td><td>₹${booking.totalAmount}</td></tr>
      </table>
      <a href="https://wa.me/${process.env.OWNER_PHONE}">Chat on WhatsApp</a>
    `
  })
}
```

Emails are sent in the same request cycle (no queue in v1.0). If email fails, it is logged but does not fail the payment confirmation response.

### 7.4 WhatsApp Integration

WhatsApp integration is **link-based** (no API required):

```typescript
// /lib/utils/whatsapp.ts
export function generateWhatsAppLink(booking: Booking): string {
  const message = encodeURIComponent(
    `Hi! I just booked ${booking.room?.name ?? booking.tour?.name}.\n` +
    `Booking Ref: ${booking.bookingRef}\n` +
    `Check-in: ${formatDate(booking.checkIn)}\n` +
    `Guests: ${booking.guests}`
  )
  return `https://wa.me/${process.env.OWNER_PHONE}?text=${message}`
}
```

Displayed as a button on the confirmation page and in the owner alert email.

---

## 8. Caching Strategy

### 8.1 Caching Layers Overview

```
Request →
    Browser Cache (static assets, CDN headers)
        → Vercel Edge Cache (Next.js ISR / fetch cache)
            → In-memory (Next.js request memoization)
                → Database (source of truth)
```

### 8.2 Per-Route Caching Strategy

```
Route                Cache Strategy        Revalidation    Reason
────────────────────────────────────────────────────────────────────────
/ (homepage)         Static (SSG)          On deploy       Marketing content
/stay                fetch cache 5 min     300s            Room list changes infrequently
/travel              fetch cache 5 min     300s            Tour list changes infrequently
/restaurant          Static (SSG)          On deploy       Menu rarely changes
/checkout            No cache              None            User-specific, dynamic
/confirmation        No cache              None            Per-booking, sensitive
/admin/**            No cache              None            Real-time operational data
/api/rooms           fetch cache 5 min     300s            Shared room data
/api/tours           fetch cache 5 min     300s            Shared tour data
/api/admin/**        No cache              None            Admin queries must be fresh
```

### 8.3 Static Asset Caching

Next.js and Vercel automatically set optimal cache headers:
```
/_next/static/**    Cache-Control: public, max-age=31536000, immutable
/images/**          Cache-Control: public, max-age=86400
```

Images go through `next/image` for automatic WebP conversion, responsive sizing, and lazy loading.

### 8.4 API Response Caching Pattern

```typescript
// Cache rooms for 5 minutes using Next.js fetch cache
const rooms = await fetch(`${baseUrl}/api/rooms`, {
  next: { revalidate: 300 }
})

// Force fresh data (no cache)
const bookings = await fetch(`/api/admin/bookings`, {
  cache: 'no-store'
})
```

### 8.5 Redis (Optional — Phase 2)

Redis is not required for v1.0. If traffic grows significantly, introduce Redis for:
- Session storage (replace JWT cookies)
- Rate limiting counters (replace in-memory)
- API response caching (replace Next.js fetch cache for fine-grained control)

Connection via Upstash Redis (Vercel-compatible, serverless-friendly).

---

## 9. Error Handling & Logging

### 9.1 Error Classification

```
Error Type          HTTP Code   Action
──────────────────────────────────────────────────────────────────
Validation Error    400         Return Zod error details to client
Unauthorized        401         Redirect to login (pages) or 401 JSON (API)
Forbidden           403         Return 403 JSON
Not Found           404         Return 404 JSON or Next.js not-found page
Payment Failure     402         Return payment error details
Internal Error      500         Log full error; return generic message
External API Error  502         Log details; return generic message
```

### 9.2 Global API Error Handler

```typescript
// /lib/middleware/withErrorHandling.ts
export function withErrorHandling(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      console.error('[API Error]', {
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      })

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.flatten() },
          { status: 400 }
        )
      }

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 })
        }
      }

      return NextResponse.json(
        { error: 'An unexpected error occurred. Please try again.' },
        { status: 500 }
      )
    }
  }
}
```

### 9.3 Frontend Error Handling

```typescript
// /app/error.tsx — Next.js App Router error boundary
'use client'
export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}

// /app/not-found.tsx
export default function NotFound() {
  return <div>Page not found — <Link href="/">Return home</Link></div>
}
```

### 9.4 Structured Logging

All log entries use a consistent JSON structure:

```typescript
// /lib/logger.ts
type LogLevel = 'info' | 'warn' | 'error'

export function log(level: LogLevel, event: string, data?: object) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...data
  }
  console[level](JSON.stringify(entry))
}

// Usage:
log('info', 'booking.created', { bookingId, customerEmail, amount })
log('error', 'payment.verification_failed', { bookingId, reason })
log('warn', 'email.send_failed', { bookingId, error: err.message })
```

Vercel captures all `console.*` output — accessible in the Vercel dashboard under Functions Logs.

### 9.5 Error Recovery Strategies

```
Failure Scenario             Recovery Strategy
─────────────────────────────────────────────────────────────────────
Email send fails             Log error, do NOT block payment confirmation
                             Retry manually via admin or next request

Payment verification fails   Return 400 to client; booking stays PENDING
                             Guest can retry payment

DB write fails on verify     Return 500; Razorpay webhook provides backup
                             payment.captured event will retry the update

Razorpay API down            Show error to user; booking stays PENDING
                             Admin can manually update status

Admin login fails            Return 401; increment failed attempt counter
                             After 5 fails, optional lockout (Phase 2)
```

---

## 10. Deployment Architecture

### 10.1 Infrastructure Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       PRODUCTION INFRASTRUCTURE                          │
└──────────────────────────────────────────────────────────────────────────┘

  GitHub Repository
        │
        │  git push → CI/CD
        ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                     VERCEL PLATFORM                              │
  │                                                                  │
  │  ┌─────────────┐   ┌─────────────────┐   ┌───────────────────┐  │
  │  │   Edge      │   │  Serverless     │   │   Static Assets   │  │
  │  │  Network    │   │  Functions      │   │   (CDN)           │  │
  │  │  (CDN)      │   │  Next.js API    │   │  /_next/static    │  │
  │  │             │   │  routes         │   │  /images          │  │
  │  └─────────────┘   └───────┬─────────┘   └───────────────────┘  │
  │                             │                                     │
  └─────────────────────────────┼───────────────────────────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
  ┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐
  │   Supabase      │  │  Razorpay     │  │  Gmail SMTP      │
  │   PostgreSQL    │  │  Payment API  │  │  (Nodemailer)    │
  │   + pgbouncer   │  │               │  │                  │
  └─────────────────┘  └───────────────┘  └──────────────────┘
```

### 10.2 Environment Management

```
Environment     Branch          URL                         DB
─────────────────────────────────────────────────────────────────────────
Development     local           http://localhost:3000       Local PostgreSQL or Supabase dev project
Preview         PR branches     https://pr-*.vercel.app     Supabase dev project (same)
Production      main            https://khanbhai.com        Supabase production project
```

**Vercel environment variables** are configured per environment:
- Development: set in `.env.local`
- Preview: set in Vercel project settings → Preview environment
- Production: set in Vercel project settings → Production environment

### 10.3 Deployment Pipeline

```
Developer                  GitHub               Vercel              Production
    │                         │                    │                     │
    │  git push origin main   │                    │                     │
    ├────────────────────────►│                    │                     │
    │                         │  Trigger deploy    │                     │
    │                         ├───────────────────►│                     │
    │                         │                    │  Install deps       │
    │                         │                    │  npx prisma generate│
    │                         │                    │  next build         │
    │                         │                    │                     │
    │                         │                    │  npx prisma migrate │
    │                         │                    │  deploy             │
    │                         │                    ├────────────────────►│
    │                         │                    │◄────────────────────┤
    │                         │                    │  Migrations applied  │
    │                         │                    │                     │
    │                         │                    │  Deploy serverless  │
    │                         │                    │  functions + static │
    │◄───────────────────────────────────────────  │                     │
    │  Deployment URL          │                    │                     │
```

**`package.json` build scripts**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

**Vercel build settings**:
```
Build Command:    npm run build
Output Directory: .next
Install Command:  npm install
```

### 10.4 Secrets Management

```
Secret                   Storage              Access
──────────────────────────────────────────────────────────────────
DATABASE_URL             Vercel Env Vars      Server-side only
NEXTAUTH_SECRET          Vercel Env Vars      Server-side only
RAZORPAY_KEY_SECRET      Vercel Env Vars      Server-side only
RAZORPAY_KEY_ID          Vercel Env Vars      NEXT_PUBLIC_ prefix for client
SMTP_PASS                Vercel Env Vars      Server-side only
OWNER_EMAIL              Vercel Env Vars      Server-side only
```

Rule: Any variable prefixed `NEXT_PUBLIC_` is bundled into the client JS. Never prefix secret keys with `NEXT_PUBLIC_`.

---

## 11. Security Architecture

### 11.1 Security Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ARCHITECTURE                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: Transport        HTTPS enforced by Vercel (TLS 1.3)           │
│  Layer 2: Headers          Security headers via next.config.js           │
│  Layer 3: Authentication   HttpOnly JWT cookies via NextAuth             │
│  Layer 4: Authorization    withAuth() middleware on all /admin routes    │
│  Layer 5: Input Validation Zod schema on every API body                 │
│  Layer 6: Query Safety     Prisma ORM (parameterized queries)            │
│  Layer 7: Rate Limiting    In-memory rate limiter per IP                 │
│  Layer 8: CORS             Allowlist in next.config.js                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com",
      "frame-src https://api.razorpay.com",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.razorpay.com",
    ].join('; ')
  }
]
```

### 11.3 CORS Configuration

Next.js API routes are same-origin by default. External webhooks (Razorpay) are verified by signature, not origin.

```typescript
// For webhook endpoints only:
export async function POST(req: Request) {
  // Validate via X-Razorpay-Signature header — origin is irrelevant
  // All other API routes reject cross-origin requests by default
}
```

### 11.4 Input Validation Strategy

Every POST/PATCH endpoint validates input with Zod **before** touching the database:

```typescript
// /lib/validators/bookingSchema.ts
export const createBookingSchema = z.object({
  customerName:  z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().regex(/^\+?[1-9]\d{9,14}$/),
  roomId:        z.string().uuid().optional(),
  tourId:        z.string().uuid().optional(),
  checkIn:       z.string().datetime().optional(),
  checkOut:      z.string().datetime().optional(),
  guests:        z.number().int().min(1).max(20),
  totalAmount:   z.number().positive(),
  specialRequests: z.string().max(500).optional()
}).refine(data => data.roomId || data.tourId, {
  message: 'Either roomId or tourId is required'
})
```

### 11.5 SQL Injection Prevention

Prisma ORM uses **prepared statements** for all queries. Raw SQL is never used. There is no string concatenation in query construction. This eliminates SQL injection by design.

### 11.6 CSRF Protection

NextAuth handles CSRF protection automatically for its endpoints. For custom API routes that mutate state (POST/PATCH), protection comes from:
1. `Content-Type: application/json` requirement (browser forms cannot send JSON cross-origin)
2. SameSite cookie attribute on session tokens
3. Admin auth requirement on sensitive mutations

### 11.7 Rate Limiting

```typescript
// /lib/middleware/rateLimit.ts
const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(limit: number, windowMs: number) {
  return (handler: Function) => async (req: Request, ...args: any[]) => {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const now = Date.now()
    const record = requestCounts.get(ip)
    
    if (!record || now > record.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + windowMs })
    } else if (record.count >= limit) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    } else {
      record.count++
    }
    
    return handler(req, ...args)
  }
}

// Applied to sensitive endpoints:
// POST /api/bookings      → 10 requests per 60 seconds
// POST /api/payment/*     → 5 requests per 60 seconds
// POST /api/admin/login   → 5 requests per 5 minutes
// POST /api/contact       → 3 requests per 60 seconds
```

Note: In-memory rate limiting resets on each serverless cold start. For stricter enforcement, use Redis (Upstash) in Phase 2.

---

## 12. Scalability Considerations

### 12.1 Current Architecture Limits

```
Metric                   Expected v1.0     Architecture Limit
────────────────────────────────────────────────────────────────────
Concurrent users         50-200            ~2,000 (Vercel + Supabase free)
Bookings per month       100-500           Unlimited (PostgreSQL)
API requests/sec         10-50             ~200 (serverless cold starts)
DB connections           5-20              25 (Supabase free pgbouncer)
Image requests           High              Unlimited (Vercel CDN)
Email sends/month        200-1000          2,000 (Gmail SMTP)
```

### 12.2 Database Scaling

```
Phase 1 (Current):
  Supabase Free → 500MB DB, 2 CPU, shared
  pgbouncer transaction mode → 25 pooled connections

Phase 2 (Growth):
  Supabase Pro → 8GB DB, dedicated resources
  Increase pgbouncer pool size to 100+

Phase 3 (Scale):
  Read replicas for admin dashboard queries
  Query optimization via EXPLAIN ANALYZE
  Compound indexes for complex admin filters
```

### 12.3 API Scaling

Vercel Serverless Functions scale automatically. Key considerations:

```
Cold Start Reduction:
  → Keep API route files small (one route per file)
  → Avoid heavy imports at module level
  → Use dynamic imports for large dependencies

Connection Reuse:
  → Prisma singleton prevents connection exhaustion
  → HTTP keep-alive for Razorpay/Nodemailer clients

Timeout Management:
  → Default Vercel function timeout: 10s (Hobby), 60s (Pro)
  → Payment verification must complete in <10s
  → Email sending is fire-and-forget (does not block response)
```

### 12.4 Image Optimization

```typescript
// All images use next/image:
import Image from 'next/image'

<Image
  src="/rooms/deluxe-suite.jpg"
  alt="Deluxe Suite"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

Next.js automatically:
- Converts to WebP/AVIF
- Serves responsive sizes via `sizes` attribute
- Lazy loads below-the-fold images
- Caches processed images on Vercel CDN

### 12.5 CDN Usage

Vercel's global edge network (Vercel CDN) handles:
- Static files (`/_next/static/`)
- Processed images (`/_next/image/`)
- Statically generated pages (homepage, restaurant page)

No separate CDN configuration required.

### 12.6 Performance Monitoring

```
Tool                    Purpose                     Setup
──────────────────────────────────────────────────────────────────
Vercel Analytics        Web vitals, page metrics    Built-in (enable in dashboard)
Vercel Speed Insights   Core Web Vitals per page    npm i @vercel/speed-insights
Vercel Function Logs    API errors, duration        Built-in
next/bundle-analyzer    JS bundle size              npm i @next/bundle-analyzer
```

**Core Web Vitals targets**:
```
LCP (Largest Contentful Paint)   < 2.5s
FID (First Input Delay)          < 100ms
CLS (Cumulative Layout Shift)    < 0.1
TTFB (Time to First Byte)        < 800ms
```

Achieved through:
- Static generation for marketing pages
- `next/image` for hero images
- Font preloading via `next/font`
- Code splitting (automatic via App Router)
- Minimal client-side JS on server components

---

## Appendix: Key Request/Response Flows

### A. Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                    COMPONENT INTERACTION MAP                           │
└────────────────────────────────────────────────────────────────────────┘

  /stay page (Server Component)
       │
       ├── fetches rooms on server
       │
       └── renders <RoomGrid rooms={rooms} />
              │
              └── maps to <RoomCard /> (Client Component)
                     │
                     ├── user clicks "Book Now"
                     │
                     └── sets BookingContext.selectedRoom
                                │
                                └── triggers navigation to /checkout
                                         │
                                         └── <CheckoutForm /> (Client)
                                                │
                                                ├── reads BookingContext.selectedRoom
                                                ├── validates with React Hook Form + Zod
                                                ├── POST /api/bookings
                                                │
                                                └── on success → sets bookingId in context
                                                         │
                                                         └── <PaymentButton />
                                                                │
                                                                ├── POST /api/payment/create-order
                                                                ├── initializes Razorpay widget
                                                                │
                                                                └── on payment success
                                                                         │
                                                                         └── POST /api/payment/verify
                                                                                  │
                                                                                  └── redirect /confirmation
```

### B. Admin Session Flow

```
Browser                        Middleware.ts              API Handler
   │                               │                          │
   │  GET /admin/dashboard         │                          │
   ├──────────────────────────────►│                          │
   │                               │  getToken(req)           │
   │                               │  → decode JWT cookie     │
   │                               │                          │
   │                               │  token.role === 'ADMIN'? │
   │                               │    Yes → continue        │
   │                               │    No → redirect /login  │
   │                               │                          │
   │◄──────────────────────────────┤                          │
   │  200 + dashboard page         │                          │
   │                               │                          │
   │  GET /api/admin/bookings      │                          │
   ├──────────────────────────────────────────────────────────►
   │                               │          withAuth() check│
   │                               │          getServerSession│
   │                               │          → verify ADMIN  │
   │                               │                          │
   │                               │          bookingService  │
   │                               │          .getAllBookings()│
   │◄──────────────────────────────────────────────────────────
   │  { bookings: [...] }          │                          │
```

---

*This document covers the complete technical architecture for Khan Bhai S. v1.0. The companion document `SYSTEM_DESIGN.md` defines requirements and user journeys. Together they provide everything needed to build and deploy the system.*

*Next steps: Reference `SYSTEM_DESIGN.md` Section "Deployment Model" for environment-specific configuration and the 8-phase build roadmap.*
