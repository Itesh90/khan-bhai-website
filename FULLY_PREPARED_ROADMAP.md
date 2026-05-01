# Khan Bhai S. — FULLY PREPARED ROADMAP
**A Complete, Build-Ready Implementation Plan**

**Project**: Khan Bhai S. Hotel · Restaurant · Travel Agency  
**Location**: Haldwani, Golapar  
**Build Duration**: 7-8 days  
**Status**: ✅ Ready to build (awaiting design + client confirmations)

---

## 📋 QUICK START — What You Need Right Now

### Before Development Starts
1. **Client confirmations** (21 items) — see [Critical Prerequisites](#critical-prerequisites)
2. **Design files** (Figma/XD) — When ready, we start Phase 0
3. **Environment setup** — 5 minutes of terminal commands

### The Moment You Say "Go"
- Day 1: Foundation (Next.js, database, auth) → nothing visible
- Days 1-2: Layout shell (navbar, footer, hero) → first thing client sees
- Days 2-3: All 3 service pages → Stay, Restaurant, Travel sections
- Days 3-4: Database seeding & API routes → backend ready
- Days 4-5: Payment integration (Razorpay) → checkout working
- Day 5: Notifications (Email + WhatsApp) → confirmation emails firing
- Days 6-7: Admin dashboard → owner can view bookings
- Days 7-8: Polish, QA, deployment → live on Vercel

---

## 🎯 PROJECT OVERVIEW

### What We're Building
A luxury **Hotel + Restaurant + Travel Agency** website with:
- **Public website** (7 pages) — Browse rooms, tours, restaurant info
- **Booking system** — Checkout with Razorpay payment
- **Admin dashboard** (6 pages) — Owner manages bookings, inquiries
- **Notification system** — Email & WhatsApp alerts on every booking

### Tech Stack (15 Technologies)
| Layer | Technology | Why This |
|-------|-----------|----------|
| **Framework** | Next.js 14 (App Router) | SEO, SSR, serverless API, Vercel-native |
| **Styling** | Tailwind CSS + custom gold tokens | Rapid black-gold design system |
| **Animation** | Framer Motion | Silky scroll animations, entrance effects |
| **Database** | PostgreSQL (Supabase) | Free tier, row-level security |
| **ORM** | Prisma ORM | Type-safe queries, auto-migrations |
| **Auth** | NextAuth.js + JWT | Admin-only login, secure sessions |
| **Payments** | Razorpay SDK | India's #1, UPI + cards + netbanking |
| **Email** | Nodemailer + Gmail SMTP | Free, sends booking alerts |
| **WhatsApp** | WhatsApp Click-to-chat | Zero cost, no API needed for V1 |
| **Hosting** | Vercel (free) | 1-click deploy, auto HTTPS, CDN |
| **Fonts** | Playfair Display + Poppins | Royal feel + clean readability |
| **Icons** | Lucide React | Consistent, lightweight, tree-shakeable |
| **Images** | Next/Image + Unsplash | Auto-optimized, lazy-loaded, WebP |
| **Forms** | React Hook Form + Zod | Type-safe validation, great UX |
| **Env Secrets** | .env.local + Vercel Env | Keys hidden, never committed |

---

## ⚠️ CRITICAL PREREQUISITES

**These items MUST be confirmed before Phase 0 starts.** Development is blocked until we have them.

### 1. Pricing Confirmations
- [ ] **Standard Room** — ₹1,200/night (confirm or change)
- [ ] **Deluxe Room** — ₹2,000/night (confirm or change)
- [ ] **Premium Suite** — ₹3,500/night (confirm or change)
- [ ] **Family Room** — ₹2,800/night (confirm or change)

**Tour packages:**
- [ ] **Nainital Weekend** (2D/1N) — ₹4,500/person (confirm or change)
- [ ] **Jim Corbett Safari** (3D/2N) — ₹8,000/person (confirm or change)
- [ ] **Kedarnath Yatra** (4D/3N) — ₹12,000/person (confirm or change)
- [ ] **Nainital + Bhimtal Combo** (3D/2N) — ₹6,500/person (confirm or change)

### 2. Contact Information
- [ ] **Owner WhatsApp Number** — Format: +91XXXXXXXXXX (10 digits)
  - Used for: Booking alerts, customer WhatsApp links
- [ ] **Owner Email Address** — Primary email for notifications
  - Used for: Booking alerts, admin login
- [ ] **Gmail Account** (for sending emails)
  - Option A: Use owner's Gmail + generate App Password
  - Option B: Create dedicated account (khanbhais.bookings@gmail.com)

### 3. Payment Gateway Setup
- [ ] **Razorpay Account Created**
- [ ] **Test API Keys Ready**
  - Key ID: `rzp_test_xxxxxx`
  - Key Secret: `rzp_test_xxxxxx`
- [ ] **Plan for Live Keys** (after KYC)

### 4. Domain & Timezone
- [ ] **Domain Name** (e.g., khanbhais.in)
  - OR approve launching on `khanbhais.vercel.app` first
- [ ] **Timezone** — IST (Indian Standard Time, UTC+5:30) ✓ Confirmed

### 5. Branding Assets
- [ ] **Logo file** (SVG or high-res PNG, transparent background)
- [ ] **Color approval** — Primary gold #C9A84C (approved or alternate hex code)
- [ ] **Font approval** — Playfair Display (headings) + Poppins (body) ✓

### 6. Content Items
- [ ] **Brand story** (2-3 paragraphs for home page)
- [ ] **Restaurant hours** (Mon-Fri, Sat, Sun)
- [ ] **Hotel amenities list** (WiFi, AC, Pool, Parking, etc.)
- [ ] **Tour itineraries** (day-by-day for all 4 tours)
- [ ] **Tour inclusions** (what's included: meals, transport, guide, etc.)

### 7. Photos (Optional for V1, Use Stock Photos)
- [ ] **Restaurant interior** (or approve Unsplash stock)
- [ ] **Room photos** (or approve Unsplash stock)
- [ ] **Exterior/landscape** (or approve Unsplash stock)

---

## 🗄️ DATABASE SCHEMA (6 Tables)

### Table 1: `bookings` — Every reservation
```
id (UUID PK)
booking_type (ENUM: 'room' | 'tour')
customer_name (VARCHAR)
customer_phone (VARCHAR) — WhatsApp number
customer_email (VARCHAR)
check_in (DATE)
check_out (DATE)
guests (INT)
amount (DECIMAL)
status (ENUM: 'pending' | 'paid' | 'cancelled' | 'confirmed')
payment_id (VARCHAR FK → payments.razorpay_payment_id)
room_id (UUID FK → rooms.id, null for tours)
tour_id (UUID FK → tours.id, null for rooms)
created_at (TIMESTAMP)
```

### Table 2: `payments` — Razorpay transaction log
```
id (UUID PK)
booking_id (UUID FK → bookings.id)
razorpay_order_id (VARCHAR) — order_xxxxxxxx
razorpay_payment_id (VARCHAR) — pay_xxxxxxxx
razorpay_signature (VARCHAR) — HMAC-SHA256 signature (verified)
amount (DECIMAL)
currency (VARCHAR) — Always 'INR'
status (ENUM: 'created' | 'authorized' | 'captured' | 'failed')
method (VARCHAR) — 'upi' | 'card' | 'netbanking' | 'wallet'
created_at (TIMESTAMP)
```

### Table 3: `rooms` — Available room types
```
id (UUID PK)
name (VARCHAR) — e.g., "Standard Room"
description (TEXT)
price_per_night (DECIMAL)
capacity (INT) — Max guests
amenities (JSON) — Array of strings
images (JSON) — Array of image URLs
available (BOOL) — Toggle on/off
```

### Table 4: `tours` — Tour packages
```
id (UUID PK)
title (VARCHAR) — e.g., "Nainital Weekend"
destination (VARCHAR) — e.g., "Nainital"
duration_days (INT)
price_per_person (DECIMAL)
includes (JSON) — Array of inclusions
images (JSON) — Gallery images
itinerary (JSON) — Day-by-day array
available (BOOL)
```

### Table 5: `admins` — Owner/staff login
```
id (UUID PK)
email (VARCHAR UNIQUE)
password_hash (VARCHAR) — bcrypt hashed
name (VARCHAR)
role (ENUM: 'superadmin' | 'staff')
last_login (TIMESTAMP)
```

### Table 6: `contact_inquiries` — Contact form submissions
```
id (UUID PK)
name (VARCHAR)
email (VARCHAR)
phone (VARCHAR)
message (TEXT)
type (ENUM: 'room' | 'tour' | 'general')
read (BOOL) — Admin has read it
created_at (TIMESTAMP)
```

---

## 🌐 ALL PAGES & ROUTES (13 Pages)

### PUBLIC PAGES (No Auth Required)

#### 1. **Home / Landing Page** — Route: `/`
**Sections (top to bottom):**
- Sticky navbar with logo
- Full-screen hero with video/image bg
- Three service cards (Stay / Eat / Travel)
- Why Choose Us — 4 USP icons
- Testimonials/reviews strip
- Instagram-style photo gallery
- CTA banner "Book Now"
- Footer with contact + map

**Animations:**
- Hero text fades in with gold shimmer
- Cards lift on hover with gold border glow
- Scroll-triggered section reveals
- Parallax on hero background
- Floating WhatsApp button

---

#### 2. **Restaurant Page** — Route: `/restaurant`
**Sections:**
- Atmospheric hero (interior photo)
- Our Story (about the restaurant)
- Signature Dishes grid (image, name, price, description)
- Full menu categories (Starters, Mains, Desserts)
- Restaurant gallery (masonry layout)
- Opening hours + location
- Reserve a Table CTA (WhatsApp link)

**Design Notes:**
- Dark moody hero with warm lighting
- Dish cards: image top, name, price, description
- Gold dividers between menu sections
- No online ordering in V1 (informational only)

---

#### 3. **Rooms & Stay Page** — Route: `/stay`
**Sections:**
- Hero: "Stay With Us" with room panorama
- Filters: room type, guests, price range
- Room cards grid (3 per row on desktop)
- Each card: image slider, name, amenities, price/night
- Room detail modal on click
- Amenities section (icons for pool, AC, WiFi, etc.)
- "Book Now" button → `/checkout?type=room`

**Room Types (V1 Placeholder):**
- Standard Room — ₹1,200/night
- Deluxe Room — ₹2,000/night
- Premium Suite — ₹3,500/night
- Family Room — ₹2,800/night

---

#### 4. **Travel & Tours Page** — Route: `/travel`
**Sections:**
- Hero: mountain landscape (Uttarakhand)
- Featured destinations (Nainital, Jim Corbett, Kedarnath)
- Tour package cards with itinerary preview
- Inclusions list (meals, transport, guide)
- "Book Now" button → `/checkout?type=tour`
- Custom tour inquiry form
- Why Travel With Us — trust badges

**Tour Packages (V1 Placeholder):**
- Nainital Weekend — 2D/1N ₹4,500/person
- Jim Corbett Safari — 3D/2N ₹8,000/person
- Kedarnath Yatra — 4D/3N ₹12,000/person
- Nainital + Bhimtal Combo — 3D/2N ₹6,500/person

---

#### 5. **Checkout & Booking Page** — Route: `/checkout?type=room|tour`
**Left Panel (Form):**
- Full Name (required)
- Mobile Number (WhatsApp)
- Email Address
- Booking type (auto-filled from URL)
- Check-in / Check-out date picker
- Number of guests
- Special requests (optional textarea)

**Right Panel (Summary & Payment):**
- Order summary with line items
- Taxes (GST 12%)
- Total in INR
- "Pay with Razorpay" gold button
- UPI logo, Visa, Mastercard badges
- Security trust badge

**Payment Flow:**
1. Customer fills form
2. Clicks "Pay Now"
3. `/api/payment/create-order` creates Razorpay order
4. Razorpay popup opens (customer pays)
5. `/api/payment/verify` validates HMAC signature
6. Booking saved to DB, emails sent
7. Redirect to `/confirmation`

---

#### 6. **Booking Confirmation Page** — Route: `/confirmation`
**Content:**
- Animated checkmark (gold)
- Booking ID displayed prominently
- Booking summary (dates, guests, amount)
- "Email sent to your inbox" message
- WhatsApp chat button to owner
- Return to Home CTA

**Automatic Triggers:**
- Email to customer with booking details
- Email to owner: new booking alert
- WhatsApp notification to owner
- Booking saved to DB with status: paid

---

#### 7. **Contact Page** — Route: `/contact`
**Sections:**
- Contact form (name, email, phone, message, inquiry type)
- Contact info display (phone, email, hours)
- Location map (embedded Google Map)
- Direct WhatsApp CTA
- Direct call button

**Form Integration:**
- Saves to `contact_inquiries` table
- Admin can view in dashboard
- Auto-reply email to customer

---

### PROTECTED PAGES (Admin Only — Requires JWT Auth)

#### 8. **Admin Login Page** — Route: `/admin/login`
**Fields:**
- Email address
- Password
- Remember me (optional)
- "Forgot password?" link (V2 feature)

**Flow:**
- User enters credentials
- NextAuth verifies against DB (bcrypt compare)
- JWT issued in HttpOnly cookie (24hr expiry)
- Redirect to `/admin/dashboard`

**Security:**
- Password hashed with bcrypt
- JWT verified via NEXTAUTH_SECRET
- HttpOnly cookie (can't be accessed by JS)
- All /admin/* routes protected by middleware

---

#### 9. **Admin Dashboard** — Route: `/admin/dashboard`
**Overview Section:**
- Total bookings this month (card)
- Total revenue this month (card)
- Pending vs confirmed count (card)
- New inquiries unread count (card)

**Quick Actions:**
- View all bookings (link to bookings table)
- Mark booking as confirmed (bulk action)
- View contact inquiries (link)
- Edit room/tour prices (link)
- Logout button

---

#### 10. **Admin Bookings Table** — Route: `/admin/bookings`
**Table Columns:**
- Booking ID
- Customer Name
- Booking Type (room/tour)
- Check-in / Check-out
- Amount
- Status (badge)
- Created At
- Actions (view, confirm, cancel)

**Filters:**
- Status (pending, paid, cancelled, confirmed)
- Booking type (room, tour)
- Date range (from/to)

**Actions:**
- Click row to view booking details
- Mark as confirmed
- Mark as cancelled
- Download booking PDF (V2)

---

#### 11. **Admin Rooms Management** — Route: `/admin/rooms`
**Table Columns:**
- Room Name
- Price/Night
- Capacity
- Amenities
- Images (count)
- Available (toggle)
- Actions (edit, delete)

**Edit Room Modal:**
- Name, description, price, capacity
- Amenities (checkboxes)
- Image URLs (text area)
- Available toggle
- Save button

---

#### 12. **Admin Tours Management** — Route: `/admin/tours`
**Table Columns:**
- Tour Title
- Destination
- Duration
- Price/Person
- Itinerary (preview)
- Available (toggle)
- Actions (edit, delete)

**Edit Tour Modal:**
- Title, destination, duration
- Price, includes, images
- Itinerary (JSON editor or form)
- Save button

---

#### 13. **Admin Contact Inquiries** — Route: `/admin/inquiries`
**Table Columns:**
- Sender Name
- Email
- Phone
- Inquiry Type (room/tour/general)
- Message (preview)
- Read Status (checkbox)
- Created At
- Actions (view full, delete)

**View Modal:**
- Full inquiry details
- Reply via WhatsApp button
- Mark as read/unread
- Delete button

---

## 🔐 AUTH & SECURITY SYSTEM

### Authentication Flow
```
Admin visits /admin/login
  ↓
Enters email + password
  ↓
NextAuth.js handler receives request
  ↓
bcrypt.compare(password, stored_hash) ← secure comparison
  ↓
Password matches? YES → Generate JWT
  ↓
JWT stored in HttpOnly cookie (24hr expiry)
  ↓
Middleware on /admin/* routes verifies JWT
  ↓
If valid → Allow access
If expired/invalid → Redirect to /admin/login
```

### Public Routes (No Auth)
- `/` — Home
- `/restaurant` — Restaurant page
- `/stay` — Rooms page
- `/travel` — Tours page
- `/checkout` — Booking form
- `/confirmation` — Confirmation page
- `/contact` — Contact page
- `/api/bookings` (POST only) — Create booking
- `/api/payment/*` (POST + webhook) — Payment endpoints
- `/api/rooms` (GET) — List rooms
- `/api/tours` (GET) — List tours
- `/api/contact_inquiries` (POST) — Submit contact form

### Protected Routes (Admin Only)
- `/admin/login` — Auth page
- `/admin/dashboard` — Overview
- `/admin/bookings` — All bookings
- `/admin/rooms` — Manage rooms
- `/admin/tours` — Manage tours
- `/admin/inquiries` — Contact inquiries
- `/api/admin/*` — All admin APIs

### Middleware Guard
```typescript
// middleware.ts
if (request.nextUrl.pathname.startsWith('/admin')) {
  const token = request.cookies.get('next-auth.session-token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  
  try {
    verify(token.value, process.env.NEXTAUTH_SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}
```

---

## 💳 PAYMENT & SECURITY SYSTEM

### Razorpay Integration

#### Step 1: Create Order (Client → Server)
```
User clicks "Pay Now" on checkout page
  ↓
POST /api/payment/create-order
{
  amount: 250000,
  booking_type: "room",
  customer_name: "John Doe",
  customer_email: "john@example.com",
  customer_phone: "9876543210"
}
  ↓
Server creates Razorpay order
  ↓
Returns: { order_id: "order_2Ey7YI0JF7YUS3", ... }
```

#### Step 2: Payment Popup (Razorpay Hosted)
```
Razorpay popup opens with customer's order_id
  ↓
Customer chooses payment method:
- UPI (fastest for India)
- Credit/debit card
- Netbanking
- Wallet (Paytm, PhonePe, etc.)
  ↓
Customer completes payment
  ↓
Razorpay returns: payment_id + signature
```

#### Step 3: Verify Signature (Server-Side CRITICAL)
```
Server receives:
- razorpay_order_id
- razorpay_payment_id
- razorpay_signature

Server computes HMAC-SHA256:
hash = HMAC-SHA256(
  order_id + "|" + payment_id,
  RAZORPAY_KEY_SECRET
)

if (hash === razorpay_signature) {
  ✅ Payment is GENUINE → confirm booking
} else {
  ❌ FRAUD ATTEMPT → reject, log, do NOT confirm
}
```

### Why This Is Secure
1. **No card data on our server** — Razorpay handles PCI DSS compliance
2. **HMAC verification** — Prevents tampering with payment data
3. **Server-side verification** — Client can't fake a payment (we verify on backend)
4. **Rate limiting** — Max 10 payment creates per IP per hour (Vercel edge middleware)
5. **HTTPS enforced** — Vercel auto-provisions SSL, all traffic encrypted
6. **Input validation** — Zod schemas validate before any DB write

### Security Checklist
- [ ] RAZORPAY_KEY_ID in .env (never exposed to client)
- [ ] RAZORPAY_KEY_SECRET in .env (never exposed to client)
- [ ] NEXTAUTH_SECRET in .env (JWT signing key)
- [ ] No secrets committed to Git (.gitignore includes .env.local)
- [ ] HMAC verification on every payment
- [ ] Rate limiting on payment endpoints
- [ ] Input sanitization (Zod validation)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (React auto-escapes, Tailwind classes)
- [ ] CSRF protection (NextAuth handles)

---

## 🎨 DESIGN SYSTEM

### Color Palette
```
Primary Background:  #0D0D0D  (deep black)
Secondary BG:        #1A1A1A  (card/section bg)
Primary Gold:        #C9A84C  (buttons, accents)
Light Gold:          #E8D5A3  (headings, highlights)
Dark Gold:           #8B6914  (borders, dividers)
Body Text:           #F5F5F0  (warm white)
```

### Typography
**Playfair Display** (serif)
- Used for: all headings, hero text, section titles, prices
- Royal, premium feel — matches luxury hotel/restaurant vibe
- Import from Google Fonts

**Poppins** (sans-serif)
- Used for: body copy, descriptions, nav links, form labels
- Clean and modern, great readability on dark backgrounds
- Import from Google Fonts

**Type Scale:**
- Hero: 56px
- H1: 40px
- H2: 32px
- H3: 24px
- Body: 16px
- Small: 14px
- Caption: 12px

### Components

#### Buttons
```
Primary (Full)
  Background: #C9A84C
  Text: #0D0D0D
  Padding: 12px 24px
  Border-radius: 8px
  Hover: Background darker, shadow
  Example: "Book Now", "Pay with Razorpay"

Secondary (Outline)
  Background: transparent
  Border: 1px #C9A84C
  Text: #C9A84C
  Hover: Background #C9A84C, text dark
  Example: "Learn More", "View Details"

Ghost (Minimal)
  Background: #1A1A1A
  Border: 0.5px rgba(gold, 0.3)
  Text: #E8D5A3
  Example: "View Details", "Explore"
```

#### Cards
```
Background: #1A1A1A
Border: 0.5px rgba(#C9A84C, 0.25)
Border-radius: 16px
Padding: 24px
Hover: translateY(-4px) + gold border glow
Shadow: 0 8px 32px rgba(#C9A84C, 0.1)
Used for: room cards, tour cards, feature cards
```

#### Navbar
```
Position: Fixed
Background: rgba(#0D0D0D, 0.95) with backdrop blur
Logo: Left
Nav Links: Center (Stay · Restaurant · Travel · Contact)
CTA Button: Right (Book Now)
Mobile: Hamburger menu with slide-down drawer
Active Link: Gold underline
```

### Animations (Framer Motion)
- Fade-in on scroll
- Gold shimmer on hero headline
- Card hover lift + border glow
- Parallax hero background
- Stagger reveal for card grids
- Smooth page transitions
- **No heavy 3D or particles** (clean, luxury feel)

---

## 🛠️ 8-PHASE BUILD PLAN (7-8 Days)

### Phase 0 — Foundation (Day 1)
**Duration**: 4-5 hours  
**Output**: Nothing visible yet — pure setup

**Tasks:**
- [ ] Initialize Next.js 14 project (App Router)
- [ ] Set up Tailwind CSS + custom gold token config
- [ ] Import Playfair Display + Poppins fonts
- [ ] Create global CSS with color variables
- [ ] Initialize Prisma ORM
- [ ] Connect to Supabase PostgreSQL database
- [ ] Create .env.local with all secrets
- [ ] Set up folder structure (/app, /components, /lib, /api, /prisma)
- [ ] Initialize git repository + .gitignore
- [ ] Commit: "feat: project foundation"

**Env Variables to Set Up:**
```
DATABASE_URL=postgresql://user:password@host/db
NEXTAUTH_SECRET=generated-secret-key
NEXTAUTH_URL=http://localhost:3000
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=rzp_test_xxxxx
GMAIL_EMAIL=khanbhais.bookings@gmail.com
GMAIL_PASSWORD=app-password-from-google
OWNER_WHATSAPP=+91XXXXXXXXXX
OWNER_EMAIL=owner@khanbhais.com
```

---

### Phase 1 — Layout Shell (Days 1-2)
**Duration**: 1-1.5 days  
**Output**: First thing client sees in browser (navbar, footer, hero)

**Tasks:**
- [ ] Build Navbar component (fixed, sticky)
  - Logo on left
  - Nav links center (Stay, Restaurant, Travel, Contact)
  - Book Now button right
  - Mobile hamburger menu
- [ ] Build Footer component
  - Logo + brand story
  - Quick links
  - Contact info (phone, email)
  - Social links
  - Copyright
- [ ] Build Hero section
  - Full-screen with background image/video
  - Hero headline + subheading
  - CTA buttons
  - Framer Motion fade-in animation
  - Parallax effect on scroll
- [ ] Create page routing structure
  - `/` layout
  - `/restaurant`, `/stay`, `/travel`, `/contact` (placeholder pages)
  - `/checkout` (placeholder)
  - `/confirmation` (placeholder)
- [ ] Mobile responsive testing
- [ ] Install Framer Motion
- [ ] Commit: "feat: layout shell + navbar/footer"

---

### Phase 2 — All 3 Service Sections (Days 2-3)
**Duration**: 1-1.5 days  
**Output**: Three fully built public pages with dummy content

#### 2A: Restaurant Page (`/restaurant`)
- [ ] Hero section (atmospheric restaurant image)
- [ ] Our Story section (text + image)
- [ ] Signature Dishes grid (6-8 cards with image, name, price, description)
- [ ] Menu categories display (Starters, Mains, Desserts, Beverages)
- [ ] Restaurant gallery (masonry layout, 12+ images)
- [ ] Hours & location section
- [ ] Reserve Table CTA (WhatsApp link button)
- [ ] Scroll animations on gallery
- [ ] Commit: "feat: restaurant page"

#### 2B: Rooms & Stay Page (`/stay`)
- [ ] Hero section (room panorama)
- [ ] Filter bar (room type, guests, price range dropdowns)
- [ ] Room cards grid (3 per row on desktop)
  - Image carousel/slider
  - Room name, price/night, capacity
  - Amenities icons (WiFi, AC, Pool, Parking, etc.)
  - Book Now button
- [ ] Room detail modal (on card click)
  - Full description
  - All amenities listed
  - Image gallery
  - Price breakdown
  - Book button
- [ ] Scroll animations
- [ ] Mobile: 1 room per row
- [ ] Commit: "feat: stay & rooms page"

#### 2C: Travel & Tours Page (`/travel`)
- [ ] Hero section (Himalayan landscape)
- [ ] Featured destinations section (3 cards: Nainital, Jim Corbett, Kedarnath)
- [ ] Tour packages grid (4 cards)
  - Destination, duration, price/person
  - Itinerary preview
  - Inclusions list
  - Book Now button
- [ ] Tour detail modal (on card click)
  - Full itinerary (day-by-day)
  - All inclusions
  - Price details
  - Image gallery
  - Custom inquiry form
- [ ] Why travel with us section (trust badges)
- [ ] Scroll animations
- [ ] Commit: "feat: travel & tours page"

---

### Phase 3 — Database & API (Days 3-4)
**Duration**: 1-1.5 days  
**Output**: Database schema created, API routes working, dummy data seeded

**Tasks:**
- [ ] Create Prisma schema.prisma
  - Define all 6 tables (bookings, payments, rooms, tours, admins, contact_inquiries)
  - Define all relationships (FKs, one-to-many, etc.)
  - Add indexes on frequently queried fields
- [ ] Run Prisma migration
  - `npx prisma migrate dev --name init`
  - Creates tables in PostgreSQL
- [ ] Create Prisma seed script (seed.ts)
  - Seed 4 room types with placeholder prices
  - Seed 4 tour packages with placeholder prices
  - Seed 1 admin user (owner)
- [ ] Run seed: `npx prisma db seed`
- [ ] Create API routes
  - [ ] GET `/api/rooms` — fetch all available rooms
  - [ ] GET `/api/tours` — fetch all available tours
  - [ ] GET `/api/bookings/:id` — fetch booking details (public)
  - [ ] POST `/api/bookings` — create a booking (only saves to DB, status='pending')
  - [ ] POST `/api/contact_inquiries` — submit contact form
- [ ] Test all API endpoints with Postman/Thunder Client
- [ ] Commit: "feat: database schema + API routes"

**API Endpoints Created:**
```
GET  /api/rooms              → List all rooms
GET  /api/tours              → List all tours
GET  /api/bookings/:id       → Get booking by ID
POST /api/bookings           → Create booking (status='pending')
POST /api/contact_inquiries  → Submit contact form
```

---

### Phase 4 — Checkout & Razorpay (Days 4-5)
**Duration**: 1.5-2 days  
**Output**: Full booking flow working, Razorpay test mode payments working

**Tasks:**
- [ ] Build Checkout page (`/checkout`)
  - Form fields: name, email, phone, check-in/out, guests, special requests
  - Form validation (Zod schema)
  - Price summary panel (right side)
  - Order breakdown (room/tour price, guests, GST 12%, total)
  - "Pay with Razorpay" button
  - UPI, Visa, Mastercard badges
  - Security badge
- [ ] Integrate Razorpay SDK
  - `npm install razorpay`
  - Import Razorpay script in _document or use dynamic import
- [ ] Create payment API routes
  - [ ] POST `/api/payment/create-order`
    - Validate amount, customer info
    - Call Razorpay create order
    - Return order_id, amount, currency
    - Rate limit: max 10/hr per IP
  - [ ] POST `/api/payment/verify`
    - Receive: order_id, payment_id, signature
    - Verify HMAC-SHA256: hash = HMAC(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
    - If hash === signature → Payment genuine
    - Update booking status: 'pending' → 'paid'
    - Save payment record to DB
    - Return success response
    - Side effects: email + WhatsApp (Phase 5)
- [ ] Connect checkout form to Razorpay popup
  - Form submit → call `/api/payment/create-order`
  - Open Razorpay popup with order_id
  - On success → call `/api/payment/verify`
  - On verify success → redirect to `/confirmation`
- [ ] Test payments with Razorpay test cards
  - Test UPI, credit card, netbanking
  - Verify HMAC verification catches forged payments
- [ ] Commit: "feat: checkout + razorpay payment"

**Test Payment Details (Razorpay):**
```
Card: 4111 1111 1111 1111
Expiry: 12/25
CVV: 123
(All test card transactions will succeed)
```

---

### Phase 5 — Notifications (Day 5)
**Duration**: 1 day  
**Output**: Owner receives booking alerts, customers get confirmation emails

**Tasks:**
- [ ] Install Nodemailer
  - `npm install nodemailer`
- [ ] Create email service (lib/emailService.ts)
  - Function: sendBookingConfirmation(to, booking details)
  - Function: sendOwnerAlert(to, booking details)
  - Templates: HTML email with booking info
- [ ] Create WhatsApp notification helper
  - WhatsApp Click-to-chat URL: `https://wa.me/OWNER_NUMBER?text=Booking+ID+...`
  - Display WhatsApp button on confirmation page
- [ ] Modify `/api/payment/verify` to trigger emails
  - On successful payment:
    1. Send email to customer (confirmation)
    2. Send email to owner (booking alert)
    3. Send WhatsApp message to owner (click-to-chat link)
- [ ] Create Confirmation page (`/confirmation`)
  - Show animated checkmark (gold)
  - Display booking ID
  - Show booking summary (dates, guests, amount)
  - "Email sent to your inbox" message
  - WhatsApp chat button
  - Return home button
  - "Owner will contact you shortly" message
- [ ] Test email delivery
  - Make test payment
  - Verify emails arrive in inbox
- [ ] Commit: "feat: email + whatsapp notifications"

---

### Phase 6 — Admin Panel (Days 6-7)
**Duration**: 1.5-2 days  
**Output**: Owner can log in and manage bookings

**Tasks:**
- [ ] Install NextAuth.js
  - `npm install next-auth`
- [ ] Create Prisma schema for sessions/accounts (if using DB adapter)
  - Or use JWT strategy (simpler for this project)
- [ ] Create admin login page (`/admin/login`)
  - Email + password form
  - Form validation (Zod)
  - Submit → POST `/api/auth/login`
- [ ] Create admin auth API
  - [ ] POST `/api/auth/login`
    - Lookup user by email
    - Compare password: bcrypt.compare(input, stored_hash)
    - If match → create JWT
    - Store JWT in HttpOnly cookie (24hr expiry)
    - Return JWT + user info
    - If no match → return 401
  - [ ] POST `/api/auth/logout`
    - Clear HttpOnly cookie
    - Return success
- [ ] Create middleware protection
  - middleware.ts: intercept /admin/* routes
  - Read JWT from HttpOnly cookie
  - Verify signature with NEXTAUTH_SECRET
  - If invalid/expired → redirect to /admin/login
  - If valid → allow through
- [ ] Build Admin Dashboard (`/admin/dashboard`)
  - Metrics cards: total bookings, revenue, pending count, new inquiries
  - Recent bookings table (last 5)
  - Quick action buttons (view all bookings, manage rooms, view inquiries)
  - Logout button
- [ ] Build Admin Bookings page (`/admin/bookings`)
  - Full bookings table (all fields)
  - Filters: status, booking type, date range
  - Columns: ID, customer, type, check-in, amount, status, actions
  - Click row to view full details
  - Mark as confirmed button
  - Mark as cancelled button
  - Cancel booking modal (confirms cancellation)
- [ ] Build Admin Rooms page (`/admin/rooms`)
  - Table: name, price, capacity, amenities, available (toggle), actions
  - Edit room modal
  - Delete confirmation modal
- [ ] Build Admin Tours page (`/admin/tours`)
  - Table: title, destination, duration, price, available (toggle), actions
  - Edit tour modal
  - Delete confirmation modal
- [ ] Build Admin Contact Inquiries page (`/admin/inquiries`)
  - Table: name, email, type, message (preview), read status, actions
  - View full inquiry modal
  - Mark as read/unread
  - Delete button
- [ ] Admin users auth (create superadmin account in seed script)
  - Run seed to create owner account (email + hashed password)
- [ ] Test login/logout flow
- [ ] Test all protected routes
- [ ] Commit: "feat: admin panel + auth"

---

### Phase 7 — Polish & Deploy (Days 7-8)
**Duration**: 1-2 days  
**Output**: Live on Vercel

**Tasks:**
- [ ] SEO optimization
  - Add meta tags to all pages (title, description)
  - Create next.config.js with image optimization
  - Add Open Graph images
  - Create robots.txt
  - Create sitemap.xml
- [ ] Performance optimization
  - Optimize images (use Next/Image for all images)
  - Code splitting (dynamic imports for heavy components)
  - Lazy load heavy sections
  - Run Lighthouse audit
- [ ] Mobile testing
  - Test on iPhone, Android (Chrome DevTools mobile emulation)
  - Test all forms on mobile
  - Test navigation on mobile
  - Test payment flow on mobile
  - Test WhatsApp button on mobile
- [ ] Browser testing
  - Chrome, Firefox, Safari, Edge
  - Test form submissions
  - Test animations
  - Test payment flow
- [ ] Security checks
  - Verify .env secrets are not in git
  - Verify no hardcoded API keys
  - Run npm audit for vulnerabilities
  - Check HTTPS is enforced
- [ ] Deploy to Vercel
  - Connect GitHub repo to Vercel
  - Set environment variables in Vercel dashboard
  - Deploy main branch
  - Test live site
- [ ] Domain setup (if custom domain)
  - Add DNS records to domain registrar
  - Point to Vercel nameservers or CNAME
  - Verify domain works
  - Update NEXTAUTH_URL to custom domain
- [ ] Final QA
  - Test all pages load
  - Test all forms submit
  - Test all API endpoints
  - Test payment flow end-to-end
  - Test admin login/dashboard
  - Test email notifications
  - Test WhatsApp button
- [ ] Client handover
  - Share live URL
  - Provide admin login credentials
  - Document how to manage bookings
  - Document how to reset admin password (V2)
- [ ] Commit: "feat: production build + deployment"

---

## 🚀 IMMEDIATE NEXT STEPS

### Right Now (Today)
1. **Share this roadmap** with client
2. **Request confirmations** using the CLIENT_CONFIRMATIONS_CHECKLIST.md
   - Pricing (rooms + tours)
   - Contact info (WhatsApp, email, Gmail SMTP)
   - Razorpay account creation
   - Domain preference
   - Branding assets (logo, colors, fonts)
   - Content (brand story, amenities, itineraries)

### When Client Confirms Everything
1. **Send design files** (Figma/XD with mockups of pages)
2. **We'll start Phase 0**
3. **Daily progress updates** (end of each day)

### Environment Setup (5 minutes)
```bash
# Create Supabase account & database
1. Go to supabase.com
2. Create new project
3. Copy DATABASE_URL to .env.local

# Create Razorpay account
1. Go to razorpay.com
2. Sign up, get test API keys
3. Copy to .env.local

# Create Gmail App Password (if using owner's Gmail)
1. Go to myaccount.google.com/apppasswords
2. Generate app password for "Mail"
3. Copy to .env.local as GMAIL_PASSWORD

# Initialize repo
git init
npm install next@14 react@19 tailwind@latest prisma @prisma/client next-auth razorpay react-hook-form zod framer-motion nodemailer lucide-react
```

---

## 📊 PROJECT METRICS

| Metric | Value |
|--------|-------|
| **Total Pages** | 13 (7 public + 6 admin) |
| **Database Tables** | 6 |
| **API Endpoints** | 8 public + 6 admin = 14 |
| **Build Duration** | 7-8 days |
| **Tech Dependencies** | 15 |
| **Design Colors** | 5 (gold palette) |
| **Fonts** | 2 (Playfair + Poppins) |
| **Build Phases** | 8 (0-7) |
| **Client Confirmations** | 21 items |
| **Security Checklist** | 10 items |

---

## ✅ FINAL CHECKLIST BEFORE PHASE 0

### Client Confirmations
- [ ] All 21 items in CLIENT_CONFIRMATIONS_CHECKLIST.md completed
- [ ] Razorpay test API keys provided
- [ ] Gmail SMTP credentials provided
- [ ] Owner WhatsApp number provided
- [ ] Owner email provided

### Design Assets
- [ ] Logo file (SVG or high-res PNG)
- [ ] Figma/XD mockups of all pages (or approval to build from spec)
- [ ] All images (or approval to use Unsplash stock)

### Developer Setup
- [ ] Node.js 18+ installed
- [ ] PostgreSQL/Supabase account ready
- [ ] GitHub repo created
- [ ] .env.local file created with all secrets

### Go/No-Go
- [ ] **GO** — All above items ✅ → Start Phase 0 immediately
- [ ] **NO-GO** — Missing items → Request from client

---

**Last Updated**: 2026-05-01  
**Status**: 🟢 Ready to build (awaiting design + confirmations)  
**Build Timeline**: 7-8 days from confirmations  
**Next Milestone**: Client confirmation submission + design files

