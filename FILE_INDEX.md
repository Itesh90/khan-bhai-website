# Khan Bhai S. - Complete File Index

## Quick Reference - All Project Files

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, project metadata |
| `tsconfig.json` | TypeScript compiler options with path aliases |
| `next.config.ts` | Next.js configuration (image optimization, env vars) |
| `tailwind.config.ts` | Tailwind CSS theme with luxury colors |
| `postcss.config.js` | PostCSS configuration for Tailwind |
| `.eslintrc.json` | ESLint configuration for code linting |
| `.prettierrc` | Code formatting configuration |
| `middleware.ts` | Next.js middleware for route protection |
| `.env.example` | Environment variables template (production) |
| `.env.local.example` | Environment variables template (development) |
| `.gitignore` | Git ignore rules |

### Pages (7 Public Routes)

| File | Route | Purpose |
|------|-------|---------|
| `app/layout.tsx` | N/A | Root layout with metadata |
| `app/page.tsx` | `/` | Home page |
| `app/stay/page.tsx` | `/stay` | Room listings |
| `app/restaurant/page.tsx` | `/restaurant` | Restaurant info |
| `app/travel/page.tsx` | `/travel` | Tours and packages |
| `app/checkout/page.tsx` | `/checkout` | Booking checkout |
| `app/confirmation/page.tsx` | `/confirmation` | Order confirmation |
| `app/admin/page.tsx` | `/admin` | Admin dashboard |

### API Routes (6 Endpoints)

| File | Route | Methods | Purpose |
|------|-------|---------|---------|
| `app/api/auth/route.ts` | `/api/auth` | POST, GET | Login, session |
| `app/api/bookings/route.ts` | `/api/bookings` | GET, POST | Booking CRUD |
| `app/api/payments/route.ts` | `/api/payments` | POST, PUT, PATCH | Razorpay integration |
| `app/api/rooms/route.ts` | `/api/rooms` | GET, POST | Room management |
| `app/api/tours/route.ts` | `/api/tours` | GET, POST | Tour management |
| `app/api/contact/route.ts` | `/api/contact` | POST, GET | Contact inquiries |

### Components - UI Layer

#### UI Components (`components/ui/`)

| File | Component | Exports |
|------|-----------|---------|
| `Button.tsx` | Button | Variants: primary, secondary, dark |
| `Input.tsx` | Input | Label, error handling, validation |
| `Card.tsx` | Card | Hover effects, responsive |

#### Shared Components (`components/shared/`)

| File | Component | Purpose |
|------|-----------|---------|
| `Header.tsx` | Header | Navigation bar with links |
| `Footer.tsx` | Footer | Footer with contact and social links |

#### Feature Components (`components/features/`)

| File | Component | Features |
|------|-----------|----------|
| `BookingForm.tsx` | BookingForm | Form for room/tour booking |
| `ContactForm.tsx` | ContactForm | Contact form with validation |

#### Admin Components (`components/admin/`)
- Placeholder directory for admin UI components

### Business Logic - Library Layer

#### Database (`lib/db/`)

| File | Exports | Purpose |
|------|---------|---------|
| `client.ts` | `prisma` | Prisma client initialization with connection pooling |

#### Authentication (`lib/auth/`)

| File | Exports | Purpose |
|------|---------|---------|
| `nextauth.ts` | `authOptions` | NextAuth configuration with JWT strategy |

#### Payments (`lib/payments/`)

| File | Exports | Purpose |
|------|---------|---------|
| `razorpay.ts` | `razorpayInstance`, `createRazorpayOrder`, `verifyRazorpaySignature` | Razorpay payment gateway integration |

#### Email (`lib/email/`)

| File | Exports | Purpose |
|------|---------|---------|
| `nodemailer.ts` | `sendEmail`, `sendBookingConfirmationEmail`, `sendPaymentConfirmationEmail` | Email service with templates |

#### Utils (`lib/utils/`)

| File | Exports | Purpose |
|------|---------|---------|
| `helpers.ts` | `generateBookingReference`, `formatCurrency`, `formatDate`, `calculateNights`, `isValidEmail`, `isValidPhoneNumber`, `parseQueryParams` | Utility functions |

#### Constants (`lib/constants/`)

| File | Exports | Purpose |
|------|---------|---------|
| `index.ts` | `SITE_NAME`, `BOOKING_STATUS`, `PAYMENT_STATUS`, `FEATURES`, `ROUTES`, `API_ROUTES`, etc. | App constants and configuration |

### Types & Interfaces

| File | Exports | Includes |
|------|---------|----------|
| `types/index.ts` | All interfaces | IBooking, IRoom, ITour, IPayment, IContactInquiry, IAdmin, ApiResponse, BookingFormData, ContactFormData |

### Custom Hooks

| File | Exports | Purpose |
|------|---------|---------|
| `hooks/useBooking.ts` | `useBooking` | Booking form logic and state |
| `hooks/usePayment.ts` | `usePayment` | Razorpay payment processing |

### Styling

| File | Type | Purpose |
|------|------|---------|
| `styles/globals.css` | CSS | Global styles, Tailwind utilities, animations |

### Database

| File | Type | Purpose |
|------|------|---------|
| `prisma/schema.prisma` | Prisma Schema | Database schema definition (6 tables) |
| `prisma/migrations/` | Directory | Database migration files |

### Public Assets

| Directory | Contents |
|-----------|----------|
| `public/images/` | Product and room images |
| `public/fonts/` | Custom font files |

### Configuration Directory

| Directory | Purpose |
|-----------|---------|
| `config/` | Placeholder for additional configuration files |

### Internal Components

| Directory | Purpose |
|-----------|---------|
| `app/_components/common/` | Common internal components |
| `app/_components/sections/` | Page section components |
| `app/_components/forms/` | Form components |
| `app/_components/layouts/` | Layout components |

### Documentation Files

| File | Purpose |
|------|---------|
| `DEVELOPMENT.md` | Setup guide, development workflow, common tasks |
| `PROJECT_STRUCTURE.md` | Detailed directory structure with descriptions |
| `SETUP_CHECKLIST.md` | Completion checklist and next phase tasks |
| `FINAL_SUMMARY.md` | Project overview and success criteria |
| `FILE_INDEX.md` | This file - quick reference of all files |

---

## Key Path Aliases

TypeScript path aliases configured in `tsconfig.json`:

```
@/*           → ./*
@/app/*       → ./app/*
@/components/* → ./components/*
@/lib/*       → ./lib/*
@/types/*     → ./types/*
@/hooks/*     → ./hooks/*
@/styles/*    → ./styles/*
@/config/*    → ./config/*
@/public/*    → ./public/*
```

Usage example:
```typescript
import { prisma } from "@/lib/db/client";
import Button from "@/components/ui/Button";
import { useBooking } from "@/hooks/useBooking";
import { IBooking } from "@/types";
```

---

## File Count Summary

| Category | Count |
|----------|-------|
| Configuration Files | 11 |
| Page Files | 8 |
| API Route Files | 6 |
| Component Files | 8 |
| Library Files | 6 |
| Hook Files | 2 |
| Type Definition Files | 1 |
| Style Files | 1 |
| Database Files | 2 |
| Documentation Files | 5 |
| Other Files | 4 |
| **Total** | **54** |

---

## Project Statistics

- **Total Lines of Code**: ~2,000+ (excluding node_modules)
- **Total Source Files**: 45+
- **Configuration Files**: 10+
- **Components Created**: 8
- **Pages Created**: 7
- **API Endpoints**: 6
- **Database Tables**: 6
- **TypeScript Interfaces**: 10+
- **Custom Hooks**: 2
- **Documentation Pages**: 5

---

## Quick Access Guide

### For Development
1. **Start here**: `DEVELOPMENT.md` - Setup and workflow
2. **Reference**: `PROJECT_STRUCTURE.md` - Directory overview
3. **Verify setup**: `SETUP_CHECKLIST.md` - Completion verification

### For Code
1. **Pages**: `app/*.tsx` files
2. **Components**: `components/` directory
3. **Logic**: `lib/` directory
4. **Types**: `types/index.ts`
5. **Database**: `prisma/schema.prisma`

### For Configuration
1. **Dependencies**: `package.json`
2. **TypeScript**: `tsconfig.json`
3. **Next.js**: `next.config.ts`
4. **Styling**: `tailwind.config.ts`
5. **Environment**: `.env.example` and `.env.local.example`

---

## Environment Variables Reference

See `.env.example` for complete list with descriptions:

**Database**
- `DATABASE_URL` - PostgreSQL connection

**Authentication**
- `NEXTAUTH_URL` - Site URL
- `NEXTAUTH_SECRET` - JWT secret

**Payments**
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Public key
- `RAZORPAY_KEY_SECRET` - Secret key

**Email**
- `EMAIL_HOST` - SMTP host
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password
- `EMAIL_FROM` - From address

**Site**
- `NEXT_PUBLIC_SITE_URL` - Site URL
- `NEXT_PUBLIC_SITE_NAME` - Site name
- `ADMIN_EMAIL` - Admin email

**Features**
- `NEXT_PUBLIC_ENABLE_BOOKINGS` - Enable bookings
- `NEXT_PUBLIC_ENABLE_PAYMENTS` - Enable payments
- `NEXT_PUBLIC_ENABLE_CONTACT` - Enable contact form

---

## Next Phase Files to Create

During Phase 2 implementation, you'll add:

- Admin authentication pages
- Dashboard management components
- Data seeding scripts
- Unit tests
- Integration tests
- API middleware
- Validation schemas
- More page components

---

Generated: May 1, 2026  
Status: Complete and Ready for Development
