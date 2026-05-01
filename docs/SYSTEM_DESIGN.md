# Khan Bhai S. — Comprehensive System Design Document

**Project**: Khan Bhai S. - Luxury Hotel, Restaurant & Travel Experience
**Version**: 1.0
**Date**: May 1, 2026
**Status**: Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [User Journeys](#user-journeys)
3. [Data Flow Diagram](#data-flow-diagram)
4. [Component Hierarchy](#component-hierarchy)
5. [Service Architecture](#service-architecture)
6. [Integration Points](#integration-points)
7. [State Management Strategy](#state-management-strategy)
8. [Authentication & Authorization](#authentication--authorization)
9. [Error Handling Strategy](#error-handling-strategy)
10. [Performance Considerations](#performance-considerations)
11. [Security Architecture](#security-architecture)
12. [Deployment Model](#deployment-model)

---

## System Overview

### What is Khan Bhai S.?

Khan Bhai S. is a full-stack luxury hospitality platform serving three core business verticals:

1. **Hotel Stays** - Premium room bookings with real-time availability
2. **Restaurant** - Fine dining experiences with reservations
3. **Travel Packages** - Curated tours and travel experiences

The platform enables customers to browse offerings, make reservations, process secure payments, and receive confirmation notifications. Admin users manage bookings, respond to inquiries, and oversee operations.

### Key Features

| Feature | Target Users | Status |
|---------|--------------|--------|
| Browse & Book Rooms | Guests | Core |
| Browse & Book Tours | Guests | Core |
| Secure Checkout | Guests | Core |
| Payment Processing | Guests | Core |
| Email Confirmations | Guests & Owners | Core |
| Admin Dashboard | Staff & Owners | Core |
| WhatsApp Integration | All Users | Secondary |
| Contact Form | Guests | Core |
| Restaurant Reservations | Guests | Core |

### User Roles & Permissions

```
┌─────────────────────────────────────────────────────────┐
│                    User Roles                           │
├─────────────────┬──────────────┬───────────────────────┤
│ Role            │ Access Level │ Capabilities          │
├─────────────────┼──────────────┼───────────────────────┤
│ Guest           │ Public       │ Browse, Book, Pay     │
│ Superadmin      │ Full         │ All admin features    │
│ Staff           │ Limited      │ View-only access      │
└─────────────────┴──────────────┴───────────────────────┘
```

---

## User Journeys

### Journey 1: Guest Booking a Room

```
┌──────────────────────────────────────────────────────────────┐
│ GUEST ROOM BOOKING JOURNEY                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. [Homepage]                                               │
│     ↓ Click "Explore Stays"                                  │
│  2. [Stay Page] - Browse Rooms                               │
│     ├─ GET /api/rooms (fetch all rooms)                      │
│     ├─ Display: Name, Price, Images, Amenities              │
│     ↓ Click on Room                                          │
│  3. [Room Details Modal]                                     │
│     ├─ View full description, pricing, calendar             │
│     ↓ Click "Book Now"                                       │
│  4. [Checkout Page]                                          │
│     ├─ Show Room Details                                     │
│     ├─ Form: Name, Email, Phone, Check-in, Check-out, Guests│
│     ├─ POST /api/bookings (create booking)                   │
│     ├─ Status: 'pending'                                     │
│     ↓ Click "Proceed to Payment"                             │
│  5. [Payment Modal - Razorpay]                               │
│     ├─ POST /api/payment/create-order (get order_id)         │
│     ├─ Initialize Razorpay Widget                            │
│     ├─ Guest enters card/UPI details                         │
│     ├─ Razorpay processes payment                            │
│     ↓ Payment Success                                        │
│  6. [Backend Processing]                                     │
│     ├─ POST /api/payment/verify (verify signature)           │
│     ├─ Update booking: 'pending' → 'paid'                    │
│     ├─ Create payment record                                 │
│     ├─ Send email to guest                                   │
│     ├─ Send email to owner                                   │
│     ├─ Send WhatsApp notification to owner                   │
│     ↓ Redirect                                               │
│  7. [Confirmation Page]                                      │
│     ├─ Show booking ID, dates, amount                        │
│     ├─ Option: "Chat on WhatsApp"                            │
│     ├─ Display: Next steps (check-in details, etc.)          │
│     ↓ Download/Print Confirmation                            │
│  8. [End]                                                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Data Flow**:
```
Guest Input → Booking Record → Payment Order → Payment Verification 
→ Status Update → Email Trigger → Database Save → Confirmation
```

**API Calls (Sequential)**:
1. `GET /api/rooms` - Fetch available rooms
2. `POST /api/bookings` - Create booking with 'pending' status
3. `POST /api/payment/create-order` - Get Razorpay order ID
4. `POST /api/payment/verify` - Verify payment signature and update booking
5. Email service triggered on payment verification

---

### Journey 2: Guest Booking a Tour

```
┌──────────────────────────────────────────────────────────────┐
│ GUEST TOUR BOOKING JOURNEY                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. [Homepage]                                               │
│     ↓ Click "Explore Tours"                                  │
│  2. [Travel Page] - Browse Tours                             │
│     ├─ GET /api/tours (fetch all tours)                      │
│     ├─ Display: Destination, Duration, Price, Images        │
│     ↓ Click on Tour                                          │
│  3. [Tour Details Modal]                                     │
│     ├─ View itinerary, includes, pricing                     │
│     ↓ Click "Book Tour"                                      │
│  4. [Checkout Page]                                          │
│     ├─ Show Tour Details                                     │
│     ├─ Form: Name, Email, Phone, Travel Date, Guests        │
│     ├─ POST /api/bookings (create booking for tour)          │
│     ├─ Status: 'pending'                                     │
│     ↓ Click "Proceed to Payment"                             │
│  5. [Payment Processing]                                     │
│     ├─ Same as room booking (steps 5-8)                      │
│     ↓                                                         │
│  6. [Confirmation]                                           │
│     ├─ Show booking ID, dates, amount                        │
│     ├─ Display: Pre-trip information                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

### Journey 3: Admin Managing Bookings

```
┌──────────────────────────────────────────────────────────────┐
│ ADMIN BOOKING MANAGEMENT JOURNEY                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. [Login Page]                                             │
│     ├─ Enter Email & Password                                │
│     ├─ POST /api/admin/login                                 │
│     ├─ Verify password with bcrypt                           │
│     ├─ Generate JWT token                                    │
│     ├─ Store in HttpOnly cookie                              │
│     ↓ Redirect to Dashboard                                  │
│  2. [Admin Dashboard]                                        │
│     ├─ GET /api/admin/bookings (fetch all bookings)          │
│     ├─ Display: Table with bookings, statuses                │
│     ├─ Filter: By status (pending, paid, confirmed)          │
│     ├─ Sort: By date, amount, customer name                  │
│     ↓ Click on Booking                                       │
│  3. [Booking Details Modal]                                  │
│     ├─ Show full booking information                         │
│     ├─ Customer contact details                              │
│     ├─ Payment status                                        │
│     ├─ Special requests                                      │
│     ↓ Click "Update Status"                                  │
│  4. [Status Update]                                          │
│     ├─ PATCH /api/admin/bookings/:id                         │
│     ├─ Allowed transitions:                                  │
│     │   pending/paid → confirmed                             │
│     │   pending/paid → cancelled                             │
│     ├─ Send updated email to guest                           │
│     ↓ Status updated                                         │
│  5. [Inquiries Management]                                   │
│     ├─ GET /api/admin/inquiries                              │
│     ├─ View contact form submissions                         │
│     ├─ Mark as read/unread                                   │
│     ↓ Respond via WhatsApp/Email                             │
│  6. [End Session]                                            │
│     ├─ Click Logout                                          │
│     ├─ Clear HttpOnly cookie                                 │
│     ↓ Redirect to Login                                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### High-Level System Architecture

```
                              ┌─────────────────┐
                              │   Guest Browser │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
            ┌───────▼────────┐                   ┌────────▼───────┐
            │  Next.js Pages │                   │  Admin Console │
            │ (SSR/Static)   │                   │  (Browser)     │
            └───────┬────────┘                   └────────┬───────┘
                    │                                     │
        ┌───────────┴─────────────────────────────────────┴──────────┐
        │                                                            │
    ┌───▼─────────────────────────────────────────────────────────┐ │
    │          NEXT.JS APPLICATION (Vercel)                       │ │
    ├──────────────────────────────────────────────────────────────┤ │
    │                                                              │ │
    │  ┌──────────────────────────────────────────────────────┐   │ │
    │  │  API Routes (/api)                                   │   │ │
    │  ├──────────────────────────────────────────────────────┤   │ │
    │  │  • POST /api/bookings (create booking)               │   │ │
    │  │  • GET /api/bookings/:id (fetch booking)             │   │ │
    │  │  • POST /api/payment/create-order (Razorpay)         │   │ │
    │  │  • POST /api/payment/verify (verify payment)         │   │ │
    │  │  • GET /api/rooms (list rooms)                       │   │ │
    │  │  • GET /api/tours (list tours)                       │   │ │
    │  │  • POST /api/admin/login (authenticate)              │   │ │
    │  │  • GET /api/admin/bookings (protected)               │   │ │
    │  │  • PATCH /api/admin/bookings/:id (update booking)    │   │ │
    │  │  • GET /api/admin/inquiries (protected)              │   │ │
    │  └──────────────────────────────────────────────────────┘   │ │
    │                          │                                   │ │
    │  ┌──────────────────────┴──────────────────────────────┐    │ │
    │  │  Services Layer                                     │    │ │
    │  ├──────────────────────────────────────────────────────┤    │ │
    │  │  • Prisma ORM (Database client)                      │    │ │
    │  │  • NextAuth (Session management)                     │    │ │
    │  │  • Razorpay Client (Payment gateway)                 │    │ │
    │  │  • Nodemailer (Email service)                        │    │ │
    │  │  • Zod Validation (Input validation)                 │    │ │
    │  └──────────────────────────────────────────────────────┘    │ │
    │                          │                                   │ │
    └──────────────────────────┼───────────────────────────────────┘ │
                               │                                      │
    ┌──────────────────────────┼─────────────────────────────────────┐
    │  External Services                                              │
    ├──────────────────────────┼─────────────────────────────────────┤
    │                          │                                      │
    │  ┌─────────────┐         │        ┌──────────────┐             │
    │  │ PostgreSQL  │◄────────┤        │  Gmail/SMTP  │             │
    │  │ (Supabase)  │         │        │  (Nodemailer)│             │
    │  └─────────────┘         │        └──────────────┘             │
    │                          │                                      │
    │  ┌──────────────────┐    │        ┌──────────────┐             │
    │  │ Razorpay API     │◄───┤        │  WhatsApp    │             │
    │  │ (Payment Gateway)│    │        │  (Links)     │             │
    │  └──────────────────┘    │        └──────────────┘             │
    │                          │                                      │
    └──────────────────────────┴─────────────────────────────────────┘
```

### Detailed Data Flow: Room Booking → Payment → Confirmation

```
┌──────────────────────────────────────────────────────────────────────┐
│                         COMPLETE DATA FLOW                            │
└──────────────────────────────────────────────────────────────────────┘

STEP 1: ROOM SELECTION (Frontend)
┌──────────────────────────────────────────────────────┐
│ Guest visits /stay → fetches rooms                   │
├──────────────────────────────────────────────────────┤
│ Browser                                               │
│  └─ GET /api/rooms                                   │
│      └─ Prisma query: findMany(rooms)                │
│          └─ SELECT * FROM rooms WHERE available=true │
│              └─ Returns: [{id, name, price, ...}]    │
│                  └─ Frontend renders room cards      │
└──────────────────────────────────────────────────────┘

STEP 2: BOOKING CREATION (Backend)
┌──────────────────────────────────────────────────────┐
│ Guest fills checkout form and submits                │
├──────────────────────────────────────────────────────┤
│ Browser                                               │
│  └─ POST /api/bookings                               │
│      ├─ Payload: {customer_name, email, phone,      │
│      │            check_in, check_out, guests,       │
│      │            room_id, special_requests}         │
│      │                                                │
│  └─ Next.js API Route (/api/bookings)                │
│      ├─ Validate input with Zod                      │
│      ├─ Prisma query: create(booking)                │
│      │   INSERT INTO bookings(...)                   │
│      │   VALUES(...)                                 │
│      │   status='pending'                            │
│      └─ Returns: {id, booking_id, amount, status}    │
│          └─ Frontend stores booking_id in state      │
└──────────────────────────────────────────────────────┘

STEP 3: PAYMENT ORDER CREATION (Backend)
┌──────────────────────────────────────────────────────┐
│ Guest clicks "Proceed to Payment"                    │
├──────────────────────────────────────────────────────┤
│ Browser                                               │
│  └─ POST /api/payment/create-order                   │
│      ├─ Payload: {amount, booking_id, customer_*}   │
│      │                                                │
│  └─ Next.js API Route                                │
│      ├─ Call Razorpay SDK                            │
│      │   razorpay.orders.create({                    │
│      │       amount_in_paise,                        │
│      │       currency: "INR",                        │
│      │       receipt: booking_id                     │
│      │   })                                           │
│      └─ Returns: {order_id, amount, currency}        │
│          └─ Frontend initializes Razorpay widget     │
└──────────────────────────────────────────────────────┘

STEP 4: PAYMENT PROCESSING (Razorpay)
┌──────────────────────────────────────────────────────┐
│ Guest enters payment details in Razorpay modal       │
├──────────────────────────────────────────────────────┤
│ Razorpay (External)                                  │
│  ├─ Process card/UPI/netbanking                      │
│  ├─ Generate payment_id                              │
│  ├─ Create HMAC-SHA256 signature                     │
│  └─ Return: {razorpay_payment_id,                    │
│             razorpay_signature,                      │
│             razorpay_order_id}                       │
└──────────────────────────────────────────────────────┘

STEP 5: PAYMENT VERIFICATION (Backend)
┌──────────────────────────────────────────────────────┐
│ Browser receives payment response                    │
├──────────────────────────────────────────────────────┤
│ Browser                                               │
│  └─ POST /api/payment/verify                         │
│      ├─ Payload: {razorpay_order_id,                │
│      │            razorpay_payment_id,               │
│      │            razorpay_signature,                │
│      │            booking_id}                        │
│      │                                                │
│  └─ Next.js API Route                                │
│      ├─ Verify HMAC signature:                       │
│      │   computed_hash = HMAC-SHA256(                │
│      │       order_id + "|" + payment_id,            │
│      │       RAZORPAY_SECRET                         │
│      │   )                                            │
│      │   if computed_hash !== received_signature     │
│      │       → fraud detected → reject               │
│      │                                                │
│      ├─ Update booking record:                       │
│      │   UPDATE bookings                             │
│      │   SET status='paid', payment_id=...           │
│      │   WHERE id=booking_id                         │
│      │                                                │
│      ├─ Create payment record:                       │
│      │   INSERT INTO payments(                       │
│      │       booking_id, razorpay_order_id,          │
│      │       razorpay_payment_id, amount, ...        │
│      │   )                                            │
│      │                                                │
│      └─ Returns: {success: true, booking_id}         │
│          └─ Frontend redirects to confirmation       │
└──────────────────────────────────────────────────────┘

STEP 6: NOTIFICATIONS (Async Services)
┌──────────────────────────────────────────────────────┐
│ After payment verification succeeds                  │
├──────────────────────────────────────────────────────┤
│ Backend Services (Triggered in API response)         │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ Email Service (Nodemailer)                   │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 1. Send confirmation email to guest          │   │
│  │    To: customer_email                        │   │
│  │    Subject: "Booking Confirmed!"             │   │
│  │    Template: booking_confirmation.html       │   │
│  │                                               │   │
│  │ 2. Send alert email to owner                 │   │
│  │    To: OWNER_EMAIL                           │   │
│  │    Subject: "New Booking: [Room] from [Name]"│   │
│  │    Template: owner_booking_alert.html        │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ WhatsApp Integration                         │   │
│  ├──────────────────────────────────────────────┤   │
│  │ Generate WhatsApp link:                      │   │
│  │ wa.me/[OWNER_PHONE]?text=[message]           │   │
│  │                                               │   │
│  │ Display on confirmation page:                │   │
│  │ "Chat with Owner" button                     │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘

STEP 7: CONFIRMATION PAGE (Frontend)
┌──────────────────────────────────────────────────────┐
│ Guest is redirected to /confirmation                 │
├──────────────────────────────────────────────────────┤
│ Frontend                                              │
│  ├─ GET /api/bookings/:id (fetch booking details)   │
│  │   └─ SELECT * FROM bookings WHERE id=...         │
│  │       └─ Returns full booking record              │
│  │                                                    │
│  ├─ Display:                                         │
│  │  ├─ Booking ID (reference number)                │
│  │  ├─ Room/Tour name                               │
│  │  ├─ Check-in/Check-out dates                     │
│  │  ├─ Total amount paid                            │
│  │  ├─ Next steps (24-hour notice)                  │
│  │  └─ WhatsApp contact button                      │
│  │                                                    │
│  └─ Options:                                         │
│     ├─ Download confirmation PDF                    │
│     ├─ Chat on WhatsApp                             │
│     └─ Return to home                               │
└──────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### Page Structure

```
app/
├── layout.tsx [Root Layout]
│   ├── <Header>
│   ├── {children}
│   └── <Footer>
│
├── page.tsx [Home Page /]
│   ├── <Hero>
│   ├── <FeaturedRooms>
│   ├── <FeaturedTours>
│   ├── <HowItWorks>
│   ├── <Testimonials>
│   └── <CallToAction>
│
├── stay/page.tsx [Rooms Page /stay]
│   ├── <PageHeader>
│   ├── <RoomFilters>
│   ├── <RoomGrid>
│   │   └── <RoomCard>
│   │       ├── <RoomImage>
│   │       ├── <RoomInfo>
│   │       └── <BookButton>
│   └── <BookingModal>
│       └── <CheckoutForm>
│
├── restaurant/page.tsx [Restaurant /restaurant]
│   ├── <PageHeader>
│   ├── <MenuSection>
│   │   └── <MenuItemCard>
│   ├── <ReservationForm>
│   └── <Ambiance>
│
├── travel/page.tsx [Tours Page /travel]
│   ├── <PageHeader>
│   ├── <TourFilters>
│   ├── <TourGrid>
│   │   └── <TourCard>
│   │       ├── <TourImage>
│   │       ├── <TourInfo>
│   │       └── <BookButton>
│   └── <BookingModal>
│       └── <CheckoutForm>
│
├── checkout/page.tsx [Checkout /checkout]
│   ├── <CheckoutHeader>
│   ├── <BookingSummary>
│   │   ├── <RoomDetails>
│   │   └── <PricingBreakdown>
│   ├── <CheckoutForm>
│   │   ├── <CustomerInfo>
│   │   ├── <SpecialRequests>
│   │   └── <PaymentMethod>
│   └── <PaymentWidget> [Razorpay]
│
├── confirmation/page.tsx [Confirmation /confirmation]
│   ├── <ConfirmationHeader>
│   ├── <BookingDetails>
│   │   ├── <BookingID>
│   │   ├── <RoomInfo>
│   │   ├── <Dates>
│   │   └── <Amount>
│   ├── <NextSteps>
│   ├── <ContactOptions>
│   └── <ActionButtons>
│
├── contact/page.tsx [Contact /contact]
│   ├── <PageHeader>
│   ├── <ContactForm>
│   │   ├── <NameInput>
│   │   ├── <EmailInput>
│   │   ├── <PhoneInput>
│   │   ├── <MessageInput>
│   │   └── <SubmitButton>
│   ├── <ContactInfo>
│   └── <MapEmbed>
│
└── admin/
    ├── layout.tsx [Admin Layout]
    │   ├── <AdminHeader>
    │   ├── <AdminSidebar>
    │   │   └── <NavLinks>
    │   └── {children}
    │
    ├── login/page.tsx [Admin Login /admin/login]
    │   ├── <LoginForm>
    │   │   ├── <EmailInput>
    │   │   ├── <PasswordInput>
    │   │   └── <LoginButton>
    │   └── <SecurityNotice>
    │
    ├── dashboard/page.tsx [Admin Dashboard /admin/dashboard]
    │   ├── <DashboardHeader>
    │   ├── <StatsCards>
    │   │   ├── <TotalBookings>
    │   │   ├── <PendingPayments>
    │   │   └── <RecentInquiries>
    │   └── <RecentBookingsPreview>
    │
    ├── bookings/page.tsx [Admin Bookings /admin/bookings]
    │   ├── <BookingsHeader>
    │   ├── <FilterBar>
    │   │   ├── <StatusFilter>
    │   │   ├── <DateFilter>
    │   │   └── <SearchBar>
    │   ├── <BookingsTable>
    │   │   ├── <TableHeader>
    │   │   ├── <TableRow> [per booking]
    │   │   │   └── <BookingDetailsModal>
    │   │   │       ├── <CustomerInfo>
    │   │   │       ├── <BookingInfo>
    │   │   │       ├── <PaymentInfo>
    │   │   │       ├── <StatusUpdate>
    │   │   │       └── <ContactActions>
    │   │   └── <Pagination>
    │   └── <ExportButton>
    │
    └── inquiries/page.tsx [Admin Inquiries /admin/inquiries]
        ├── <InquiriesHeader>
        ├── <InquiriesList>
        │   └── <InquiryCard> [per inquiry]
        │       ├── <InquiryDetails>
        │       ├── <ContactOptions>
        │       └── <MarkAsReadButton>
        └── <Pagination>
```

### Component Composition Example

**BookingForm Component** (Shared across multiple pages):
```
<BookingForm>
  ├── <InputField label="Name" />
  ├── <InputField label="Email" type="email" />
  ├── <InputField label="Phone" type="tel" />
  ├── <DatePicker label="Check-in" />
  ├── <DatePicker label="Check-out" />
  ├── <NumberInput label="Guests" min="1" max="10" />
  ├── <TextArea label="Special Requests" />
  └── <Button type="submit">Book Now</Button>
```

---

## Service Architecture

### Service Layer Organization

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes (Entry Points)                               │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  /api/bookings        /api/rooms      /api/admin/login   │   │
│  │  /api/payment/*       /api/tours      /api/admin/books   │   │
│  │  /api/contact                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────┴────────────────────────────────┐    │
│  │  Service Layer (Business Logic)                         │    │
│  ├────────────────────────┬────────────────────────────────┤    │
│  │                        │                                │    │
│  ▼                        ▼                                ▼    │
│ ┌─────────┐          ┌──────────┐                   ┌─────────┐ │
│ │ Booking │          │ Payment  │                   │ Auth    │ │
│ │ Service │          │ Service  │                   │ Service │ │
│ ├─────────┤          ├──────────┤                   ├─────────┤ │
│ │ Create  │          │ Create   │                   │ Login   │ │
│ │ Fetch   │          │ Verify   │                   │ Verify  │ │
│ │ Update  │          │ Process  │                   │ Session │ │
│ │ Delete  │          │ Webhook  │                   │ Logout  │ │
│ └─────────┘          └──────────┘                   └─────────┘ │
│       │                    │                              │      │
│       └────────────────────┼──────────────────────────────┘      │
│                            │                                      │
│  ┌────────────────────────┬────────────────────────────────┐    │
│  │  Common Services                                        │    │
│  ├────────────────────────┬────────────────────────────────┤    │
│  │                        │                                │    │
│  ▼                        ▼                                ▼    │
│ ┌──────────┐          ┌────────┐                   ┌─────────┐ │
│ │ Database │          │ Email  │                   │Validation│ │
│ │ Service  │          │ Service│                   │ Service  │ │
│ ├──────────┤          ├────────┤                   ├─────────┤ │
│ │ Prisma   │          │Send    │                   │ Zod     │ │
│ │ Queries  │          │Notify  │                   │ Schemas │ │
│ │ Trx      │          │Template│                   │         │ │
│ └──────────┘          └────────┘                   └─────────┘ │
│       │                    │                              │      │
│       └────────────────────┴──────────────────────────────┘      │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                   ┌─────────┴─────────┐
                   │                   │
            ┌──────▼──────┐      ┌─────▼──────┐
            │ PostgreSQL  │      │ External   │
            │ (Supabase)  │      │ Services   │
            └─────────────┘      └────────────┘
                                  ├─ Razorpay
                                  ├─ Gmail/SMTP
                                  └─ WhatsApp
```

### Core Services Breakdown

#### 1. Booking Service
**File**: `lib/services/bookingService.ts`

```typescript
interface BookingService {
  createBooking(data: CreateBookingInput): Promise<Booking>
  getBooking(id: string): Promise<Booking | null>
  getBookings(filters: BookingFilters): Promise<Booking[]>
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking>
  cancelBooking(id: string): Promise<void>
}

// Key functions:
- validateBookingInput(): Zod validation
- checkRoomAvailability(): Conflict detection
- calculateBookingAmount(): Pricing logic
- generateBookingReference(): Unique ID
```

#### 2. Payment Service
**File**: `lib/services/paymentService.ts`

```typescript
interface PaymentService {
  createOrder(data: CreateOrderInput): Promise<OrderResponse>
  verifyPayment(data: PaymentVerification): Promise<boolean>
  refundPayment(paymentId: string, amount: number): Promise<void>
  webhookHandler(event: RazorpayWebhook): Promise<void>
}

// Key functions:
- initializeRazorpay(): SDK setup
- generateHMAC(): Signature verification
- updatePaymentStatus(): Database update
- triggerEmailNotification(): Post-payment
```

#### 3. Auth Service
**File**: `lib/services/authService.ts`

```typescript
interface AuthService {
  login(email: string, password: string): Promise<LoginResponse>
  validateSession(token: string): Promise<Session | null>
  logout(token: string): Promise<void>
  refreshToken(token: string): Promise<string>
}

// Key functions:
- hashPassword(): Bcrypt encryption
- verifyPassword(): Bcrypt comparison
- generateJWT(): Token creation
- validateJWT(): Token verification
```

#### 4. Email Service
**File**: `lib/services/emailService.ts`

```typescript
interface EmailService {
  sendBookingConfirmation(booking: Booking, customer: Customer): Promise<void>
  sendOwnerAlert(booking: Booking): Promise<void>
  sendCancellationNotice(booking: Booking): Promise<void>
  renderTemplate(name: string, data: object): Promise<string>
}

// Email templates:
- booking_confirmation.html
- owner_booking_alert.html
- cancellation_notice.html
- payment_receipt.html
```

#### 5. Validation Service
**File**: `lib/validation/schemas.ts`

```typescript
// Zod schemas for:
- CreateBookingSchema
- CreatePaymentOrderSchema
- PaymentVerificationSchema
- AdminLoginSchema
- ContactFormSchema

// Validates:
- Data type
- Required fields
- Email format
- Phone format
- Date logic (check-out > check-in)
- Amount ranges
```

---

## Integration Points

### External Service Integrations

#### 1. Razorpay Payment Gateway

**Integration Type**: REST API
**Authentication**: API Key + Secret (HMAC-SHA256)

**Flow**:
```
1. Create Order
   POST https://api.razorpay.com/v1/orders
   Headers: { Authorization: Basic base64(key:secret) }
   Body: { amount, currency, receipt }
   ← Response: { id, amount, currency, status }

2. Verify Signature (Backend only, never client-side)
   computed = HMAC-SHA256("order_id|payment_id", secret)
   if computed === razorpay_signature → valid
   else → fraud detected

3. Webhooks (Optional, for extra verification)
   Listen for: payment.authorized, payment.failed
   Update database on webhook events
```

**Error Handling**:
```typescript
try {
  const order = await razorpay.orders.create({...})
} catch (error) {
  if (error.statusCode === 401) → Invalid credentials
  if (error.statusCode === 400) → Invalid request
  if (error.statusCode === 429) → Rate limited
  → Log and return user-friendly error
}
```

#### 2. Email Service (Nodemailer + Gmail)

**Integration Type**: SMTP
**Authentication**: App-specific password (not primary password)

**Configuration**:
```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD  // 16-char app password
  }
})
```

**Email Templates**:
```
1. Booking Confirmation (to guest)
   - Subject: "Booking Confirmed at Khan Bhai S."
   - Include: Booking ID, dates, amount, next steps
   - Attachments: Confirmation PDF

2. Owner Alert (to owner)
   - Subject: "New Booking: [Room/Tour] from [Name]"
   - Include: Customer details, payment status
   - Links: Admin dashboard, WhatsApp chat

3. Cancellation Notice (to guest)
   - Subject: "Booking Cancelled"
   - Include: Refund information, contact support
```

**Error Handling**:
```typescript
try {
  await transporter.sendMail({...})
} catch (error) {
  if (error.code === 'EAUTH') → Invalid credentials
  if (error.code === 'ESOCKET') → Network error
  → Log error, don't block payment process
  → Manually send email later via admin
}
```

#### 3. WhatsApp Integration

**Integration Type**: URL-based (Click-to-Chat)
**No server-side dependency**

**Implementation**:
```javascript
// Generate click-to-chat link
const whatsappLink = `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(message)}`

// Example message:
const message = `Hi Khan Bhai,
I have a booking confirmation for ${roomName} from ${checkIn} to ${checkOut}.
Booking ID: ${bookingId}
Amount: ₹${amount}
Please confirm.

Thanks,
${customerName}`
```

**Display Locations**:
```
1. Floating button (all pages)
2. Checkout page (before payment)
3. Confirmation page (after payment)
4. Contact form (alternative contact method)
5. Admin dashboard (to contact customer)
```

#### 4. Database (PostgreSQL + Supabase)

**Integration Type**: Prisma ORM
**Connection**: Connection pooling with Supabase

**Key Features**:
```
- Real-time backups (Supabase)
- Automatic scaling
- Row-level security (RLS)
- Built-in analytics
- REST API (optional fallback)
```

**Connection String Format**:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

---

## State Management Strategy

### Frontend State Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT LAYER                    │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  LOCAL COMPONENT STATE (React.useState)                     │
│  ├─ Form inputs (Name, Email, Phone, etc.)                 │
│  ├─ UI visibility (modals, dropdowns, loaders)             │
│  ├─ Validation errors                                      │
│  └─ Loading states per component                           │
│                                                              │
│  URL STATE (Query Parameters / Path)                        │
│  ├─ Filters: /stay?type=deluxe&capacity=2                  │
│  ├─ Sorting: /bookings?sort=date&order=desc                │
│  ├─ Pagination: /admin/bookings?page=2&limit=20            │
│  └─ Booking confirmation: /confirmation?booking_id=abc     │
│                                                              │
│  SESSION STATE (HttpOnly Cookies / NextAuth)                │
│  ├─ Admin JWT token (expires in 24h)                       │
│  ├─ User email & role                                      │
│  ├─ Session valid flag                                     │
│  └─ Refresh token (if needed)                              │
│                                                              │
│  API STATE (SWR / React Query)                              │
│  ├─ Rooms list (cached, revalidate on focus)               │
│  ├─ Tours list (cached, revalidate on focus)               │
│  ├─ Booking details (refetch on demand)                    │
│  ├─ Admin bookings (refetch periodically)                  │
│  └─ Current user (for auth checks)                         │
│                                                              │
│  PERSISTENT STATE (localStorage)                            │
│  ├─ User theme preference (light/dark)                     │
│  ├─ Last viewed room ID                                    │
│  ├─ Cart items (if applicable)                             │
│  └─ User preferences                                        │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### State Flow Example: Booking Page

```
┌─────────────────────────────────────────────────────────────┐
│ /stay Page Component                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. LOAD INITIAL STATE                                       │
│    ├─ useEffect(() => {                                    │
│    │   const rooms = await fetch('/api/rooms')             │
│    │   setRooms(rooms)                                     │
│    │   setLoading(false)                                   │
│    │ }, [])                                                │
│    │                                                        │
│    ├─ State: {                                             │
│    │   rooms: Room[],                                      │
│    │   loading: boolean,                                   │
│    │   selectedRoom: Room | null,                          │
│    │   filters: { type, capacity, price }                  │
│    │ }                                                      │
│    └─                                                       │
│                                                              │
│ 2. HANDLE USER INPUT                                        │
│    ├─ onFilterChange(filter)                               │
│    │   ├─ setFilters(filter)                               │
│    │   ├─ Update URL: /stay?type=deluxe&capacity=2         │
│    │   ├─ Re-query API: /api/rooms?type=deluxe...          │
│    │   └─ setRooms(filtered)                               │
│    │                                                        │
│    └─ onSelectRoom(room)                                   │
│       ├─ setSelectedRoom(room)                             │
│       ├─ setModalOpen(true)                                │
│       └─ Show details modal                                │
│                                                              │
│ 3. BOOKING FLOW                                            │
│    ├─ onBookClick(room, dates, guests)                     │
│    │   ├─ Validate inputs                                  │
│    │   ├─ POST /api/bookings                               │
│    │   │   ├─ setLoading(true)                             │
│    │   │   ├─ on success:                                  │
│    │   │   │   ├─ setBookingId(response.id)                │
│    │   │   │   ├─ localStorage.setItem('booking_id', id)   │
│    │   │   │   └─ navigate('/checkout')                    │
│    │   │   └─ on error:                                    │
│    │   │       ├─ setError(error.message)                  │
│    │   │       └─ showToast(error)                         │
│    │   └─ setLoading(false)                                │
│    │                                                        │
│    └─ State after booking:                                 │
│       {                                                     │
│         bookingId: 'abc123',                                │
│         checkIn: Date,                                      │
│         checkOut: Date,                                     │
│         roomId: 'room-1',                                   │
│         guests: 2,                                          │
│         amount: 25000                                       │
│       }                                                     │
│                                                              │
│ 4. PAYMENT FLOW (/checkout page)                            │
│    ├─ Load booking from localStorage or URL param          │
│    ├─ POST /api/payment/create-order                       │
│    │   └─ Response: { order_id, amount, ... }              │
│    ├─ Initialize Razorpay with order_id                    │
│    ├─ On payment success:                                  │
│    │   ├─ POST /api/payment/verify                         │
│    │   ├─ on success: navigate('/confirmation')            │
│    │   └─ on error: setPaymentError(error)                 │
│    └─ Fallback: Retry with new order_id                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Admin State Management

```
Admin Dashboard State:
{
  isAuthenticated: boolean (from NextAuth)
  adminUser: {
    id: string
    email: string
    role: 'superadmin' | 'staff'
  }
  bookings: Booking[]
  selectedBooking: Booking | null
  bookingFilters: {
    status: 'pending' | 'paid' | 'confirmed' | 'cancelled'
    dateRange: { start: Date, end: Date }
    searchTerm: string
  }
  inquiries: ContactInquiry[]
  loading: boolean
  error: string | null
}
```

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 ADMIN AUTHENTICATION FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. INITIAL REQUEST
   ├─ User navigates to /admin/dashboard
   ├─ Middleware.ts intercepts request
   └─ Checks for JWT in HttpOnly cookie

2. TOKEN VALIDATION (middleware.ts)
   ├─ if (!cookie.has('auth-token'))
   │   └─ Redirect to /admin/login
   │
   ├─ if (cookie.has('auth-token'))
   │   ├─ Extract JWT
   │   ├─ Verify signature with NEXTAUTH_SECRET
   │   ├─ if invalid/expired:
   │   │   └─ Clear cookie & redirect to login
   │   └─ if valid:
   │       ├─ Decode token
   │       ├─ Pass user data to request context
   │       └─ Allow request through

3. LOGIN FORM (/admin/login)
   ├─ User enters email & password
   ├─ Submit POST /api/admin/login
   │   ├─ Validate input with Zod
   │   ├─ Query: admins table WHERE email = input.email
   │   ├─ if user not found:
   │   │   └─ Return error: "Invalid email/password"
   │   ├─ Compare input.password with password_hash
   │   │   └─ Using bcryptjs.compare()
   │   ├─ if mismatch:
   │   │   └─ Return error: "Invalid email/password"
   │   └─ if match:
   │       ├─ Generate JWT:
   │       │   payload = { id, email, role, iat, exp }
   │       │   token = jwt.sign(payload, NEXTAUTH_SECRET)
   │       │
   │       ├─ Set HttpOnly cookie:
   │       │   res.setHeader('Set-Cookie', serialize(
   │       │     'auth-token', token, {
   │       │       httpOnly: true,
   │       │       secure: process.env.NODE_ENV === 'production',
   │       │       sameSite: 'strict',
   │       │       maxAge: 86400 // 24 hours
   │       │     }
   │       │   ))
   │       │
   │       └─ Update last_login: new Date()

4. PROTECTED API CALLS
   ├─ All /api/admin/* routes check JWT
   │   ├─ Extract token from request.cookies
   │   ├─ Verify signature
   │   ├─ if invalid:
   │   │   └─ Return 401 Unauthorized
   │   └─ if valid:
   │       ├─ Extract user data
   │       ├─ Check authorization (role-based)
   │       └─ Process request

5. LOGOUT
   ├─ User clicks "Logout"
   ├─ POST /api/admin/logout
   │   ├─ Clear HttpOnly cookie
   │   ├─ Optionally: invalidate token in database
   │   └─ Return success
   ├─ Frontend clears local state
   └─ Redirect to /admin/login

6. TOKEN EXPIRATION
   ├─ If request made with expired token:
   │   ├─ Middleware rejects request
   │   ├─ Frontend receives 401
   │   ├─ Frontend clears state
   │   └─ Redirects to /admin/login
   └─ (Optional) Implement refresh token for seamless UX
```

### Authorization Model

```
┌────────────────────────────────────────────────────────┐
│           ROLE-BASED ACCESS CONTROL (RBAC)             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  SUPERADMIN (Full Access)                             │
│  ├─ /admin/dashboard → ✓ View all stats              │
│  ├─ /admin/bookings → ✓ View, edit, cancel           │
│  ├─ /admin/inquiries → ✓ View, mark read             │
│  ├─ /admin/settings → ✓ Manage users (future)        │
│  ├─ /admin/rooms → ✓ Create, edit, delete rooms      │
│  └─ /admin/tours → ✓ Create, edit, delete tours      │
│                                                        │
│  STAFF (Limited Access)                               │
│  ├─ /admin/dashboard → ✓ View stats (read-only)      │
│  ├─ /admin/bookings → ✓ View only                     │
│  ├─ /admin/inquiries → ✓ View only                    │
│  ├─ /admin/settings → ✗ No access                     │
│  ├─ /admin/rooms → ✗ No access                        │
│  └─ /admin/tours → ✗ No access                        │
│                                                        │
│  GUEST (No Admin Access)                              │
│  └─ /admin/* → ✗ Redirected to /admin/login          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Authorization Check Implementation

```typescript
// Helper function for role-based checks
function checkAuthorization(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'superadmin': 3,
    'staff': 1,
    'guest': 0
  }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// In API route:
export async function PATCH(req: Request) {
  const user = req.user // From middleware
  
  if (!checkAuthorization(user.role, 'superadmin')) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  // Process request
}

// In frontend component:
{isAdmin && (
  <button onClick={handleEdit}>Edit Booking</button>
)}

{user?.role === 'superadmin' && (
  <button onClick={handleDelete}>Delete</button>
)}
```

---

## Error Handling Strategy

### Error Types & Handling

```
┌────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING STRATEGY                   │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  VALIDATION ERRORS (400 Bad Request)                        │
│  ├─ User input doesn't match schema                        │
│  ├─ Example: Invalid email, missing required fields        │
│  ├─ Response: { error: "Validation error", details: [...] }│
│  └─ Frontend: Display field-level error messages           │
│                                                              │
│  AUTHENTICATION ERRORS (401 Unauthorized)                   │
│  ├─ Invalid credentials, expired token                     │
│  ├─ Example: Wrong password, session expired               │
│  ├─ Response: { error: "Authentication failed" }           │
│  └─ Frontend: Redirect to login, clear local state         │
│                                                              │
│  AUTHORIZATION ERRORS (403 Forbidden)                       │
│  ├─ User authenticated but lacks permission                │
│  ├─ Example: Staff trying to delete booking                │
│  ├─ Response: { error: "Access denied" }                   │
│  └─ Frontend: Show "insufficient permissions" message      │
│                                                              │
│  BUSINESS LOGIC ERRORS (422 Unprocessable Entity)           │
│  ├─ Valid input, but violates business rules               │
│  ├─ Example: Double-booking same room                      │
│  ├─ Example: Payment amount mismatch                       │
│  ├─ Response: { error: "Room unavailable on these dates" } │
│  └─ Frontend: Show user-friendly message                   │
│                                                              │
│  EXTERNAL SERVICE ERRORS (5xx Errors)                       │
│  ├─ Razorpay down, Email service down, Database down       │
│  ├─ Response: { error: "Service temporarily unavailable" } │
│  ├─ Backend: Log detailed error, alert ops                 │
│  └─ Frontend: Show "Please try again later"                │
│                                                              │
│  DATABASE ERRORS (500 Internal Server Error)                │
│  ├─ Connection lost, query timeout, constraint violation   │
│  ├─ Response: { error: "Database error" } (generic)        │
│  ├─ Backend: Log full error, retry with exponential backoff│
│  └─ Frontend: Show "Please try again"                      │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Error Response Format

```typescript
// Standard error response structure
interface ErrorResponse {
  success: false
  error: string                    // User-friendly message
  code: string                     // Error code for frontend
  details?: {
    field?: string               // For validation errors
    message?: string
  }[]
  requestId?: string             // For debugging
  timestamp?: string
}

// Example responses:
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "check_out", "message": "Must be after check_in" }
  ],
  "requestId": "req_abc123",
  "timestamp": "2026-05-01T10:00:00Z"
}

{
  "success": false,
  "error": "This room is not available for your selected dates",
  "code": "UNAVAILABLE_ROOM",
  "requestId": "req_def456"
}

{
  "success": false,
  "error": "Payment gateway temporarily unavailable",
  "code": "PAYMENT_SERVICE_ERROR",
  "requestId": "req_ghi789"
}
```

### Frontend Error Handling

```typescript
// Hook for API calls with error handling
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async (options?: FetchOptions) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(url, options)
      const result = await response.json()
      
      if (!response.ok) {
        // Handle different error types
        switch (response.status) {
          case 400:
            setError('Please check your input')
            break
          case 401:
            setError('Session expired, please login')
            // Redirect to login
            break
          case 403:
            setError('You do not have permission')
            break
          case 422:
            setError(result.error) // Use server message
            break
          case 500:
            setError('Server error, please try again')
            break
          default:
            setError('An unexpected error occurred')
        }
        return
      }
      
      setData(result)
    } catch (err) {
      setError('Network error, please check your connection')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, fetchData }
}

// Usage in component:
const { error, loading, fetchData } = useApi('/api/bookings')

{error && (
  <Alert type="error" message={error} onClose={() => setError(null)} />
)}

{loading && <Spinner />}
```

### Error Logging

```typescript
// Centralized error logger
class ErrorLogger {
  static log(error: Error, context: ErrorContext) {
    const payload = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      userId: context.userId,
      url: context.url,
      statusCode: context.statusCode
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(payload)
    }
    
    // Send to error tracking service (e.g., Sentry)
    // await Sentry.captureException(error, { contexts: { payload } })
    
    // Log to database for analytics
    // await logError(payload)
  }
}
```

---

## Performance Considerations

### Optimization Strategies

```
┌──────────────────────────────────────────────────────────────┐
│            PERFORMANCE OPTIMIZATION STRATEGIES                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  IMAGE OPTIMIZATION                                          │
│  ├─ Use Next.js Image component                             │
│  │   ├─ Automatic WebP conversion                           │
│  │   ├─ Responsive image sizing                             │
│  │   ├─ Lazy loading (loading="lazy")                       │
│  │   └─ Blur placeholder while loading                      │
│  │                                                            │
│  ├─ Image requirements:                                      │
│  │   ├─ Max 100KB per image                                 │
│  │   ├─ Use CDN (Unsplash, Cloudinary)                      │
│  │   ├─ Hero image: 1200x600px                              │
│  │   ├─ Room image: 400x300px                               │
│  │   └─ Thumbnail: 150x150px                                │
│  │                                                            │
│  └─ Example:                                                 │
│     <Image                                                    │
│       src={roomImage}                                         │
│       alt="Room name"                                         │
│       width={400}                                             │
│       height={300}                                            │
│       priority={false}                                        │
│       loading="lazy"                                          │
│       placeholder="blur"                                      │
│     />                                                        │
│                                                               │
│  DATABASE OPTIMIZATION                                       │
│  ├─ Query optimization:                                      │
│  │   ├─ Use select() to fetch only needed fields             │
│  │   ├─ Implement pagination (limit + offset)               │
│  │   ├─ Index on frequently filtered columns:                │
│  │   │   ├─ bookings.created_at                             │
│  │   │   ├─ bookings.status                                 │
│  │   │   ├─ bookings.customer_email                         │
│  │   │   └─ admins.email                                    │
│  │   └─ Use connection pooling (Supabase default)           │
│  │                                                            │
│  ├─ Example:                                                 │
│  │   const bookings = await prisma.booking.findMany({       │
│  │     where: { status: 'paid' },                           │
│  │     select: {                    // Only needed fields     │
│  │       id: true,                                           │
│  │       customer_name: true,                                │
│  │       amount: true,                                       │
│  │       created_at: true                                    │
│  │     },                                                     │
│  │     orderBy: { created_at: 'desc' },                      │
│  │     skip: (page - 1) * pageSize,  // Pagination          │
│  │     take: pageSize                                        │
│  │   })                                                       │
│  │                                                            │
│  └─ Caching:                                                 │
│     ├─ Cache rooms/tours data: 5 minutes                     │
│     ├─ Use ISR (Incremental Static Regeneration)             │
│     ├─ Backend response caching                              │
│     └─ Database query caching (Redis)                        │
│                                                               │
│  CODE SPLITTING                                              │
│  ├─ Dynamic imports for heavy components:                    │
│  │   const BookingModal = dynamic(() =>                      │
│  │     import('./BookingModal'),                             │
│  │     { loading: () => <Skeleton /> }                       │
│  │   )                                                        │
│  │                                                            │
│  ├─ Route-based code splitting:                              │
│  │   ├─ /admin/* → Separate bundle                          │
│  │   ├─ /checkout → Razorpay bundle loaded on demand        │
│  │   └─ Modals → Lazy loaded                                │
│  │                                                            │
│  └─ Bundle analysis:                                         │
│     └─ Use next/bundle-analyzer to identify large modules    │
│                                                               │
│  CSS OPTIMIZATION                                            │
│  ├─ Tailwind CSS purging:                                    │
│  │   ├─ Only include used styles                             │
│  │   ├─ Purge: ['./app/**/*.tsx']                            │
│  │   └─ Result: ~30KB vs 300KB                               │
│  │                                                            │
│  ├─ CSS-in-JS (Framer Motion):                               │
│  │   ├─ Animations: Only when needed                         │
│  │   ├─ Use GPU acceleration (transform, opacity)            │
│  │   └─ Avoid costly properties (box-shadow, blur)           │
│  │                                                            │
│  └─ Critical CSS inline in <head>                            │
│                                                               │
│  NETWORK OPTIMIZATION                                        │
│  ├─ API request batching:                                    │
│  │   ├─ Combine multiple requests                            │
│  │   ├─ Example: Fetch rooms + tours in single request      │
│  │   └─ Reduce roundtrips                                    │
│  │                                                            │
│  ├─ Request deduplication:                                   │
│  │   ├─ Use SWR or React Query                               │
│  │   ├─ Automatic request deduplication                      │
│  │   └─ Share data across components                         │
│  │                                                            │
│  ├─ Lazy loading routes:                                     │
│  │   ├─ Defer non-critical admin features                    │
│  │   ├─ Load only when user navigates                        │
│  │   └─ Improves initial page load                           │
│  │                                                            │
│  └─ Compression:                                             │
│     ├─ Vercel auto-enables gzip                              │
│     ├─ Enable Brotli compression                             │
│     └─ ~60% bandwidth reduction                              │
│                                                               │
│  RUNTIME OPTIMIZATION                                        │
│  ├─ Revalidation strategy (ISR):                             │
│  │   ├─ /stay: Revalidate every 3600s (1 hour)             │
│  │   ├─ /travel: Revalidate every 3600s                    │
│  │   ├─ /admin/*: Not cached (always fresh)                 │
│  │   └─ /confirmation: Not cached                            │
│  │                                                            │
│  ├─ Example:                                                 │
│  │   export const revalidate = 3600  // ISR                  │
│  │   export default function StayPage() { ... }              │
│  │                                                            │
│  └─ On-demand revalidation:                                  │
│     ├─ Trigger cache refresh on booking change              │
│     └─ Use revalidatePath('/stay')                           │
│                                                               │
│  MONITORING & METRICS                                        │
│  ├─ Core Web Vitals:                                         │
│  │   ├─ LCP (Largest Contentful Paint): < 2.5s             │
│  │   ├─ FID (First Input Delay): < 100ms                   │
│  │   ├─ CLS (Cumulative Layout Shift): < 0.1                │
│  │   └─ Monitor with web-vitals library                      │
│  │                                                            │
│  ├─ Lighthouse performance target: 80+                       │
│  │   └─ Run: npm run lighthouse                              │
│  │                                                            │
│  └─ Real-time monitoring:                                    │
│     ├─ Vercel Analytics (automatic)                          │
│     ├─ Google Analytics (4)                                  │
│     └─ Custom error logging                                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Performance Checklist

- [ ] Images lazy-loaded with next/image
- [ ] CSS purged (no unused Tailwind)
- [ ] Code splitting for /admin and modals
- [ ] Database indexes on filtered columns
- [ ] Pagination implemented (max 20 items)
- [ ] ISR revalidation set for public pages
- [ ] API response caching headers configured
- [ ] Lighthouse score 80+
- [ ] Core Web Vitals in green
- [ ] Bundle size under 200KB (JavaScript)

---

## Security Architecture

### Security Layers

```
┌────────────────────────────────────────────────────────────┐
│               MULTI-LAYER SECURITY MODEL                    │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  LAYER 1: NETWORK SECURITY                                  │
│  ├─ HTTPS/TLS (Vercel auto-SSL)                            │
│  │   └─ All traffic encrypted                               │
│  │                                                           │
│  ├─ Firewall rules                                          │
│  │   ├─ DDoS protection (Vercel built-in)                  │
│  │   ├─ Rate limiting (10 req/IP/hour)                     │
│  │   └─ Geographic blocking (optional)                      │
│  │                                                           │
│  └─ Content Security Policy (CSP)                           │
│     ├─ Prevent XSS attacks                                  │
│     ├─ Allow scripts from: self, trusted CDNs              │
│     └─ Restrict iframe embeds                               │
│                                                              │
│  LAYER 2: INPUT VALIDATION & SANITIZATION                   │
│  ├─ Client-side validation (UX)                             │
│  │   ├─ Zod schemas for form inputs                        │
│  │   ├─ Email format validation                             │
│  │   ├─ Phone number validation (10-digit)                  │
│  │   └─ Date range validation                               │
│  │                                                           │
│  └─ Server-side validation (security)                       │
│     ├─ Always re-validate all inputs                        │
│     ├─ Reject unexpected fields                             │
│     ├─ Enforce max string lengths                           │
│     └─ Prevent SQL injection (Prisma ORM)                  │
│                                                              │
│  LAYER 3: AUTHENTICATION & AUTHORIZATION                    │
│  ├─ Admin authentication:                                   │
│  │   ├─ bcryptjs password hashing (10 salt rounds)         │
│  │   ├─ JWT tokens (HttpOnly cookies)                      │
│  │   ├─ 24-hour token expiration                            │
│  │   └─ Middleware route protection                         │
│  │                                                           │
│  └─ Role-based access control (RBAC):                       │
│     ├─ Superadmin: Full access                              │
│     ├─ Staff: Read-only access                              │
│     ├─ Guest: No admin access                               │
│     └─ Check authorization on every API call               │
│                                                              │
│  LAYER 4: DATA PROTECTION                                   │
│  ├─ Payment security:                                       │
│  │   ├─ HMAC-SHA256 signature verification                  │
│  │   ├─ Razorpay PCI-DSS compliance                         │
│  │   ├─ Never store card details                            │
│  │   └─ No payment logging (logs only IDs)                  │
│  │                                                           │
│  ├─ Sensitive data:                                         │
│  │   ├─ Customer email: Hashed when possible                │
│  │   ├─ Customer phone: Masked in logs                      │
│  │   ├─ Password hash: Never logged                         │
│  │   └─ API secrets: Never in public code                   │
│  │                                                           │
│  └─ Database encryption (Supabase):                         │
│     ├─ Encryption at rest (AES-256)                         │
│     ├─ Encryption in transit (TLS)                          │
│     └─ Automatic backups (encrypted)                        │
│                                                              │
│  LAYER 5: API SECURITY                                      │
│  ├─ Rate limiting:                                          │
│  │   ├─ 10 requests per IP per hour (/api/payment)         │
│  │   ├─ 30 requests per IP per hour (/api/bookings)        │
│  │   └─ Exponential backoff on retry                        │
│  │                                                           │
│  ├─ CORS configuration:                                     │
│  │   ├─ Allow: NEXT_PUBLIC_APP_URL only                    │
│  │   ├─ Methods: GET, POST, PATCH                          │
│  │   ├─ Headers: Content-Type, Authorization               │
│  │   └─ Credentials: Include                                │
│  │                                                           │
│  └─ Request validation:                                     │
│     ├─ Content-Type must be application/json                │
│     ├─ Request body size limit: 1MB                         │
│     ├─ Timeout: 30 seconds                                  │
│     └─ Required headers checked                             │
│                                                              │
│  LAYER 6: SESSION MANAGEMENT                                │
│  ├─ HttpOnly cookies:                                       │
│  │   ├─ JWT stored in HttpOnly cookie (not localStorage)   │
│  │   ├─ Secure flag: true (HTTPS only)                      │
│  │   ├─ SameSite: Strict (CSRF protection)                  │
│  │   └─ MaxAge: 86400 seconds (24 hours)                    │
│  │                                                           │
│  └─ Session invalidation:                                   │
│     ├─ Logout: Clear cookie immediately                     │
│     ├─ Expiration: Auto-reject after 24 hours               │
│     ├─ Security issue: Force logout all users               │
│     └─ Optional: Database session invalidation list        │
│                                                              │
│  LAYER 7: AUDIT & MONITORING                                │
│  ├─ Action logging:                                         │
│  │   ├─ Who: Admin user ID                                  │
│  │   ├─ What: Action (create, update, delete)              │
│  │   ├─ When: Timestamp                                     │
│  │   ├─ Where: IP address (anonymized)                      │
│  │   └─ Resource: Booking ID, inquiry ID, etc.              │
│  │                                                           │
│  └─ Security alerts:                                        │
│     ├─ Failed login attempts (3+ → block for 15 min)       │
│     ├─ Unusual payment amounts                              │
│     ├─ Multiple requests from same IP                       │
│     └─ Signature verification failures                      │
│                                                              │
│  LAYER 8: DEPENDENCY SECURITY                               │
│  ├─ npm audit:                                              │
│  │   ├─ Run: npm audit fix (before deployment)              │
│  │   ├─ Fix: Moderate and high vulnerabilities              │
│  │   └─ Monitor: github.com/dependabot                      │
│  │                                                           │
│  └─ Outdated packages:                                      │
│     ├─ Next.js: Latest stable (14.x)                        │
│     ├─ Dependencies: Update monthly                         │
│     └─ Test thoroughly after updates                        │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Environment Variables Security

```
CRITICAL: Never commit .env files to Git!

Sensitive Variables (Vercel Dashboard):
├─ DATABASE_URL
├─ NEXTAUTH_SECRET
├─ RAZORPAY_KEY_SECRET
├─ GMAIL_APP_PASSWORD
├─ RAZORPAY_WEBHOOK_SECRET
└─ Any secret keys or tokens

Public Variables (can be in code):
├─ NEXT_PUBLIC_APP_URL
├─ NEXT_PUBLIC_RAZORPAY_KEY_ID
├─ NEXT_PUBLIC_GA_ID (Google Analytics)
└─ Anything prefixed NEXT_PUBLIC_

Management:
1. Create .env.example with placeholder values
2. Document all required variables
3. Never show real values in logs
4. Rotate secrets periodically
5. Use Vercel's environment variable UI
```

### Payment Security

```
PCI Compliance Requirements:
1. Never store card data → Razorpay handles
2. No card data in logs → Only store order_id, payment_id
3. HTTPS everywhere → Vercel auto-enabled
4. Firewall rules → Limit payment endpoint access
5. Regular security audits → Annual (planned)

Payment Verification Flow:
1. Never trust client-side payment claims
2. Always verify signature server-side
3. Check order_id matches database
4. Verify amount hasn't been tampered with
5. Log verification result (not sensitive data)
6. Only update booking after verification passes
```

---

## Deployment Model

### Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│            DEPLOYMENT ARCHITECTURE (Production)             │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ CLIENT LAYER (CDN)                                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ├─ Vercel Edge Network (Global CDN)                 │  │
│  │ │  ├─ Static assets (images, CSS, JS)               │  │
│  │ │  ├─ Automatic compression (gzip, brotli)          │  │
│  │ │  ├─ Caching headers configured                    │  │
│  │ │  └─ Cache purge on deployment                     │  │
│  │ │                                                     │  │
│  │ └─ Browsers (Desktop, Mobile, Tablet)                │  │
│  │    ├─ Chrome, Safari, Firefox, Edge                 │  │
│  │    ├─ Native iOS/Android (optional)                 │  │
│  │    └─ Responsive design (mobile-first)              │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                 │
│                           │                                 │
│  ┌────────────────────────┴──────────────────────────────┐ │
│  │ APPLICATION LAYER (Next.js on Vercel)                │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                        │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ Vercel Serverless Functions (US-EAST)         │  │ │
│  │  ├────────────────────────────────────────────────┤  │ │
│  │  │ ├─ Next.js Server (app/ routes)                │  │ │
│  │  │ ├─ API Routes (/api/*)                         │  │ │
│  │  │ ├─ Server-side rendering (SSR)                 │  │ │
│  │  │ ├─ Static site generation (SSG)                │  │ │
│  │  │ ├─ Incremental Static Regeneration (ISR)       │  │ │
│  │  │ ├─ Automatic scaling (0-∞ functions)           │  │ │
│  │  │ └─ 100ms average response time                 │  │ │
│  │  │                                                  │  │ │
│  │  ├────────────────────────────────────────────────┤  │ │
│  │  │ Middleware Layer (Edge Runtime)                │  │ │
│  │  ├────────────────────────────────────────────────┤  │ │
│  │  │ ├─ Authentication checks                        │  │ │
│  │  │ ├─ Route redirects                              │  │ │
│  │  │ ├─ Request logging                              │  │ │
│  │  │ ├─ Rate limiting (optional)                     │  │ │
│  │  │ └─ <5ms response time                           │  │ │
│  │  │                                                  │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▲                                 │
│                           │                                 │
│  ┌────────────────────────┴──────────────────────────────┐ │
│  │ DATABASE LAYER (Supabase/PostgreSQL)                 │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                        │ │
│  │  Supabase Cloud (PostgreSQL 15)                       │ │
│  │  ├─ Region: US-EAST-1                                │ │
│  │  ├─ High Availability (replication)                  │ │
│  │  ├─ Automatic backups (daily)                        │ │
│  │  ├─ Connection pooling (PgBouncer)                   │ │
│  │  ├─ 99.99% uptime SLA                                │ │
│  │  ├─ Row-level security (RLS) policies                │ │
│  │  ├─ Real-time subscriptions (optional)               │ │
│  │  └─ Encryption at rest & in transit                  │ │
│  │                                                        │ │
│  │  Tables:                                              │ │
│  │  ├─ bookings (indexed on status, created_at)         │ │
│  │  ├─ payments (indexed on booking_id)                 │ │
│  │  ├─ rooms (indexed on available)                     │ │
│  │  ├─ tours (indexed on available)                     │ │
│  │  ├─ admins (indexed on email, unique constraint)     │ │
│  │  └─ contact_inquiries (indexed on created_at)        │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▲                                 │
│                           │                                 │
│  ┌────────────────────────┴──────────────────────────────┐ │
│  │ EXTERNAL SERVICES LAYER                              │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                        │ │
│  │  ┌──────────────────┐      ┌──────────────────┐      │ │
│  │  │ Razorpay         │      │ Gmail (SMTP)     │      │ │
│  │  ├──────────────────┤      ├──────────────────┤      │ │
│  │  │ • Payment API    │      │ • Nodemailer     │      │ │
│  │  │ • Webhook        │      │ • Email sending  │      │ │
│  │  │ • PCI-DSS        │      │ • 16-char app pw │      │ │
│  │  │ • 99.9% uptime   │      │ • Rate: 100/min  │      │ │
│  │  └──────────────────┘      └──────────────────┘      │ │
│  │                                                        │ │
│  │  ┌──────────────────┐      ┌──────────────────┐      │ │
│  │  │ WhatsApp         │      │ Error Tracking   │      │ │
│  │  ├──────────────────┤      ├──────────────────┤      │ │
│  │  │ • Click-to-chat  │      │ • Sentry (opt)   │      │ │
│  │  │ • No server-side │      │ • Error logging  │      │ │
│  │  │ • Links only     │      │ • Performance    │      │ │
│  │  │ • User initiated │      │ • Release track  │      │ │
│  │  └──────────────────┘      └──────────────────┘      │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Deployment Steps

```
┌────────────────────────────────────────────────────────────┐
│                 DEPLOYMENT CHECKLIST                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  PRE-DEPLOYMENT (1 week before)                             │
│  ├─ [ ] Security audit completed                           │
│  ├─ [ ] All tests passing (unit, integration, e2e)         │
│  ├─ [ ] Lighthouse score 80+ on all pages                  │
│  ├─ [ ] Mobile testing on iOS and Android                  │
│  ├─ [ ] Load testing (100+ concurrent users)               │
│  ├─ [ ] Database migrations tested on staging              │
│  ├─ [ ] Backup strategy confirmed                          │
│  ├─ [ ] Monitoring and alerting configured                 │
│  ├─ [ ] Client sign-off received                           │
│  └─ [ ] Rollback plan documented                           │
│                                                              │
│  VERCEL SETUP                                              │
│  ├─ [ ] Create Vercel account (if not exists)             │
│  ├─ [ ] Connect GitHub repository                         │
│  ├─ [ ] Configure project settings:                       │
│  │   ├─ [ ] Node.js version: 18.x or higher              │
│  │   ├─ [ ] Build command: next build                    │
│  │   ├─ [ ] Output directory: .next                       │
│  │   └─ [ ] Install command: npm ci                       │
│  │                                                          │
│  ├─ [ ] Set environment variables:                        │
│  │   ├─ [ ] DATABASE_URL (from Supabase)                 │
│  │   ├─ [ ] NEXTAUTH_SECRET (generate with: openssl)      │
│  │   ├─ [ ] NEXTAUTH_URL (production domain)              │
│  │   ├─ [ ] RAZORPAY_KEY_ID (live key)                    │
│  │   ├─ [ ] RAZORPAY_KEY_SECRET (live secret)             │
│  │   ├─ [ ] RAZORPAY_WEBHOOK_SECRET                       │
│  │   ├─ [ ] GMAIL_USER                                    │
│  │   ├─ [ ] GMAIL_APP_PASSWORD                            │
│  │   ├─ [ ] OWNER_PHONE                                   │
│  │   ├─ [ ] OWNER_EMAIL                                   │
│  │   ├─ [ ] OWNER_WHATSAPP                                │
│  │   └─ [ ] NEXT_PUBLIC_APP_URL                           │
│  │                                                          │
│  └─ [ ] Enable auto-deployments on push                   │
│                                                              │
│  SUPABASE SETUP                                            │
│  ├─ [ ] Create Supabase project                           │
│  ├─ [ ] Configure PostgreSQL (size: starter)              │
│  ├─ [ ] Run all migrations:                               │
│  │   └─ npx prisma db push                                │
│  │                                                          │
│  ├─ [ ] Seed initial data:                                │
│  │   ├─ [ ] Create admin user (superadmin)                │
│  │   ├─ [ ] Create sample rooms                           │
│  │   ├─ [ ] Create sample tours                           │
│  │   └─ [ ] Password: bcrypt hashed (min 12 chars)        │
│  │                                                          │
│  ├─ [ ] Configure backups:                                │
│  │   └─ [ ] Daily automated backups (7-day retention)     │
│  │                                                          │
│  ├─ [ ] Set up database indexes                           │
│  │   ├─ [ ] CREATE INDEX ON bookings(status)              │
│  │   ├─ [ ] CREATE INDEX ON bookings(created_at)          │
│  │   ├─ [ ] CREATE INDEX ON admins(email)                 │
│  │   └─ [ ] CREATE INDEX ON bookings(customer_email)      │
│  │                                                          │
│  └─ [ ] Configure backups and recovery                     │
│                                                              │
│  RAZORPAY SETUP                                            │
│  ├─ [ ] Upgrade to live account (KYC verification)        │
│  ├─ [ ] Generate live API keys                            │
│  │   ├─ Key ID: rzp_live_xxxxx                            │
│  │   └─ Secret: (store in Vercel secrets)                 │
│  │                                                          │
│  ├─ [ ] Configure webhooks:                               │
│  │   ├─ URL: https://yourdomain.com/api/webhooks/razorpay │
│  │   ├─ Events: payment.authorized, payment.failed        │
│  │   └─ Secret: (store in .env)                           │
│  │                                                          │
│  ├─ [ ] Test live payment (small amount first)             │
│  ├─ [ ] Verify payment verification working                │
│  └─ [ ] Enable production mode                             │
│                                                              │
│  GMAIL/EMAIL SETUP                                         │
│  ├─ [ ] Enable 2-factor authentication                     │
│  ├─ [ ] Generate app password (16-char)                    │
│  ├─ [ ] Store in Vercel: GMAIL_APP_PASSWORD                │
│  ├─ [ ] Test email sending (send test email)               │
│  └─ [ ] Set up email templates                             │
│                                                              │
│  DOMAIN & SSL                                              │
│  ├─ [ ] Point domain to Vercel nameservers                 │
│  ├─ [ ] Vercel auto-generates SSL certificate              │
│  ├─ [ ] Set NEXTAUTH_URL to production domain              │
│  ├─ [ ] Enable HTTPS redirect                              │
│  └─ [ ] Test SSL certificate (https://yoursite.com)       │
│                                                              │
│  MONITORING & ALERTS                                       │
│  ├─ [ ] Set up Vercel Analytics                            │
│  ├─ [ ] Configure error alerts (Sentry - optional)         │
│  ├─ [ ] Set up database monitoring (Supabase dashboard)    │
│  ├─ [ ] Create Razorpay webhook notifications              │
│  ├─ [ ] Configure Gmail API alerts                         │
│  └─ [ ] Set up 24/7 on-call schedule                       │
│                                                              │
│  DEPLOYMENT                                                │
│  ├─ [ ] Create production branch (main)                    │
│  ├─ [ ] Final code review                                  │
│  ├─ [ ] Push to main: git push origin main                 │
│  ├─ [ ] Vercel auto-deploys (watch logs)                   │
│  ├─ [ ] Wait for deployment to complete (5-10 min)         │
│  ├─ [ ] Smoke test all user flows:                         │
│  │   ├─ [ ] Browse rooms                                   │
│  │   ├─ [ ] Browse tours                                   │
│  │   ├─ [ ] Complete booking                               │
│  │   ├─ [ ] Process payment (test amount)                  │
│  │   ├─ [ ] Receive confirmation email                     │
│  │   ├─ [ ] Admin login                                    │
│  │   ├─ [ ] View bookings dashboard                        │
│  │   └─ [ ] Update booking status                          │
│  │                                                          │
│  └─ [ ] Announce deployment (team, clients)               │
│                                                              │
│  POST-DEPLOYMENT (24-72 hours)                             │
│  ├─ [ ] Monitor error logs (zero unhandled errors)         │
│  ├─ [ ] Monitor performance (response times < 500ms)       │
│  ├─ [ ] Check database query performance                   │
│  ├─ [ ] Review payment processing (successful rate > 99%)  │
│  ├─ [ ] Verify email notifications sending                 │
│  ├─ [ ] Check analytics integration                        │
│  ├─ [ ] Monitor user feedback (support tickets)            │
│  └─ [ ] Prepare release notes for clients                  │
│                                                              │
│  LONG-TERM MAINTENANCE                                     │
│  ├─ [ ] Update npm dependencies (monthly)                  │
│  ├─ [ ] Security patches (as released)                     │
│  ├─ [ ] Database optimization (monthly)                    │
│  ├─ [ ] Backup verification (monthly)                      │
│  ├─ [ ] Performance reviews (quarterly)                    │
│  └─ [ ] Load test after major changes                      │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Rollback Plan

```
IF CRITICAL ISSUE DETECTED POST-DEPLOYMENT:

Immediate Actions (First 5 minutes):
1. [ ] Assess severity (is it blocking users?)
2. [ ] Page the on-call engineer
3. [ ] Document the issue in incident tracker
4. [ ] Notify stakeholders

Quick Fix Option (< 30 minutes):
1. [ ] Identify the problematic commit
2. [ ] Revert: git revert [commit-hash]
3. [ ] Push to main: git push origin main
4. [ ] Vercel auto-deploys (5-10 min)
5. [ ] Verify issue is resolved
6. [ ] Update stakeholders

Database Rollback (if data corrupted):
1. [ ] Stop production immediately
2. [ ] Restore from latest backup (Supabase dashboard)
3. [ ] Verify data integrity
4. [ ] Re-deploy application
5. [ ] Notify affected customers

Post-Incident:
1. [ ] Root cause analysis (RCA document)
2. [ ] Implement safeguards (tests, monitoring)
3. [ ] Share learnings with team
4. [ ] Update runbooks
```

---

## Implementation Timeline

### Phase-wise Deployment

```
PHASE 1: Core Features (Week 1-2)
├─ Database schema & migrations
├─ Authentication (admin login)
├─ Booking API endpoints
├─ Room & Tour management
└─ Email notifications

PHASE 2: Payment Integration (Week 2-3)
├─ Razorpay order creation
├─ Payment verification
├─ Payment status updates
├─ Webhook handling (optional)
└─ Error handling for failed payments

PHASE 3: Frontend (Week 3-4)
├─ Home page
├─ Stay page (room listing)
├─ Travel page (tour listing)
├─ Checkout page
├─ Confirmation page
└─ Contact form

PHASE 4: Admin Dashboard (Week 4-5)
├─ Admin login page
├─ Bookings management
├─ Inquiries management
├─ Status updates
└─ Data exports (future)

PHASE 5: Optimization & Testing (Week 5-6)
├─ Performance optimization
├─ Security hardening
├─ Mobile testing
├─ Load testing
└─ Bug fixes

PHASE 6: Staging Deployment (Week 6)
├─ Deploy to staging environment
├─ Final testing with client
├─ Performance verification
└─ Security audit

PHASE 7: Production Deployment (Week 7)
├─ Final checklist verification
├─ Production deployment
├─ Smoke testing
├─ Monitoring setup
└─ Handoff to client
```

---

## Summary

Khan Bhai S. is a comprehensive luxury hospitality platform built on modern technologies:

- **Frontend**: Next.js 14 + React 18 + Tailwind CSS + Framer Motion
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Payments**: Razorpay (PCI-DSS compliant)
- **Email**: Nodemailer + Gmail SMTP
- **Hosting**: Vercel (serverless)
- **Security**: JWT auth, bcrypt hashing, HMAC verification, rate limiting

The system is designed for scalability, security, and excellent user experience across all user journeys: guest booking, payment processing, and admin management.

---

**Document Version**: 1.0
**Last Updated**: May 1, 2026
**Maintained By**: Development Team
**Status**: Ready for Implementation
