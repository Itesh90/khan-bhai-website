# Khan Bhai S. — Roadmap Analysis & Execution Summary

## Project Overview
- **Business**: Hotel + Restaurant + Travel Agency (Haldwani, Golapar)
- **Build Duration**: 7-8 days (8 phases + 1 foundation phase)
- **Total Tasks**: 68 detailed tasks
- **Status**: Ready for client confirmation before development

---

## Architecture Summary

### Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + custom gold tokens
- **Animation**: Framer Motion
- **Hosting**: Vercel (free tier, auto HTTPS, CDN)
- **Fonts**: Playfair Display (headings) + Poppins (body)

### Backend Stack
- **API**: Next.js API Routes (serverless)
- **Database**: PostgreSQL (Supabase free tier)
- **ORM**: Prisma (type-safe queries + migrations)
- **Auth**: NextAuth.js + JWT (admin-only)
- **Payments**: Razorpay (UPI, cards, netbanking)
- **Email**: Nodemailer + Gmail SMTP
- **Notifications**: WhatsApp click-to-chat

---

## Database Schema (6 Tables, 82 Fields)

### Table 1: bookings
- Stores all reservations (rooms & tours)
- Links to: payments, rooms, tours
- Key fields: booking_type, customer details, check-in/out, status, amount

### Table 2: payments
- Razorpay transaction log
- Contains: order_id, payment_id, signature, amount, status, method
- Critical for HMAC verification

### Table 3: rooms
- Hotel room types (Standard, Deluxe, Premium Suite, Family)
- Fields: name, description, price_per_night, capacity, amenities (JSON), images (JSON)

### Table 4: tours
- Travel packages (Nainital, Jim Corbett, Kedarnath)
- Fields: title, destination, duration_days, price_per_person, itinerary (JSON)

### Table 5: admins
- Owner/staff login credentials
- Fields: email (unique), password_hash (bcrypt), role ('superadmin'|'staff')

### Table 6: contact_inquiries
- Contact form submissions
- Fields: name, email, phone, message, type, read status

---

## Pages & Routes (7 Pages + Admin)

### Public Pages
1. **/ (Home)**
   - Hero, service preview cards, testimonials, gallery, CTA

2. **/restaurant**
   - Restaurant story, signature dishes, menu categories, gallery

3. **/stay**
   - Room showcase with filters, individual room details, Book Now

4. **/travel**
   - Tour packages, destinations, itineraries, inquiry form

5. **/checkout**
   - Booking form, price summary, Razorpay payment

6. **/confirmation**
   - Booking ID, summary, automatic email + WhatsApp

7. **/contact**
   - Contact form (email only, no booking)

### Protected Pages (Admin Only)
- **/admin/login** - Email + password auth
- **/admin/dashboard** - KPI overview, quick actions
- **/admin/bookings** - Bookings table with management
- **/admin/rooms** - Room management
- **/admin/tours** - Tour management
- **/admin/inquiries** - Contact inquiries viewer

---

## Payment Flow (PCI-DSS Compliant)

```
1. Customer fills checkout form
2. POST /api/payment/create-order (server generates order_id)
3. Razorpay popup opens on client
4. Customer pays (no card data touches your server)
5. Webhook calls /api/payment/verify with signature
6. Server verifies HMAC-SHA256 signature
7. If verified: Save booking to DB, send emails
8. If rejected: Log fraud, do NOT confirm
```

### Security Measures
- HMAC-SHA256 signature verification (critical)
- API keys only in .env (never client-side)
- Razorpay handles PCI DSS (you never see card data)
- Rate limiting: max 10 payment requests/IP/hour
- HTTPS enforced everywhere (Vercel auto-SSL)
- Input validation with Zod schemas

---

## Design System

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Primary Black | #0D0D0D | Page background |
| Card Background | #1A1A1A | Cards, sections |
| Primary Gold | #C9A84C | Buttons, accents |
| Light Gold | #E8D5A3 | Headings, highlights |
| Warm White | #F5F5F0 | Body text |
| Dark Gold | #8B6914 | Borders, dividers |

### Typography
- **Playfair Display** (serif) → All headings, hero, prices
- **Poppins** (sans-serif) → Body, nav, forms
- Scale: 56px hero, 40px H1, 32px H2, 24px H3, 16px body

### Components
- **Buttons**: Primary (solid gold), Secondary (outlined), Ghost (subtle)
- **Cards**: 16px border-radius, gold border glow on hover
- **Animations**: Fade-in scroll, shimmer effects, hover lift (no heavy 3D)

---

## Build Roadmap (8 Phases)

### Phase 0: Foundation (Day 1)
- Next.js init, Tailwind, fonts, color tokens
- Prisma init, Supabase connection
- .env setup, folder structure
- **Output**: Nothing visible yet (pure setup)

### Phase 1: Layout Shell (Days 1-2)
- Navbar (sticky, mobile-responsive)
- Footer (contact, social, map)
- Hero section (parallax, animations)
- Page routing
- **Output**: Client can see browser layout for first time

### Phase 2: All 3 Service Sections (Days 2-3)
- Restaurant page (complete)
- Rooms page (grid, filters, details)
- Tours page (packages, itineraries)
- Card components, gallery, animations
- **Output**: All pages visible with dummy content

### Phase 3: Database & API (Days 3-4)
- Prisma schema (all 6 tables)
- DB migrations to Supabase
- Seed data (dummy rooms, tours, admin)
- API: /api/rooms GET, /api/tours GET
- **Output**: Frontend can fetch real data

### Phase 4: Checkout & Razorpay (Days 4-5)
- Checkout form (React Hook Form + Zod)
- Razorpay order creation
- Razorpay popup integration
- Payment verification & HMAC check
- Booking save to DB
- **Output**: Full payment flow working in test mode

### Phase 5: Notifications (Day 5)
- Nodemailer + Gmail SMTP setup
- Email templates (owner alert + customer receipt)
- WhatsApp notification link generation
- Confirmation page
- **Output**: Customer & owner receive notifications

### Phase 6: Admin Panel (Days 6-7)
- NextAuth.js login (email + password)
- Middleware protection for /admin/*
- Dashboard with KPIs
- Bookings table (view, filter)
- Inquiry viewer
- **Output**: Admin can manage bookings & inquiries

### Phase 7: Polish & Deploy (Days 7-8)
- SEO meta tags + OG images
- Mobile testing & optimization
- Performance audit (Lighthouse)
- Vercel deployment
- Custom domain setup
- Final client review
- **Output**: Live website ready

---

## Critical Dependencies

```
Phase 0 (Foundation)
    ↓ (blocks all)
Phase 1 (Layout) & Phase 3/6 (can be parallel)
    ↓
Phase 2 (Service pages)
    ↓
Phase 4 (Checkout & Payment)
    ↓
Phase 5 (Notifications)
    ↓
Phase 7 (Polish & Deploy)
```

**Parallelizable Work:**
- Phase 2 tasks (Restaurant, Rooms, Tours) can be split among developers
- Phase 3 & 6 can run in parallel after Phase 0

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Razorpay KYC not complete | HIGH | HIGH | Use test mode V1, start KYC immediately |
| Photos not ready | MEDIUM | MEDIUM | Launch with Unsplash stock, swap later |
| Final prices not confirmed | MEDIUM | LOW | Use placeholder prices, "Contact" CTA |
| WhatsApp number changes | LOW | MEDIUM | Store in .env, change in one place |
| Domain not purchased | MEDIUM | LOW | Launch on khanbhais.vercel.app first |
| No admin initially | MEDIUM | MEDIUM | Email + WhatsApp notifications primary |

---

## Critical Client Confirmations Required Before Build

### Pricing & Products
- [ ] Final room prices (4 room types)
- [ ] Final tour package prices
- [ ] Restaurant menu items (optional V1)

### Contact & Notifications
- [ ] Owner mobile number (WhatsApp)
- [ ] Owner email address (booking alerts)
- [ ] Gmail account for SMTP (Nodemailer)

### Domain & Deployment
- [ ] Preferred domain name OR approve khanbhais.vercel.app
- [ ] Timezone for bookings

### Payment & Financial
- [ ] Razorpay account created + API keys ready
- [ ] Bank account for settlements (V2)
- [ ] GST number (optional)

### Content & Branding
- [ ] Logo file (SVG)
- [ ] High-quality photos (restaurant, rooms, tours)
  - OR approve using Unsplash stock photos for launch
- [ ] Brand story text for "About Us"
- [ ] Restaurant hours
- [ ] Hotel amenities list
- [ ] Tour itineraries (day-by-day)

### Visual Approval
- [ ] Gold color scheme #C9A84C approved
- [ ] Playfair Display + Poppins fonts approved
- [ ] Black-gold design aesthetic approved

---

## Task Breakdown Summary

| Phase | Tasks | Estimated Time |
|-------|-------|-----------------|
| Phase 0 | 8 | 1 day |
| Phase 1 | 6 | 1.5 days |
| Phase 2 | 6 | 2 days |
| Phase 3 | 6 | 1.5 days |
| Phase 4 | 7 | 2 days |
| Phase 5 | 6 | 1 day |
| Phase 6 | 6 | 2 days |
| Phase 7 | 7 | 1 day |
| **TOTAL** | **68** | **7-8 days** |

---

## Tech Stack Justification

| Technology | Why This Choice |
|-----------|-----------------|
| Next.js 14 | Best-in-class SSR, serverless APIs, Vercel native, #1 for India |
| Tailwind CSS | Rapid development, custom design system, fully responsive |
| Framer Motion | Silky animations, scroll effects, entrance animations |
| PostgreSQL | Free tier on Supabase, row-level security, type-safe with Prisma |
| Prisma ORM | Auto-migrations, type-safe queries, great DX |
| NextAuth.js | Secure JWT sessions, HttpOnly cookies, admin-only auth |
| Razorpay | India's #1 payment gateway, UPI + cards, test→live seamless |
| Nodemailer | Free, reliable, sends booking alerts |
| WhatsApp API | Zero cost, instant, no API key for click-to-chat V1 |
| Vercel | 1-click deploy, auto HTTPS, CDN globally, free tier sufficient |

---

## Key Features Included in MVP

✅ Beautiful landing page with animations
✅ Hotel rooms showcase with booking
✅ Travel tours showcase with booking
✅ Restaurant showcase (informational V1)
✅ Secure payment processing (Razorpay)
✅ HMAC signature verification
✅ Email notifications (owner + customer)
✅ WhatsApp notifications
✅ Booking management dashboard (admin)
✅ Contact inquiries management
✅ Fully responsive design
✅ Mobile hamburger menu
✅ SEO optimized
✅ Performance optimized (Lighthouse)

---

## Not Included (V2 Roadmap)

- Restaurant online ordering / menu management
- Real-time availability calendar
- Advanced admin features (staff roles, bookings calendar)
- Payment subscriptions or recurring bookings
- Multi-language support
- Advanced analytics dashboard
- Video tours
- AR room previews
- Inventory management

---

## Next Steps

1. **Client Review**: Share ROADMAP_EXTRACTION.json + client confirmation checklist
2. **Confirmations**: Collect all 21 client confirmations (see checklist above)
3. **Accounts Setup**: Ensure Razorpay + Gmail + Supabase accounts are ready
4. **Design Approval**: Get client sign-off on colors, fonts, layout
5. **Content Gathering**: Collect logos, photos, itineraries, prices
6. **Development Start**: Begin Phase 0 once all confirmations received
7. **Weekly Demos**: Show progress at end of each phase
8. **Final Testing**: Full QA before Phase 7 deployment

---

## Files Generated

- `ROADMAP_EXTRACTION.json` - Complete structured extraction of all sections
- `ROADMAP_ANALYSIS.md` - This summary document

Total Extraction: 9 sections, 82 database fields, 68 tasks, 7 pages, 6 tables, 21 client confirmations
