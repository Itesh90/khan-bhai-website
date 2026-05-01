# Khan Bhai S. - Project Structure

## Complete Directory Tree

```
khan-bhai-website/
├── app/                                    # Next.js 14 App Router
│   ├── layout.tsx                         # Root layout with metadata
│   ├── page.tsx                           # Home page (/)
│   ├── middleware.ts                      # Route protection middleware
│   │
│   ├── stay/                              # Rooms & Stays Page (/stay)
│   │   └── page.tsx                       # Room listing page
│   │
│   ├── restaurant/                        # Restaurant Page (/restaurant)
│   │   └── page.tsx                       # Restaurant page with menu
│   │
│   ├── travel/                            # Travel & Tours Page (/travel)
│   │   └── page.tsx                       # Tour listing page
│   │
│   ├── checkout/                          # Checkout Page (/checkout)
│   │   └── page.tsx                       # Booking checkout
│   │
│   ├── confirmation/                      # Confirmation Page (/confirmation)
│   │   └── page.tsx                       # Booking confirmation
│   │
│   ├── admin/                             # Admin Dashboard (/admin)
│   │   └── page.tsx                       # Admin dashboard
│   │
│   ├── api/                               # API Routes
│   │   ├── auth/
│   │   │   └── route.ts                  # Login, session endpoints
│   │   ├── bookings/
│   │   │   └── route.ts                  # Create, list bookings
│   │   ├── payments/
│   │   │   └── route.ts                  # Razorpay integration
│   │   ├── rooms/
│   │   │   └── route.ts                  # Room management
│   │   ├── tours/
│   │   │   └── route.ts                  # Tour management
│   │   └── contact/
│   │       └── route.ts                  # Contact inquiries
│   │
│   └── _components/                       # Internal components (non-routable)
│       ├── common/                       # Common internal components
│       ├── sections/                     # Page sections
│       ├── forms/                        # Form components
│       └── layouts/                      # Layout components
│
├── components/                            # Reusable UI Components
│   ├── ui/                                # Base UI Components
│   │   ├── Button.tsx                    # Button component
│   │   ├── Input.tsx                     # Input component
│   │   └── Card.tsx                      # Card component
│   │
│   ├── shared/                            # Shared Components
│   │   ├── Header.tsx                    # Navigation header
│   │   └── Footer.tsx                    # Footer
│   │
│   ├── admin/                             # Admin Components
│   │   ├── (placeholder for admin UI)
│   │   └── (to be populated)
│   │
│   └── features/                          # Feature-Specific Components
│       ├── BookingForm.tsx               # Booking form component
│       └── ContactForm.tsx               # Contact form component
│
├── lib/                                   # Core Business Logic
│   ├── db/
│   │   └── client.ts                     # Prisma client initialization
│   │
│   ├── auth/
│   │   └── nextauth.ts                   # NextAuth configuration
│   │
│   ├── payments/
│   │   └── razorpay.ts                   # Razorpay integration
│   │
│   ├── email/
│   │   └── nodemailer.ts                 # Email service
│   │
│   ├── utils/
│   │   └── helpers.ts                    # Utility functions
│   │
│   └── constants/
│       └── index.ts                      # App constants
│
├── prisma/                                # Database
│   ├── schema.prisma                     # Database schema definition
│   │   ├── Admin (admin users)
│   │   ├── Room (hotel rooms)
│   │   ├── Tour (travel packages)
│   │   ├── Booking (reservations)
│   │   ├── Payment (payment records)
│   │   └── ContactInquiry (inquiries)
│   │
│   └── migrations/                       # Database migrations
│
├── types/                                 # TypeScript Type Definitions
│   └── index.ts
│       ├── IBooking
│       ├── IRoom
│       ├── ITour
│       ├── IPayment
│       ├── IContactInquiry
│       ├── IAdmin
│       ├── ApiResponse
│       ├── BookingFormData
│       └── ContactFormData
│
├── hooks/                                 # React Custom Hooks
│   ├── useBooking.ts                     # Booking operations
│   └── usePayment.ts                     # Payment processing
│
├── styles/                                # Global Styles
│   └── globals.css                       # Tailwind + custom styles
│
├── public/                                # Static Assets
│   ├── images/                           # Product/room images
│   │   └── (to be populated)
│   │
│   └── fonts/                            # Custom fonts
│       └── (to be populated)
│
├── config/                                # Configuration Files
│   └── (placeholder for config)
│
├── Root Configuration Files
│   ├── next.config.ts                    # Next.js configuration
│   ├── tailwind.config.ts                # Tailwind CSS config
│   ├── tsconfig.json                     # TypeScript config
│   ├── postcss.config.js                 # PostCSS config
│   ├── .eslintrc.json                    # ESLint config
│   ├── .prettierrc                       # Prettier config
│   ├── middleware.ts                     # Next.js middleware
│   ├── package.json                      # Dependencies
│   ├── .env.example                      # Environment template
│   ├── .env.local.example                # Local env template
│   └── .gitignore                        # Git ignore rules
│
└── Documentation Files
    ├── DEVELOPMENT.md                     # Development guide
    ├── PROJECT_STRUCTURE.md               # This file
    └── README.md                          # Project overview
```

## Key Files Overview

### Pages (Public Routes)
- **Home** (`/`) - Homepage with hero and features
- **Stay** (`/stay`) - Room listings and details
- **Restaurant** (`/restaurant`) - Restaurant menu and reservations
- **Travel** (`/travel`) - Tour packages
- **Checkout** (`/checkout`) - Booking and payment
- **Confirmation** (`/confirmation`) - Booking confirmation
- **Admin** (`/admin`) - Admin dashboard (protected)

### API Routes
- **Auth** - Login, session, logout
- **Bookings** - CRUD operations for bookings
- **Payments** - Razorpay order creation and verification
- **Rooms** - Room management
- **Tours** - Tour package management
- **Contact** - Contact form submissions

### Components

#### UI Components (`components/ui/`)
- Button - Reusable button with variants
- Input - Form input with validation
- Card - Card container component

#### Shared Components (`components/shared/`)
- Header - Navigation bar
- Footer - Footer with links and info

#### Feature Components (`components/features/`)
- BookingForm - Booking form for rooms/tours
- ContactForm - Contact us form

### Libraries

#### Database (`lib/db/`)
- Prisma client configuration and connection

#### Authentication (`lib/auth/`)
- NextAuth configuration and JWT strategy

#### Payments (`lib/payments/`)
- Razorpay order creation
- Payment verification
- Signature validation

#### Email (`lib/email/`)
- Nodemailer configuration
- Email templates (confirmation, payment)
- Email sending utilities

#### Utilities (`lib/utils/`)
- Booking reference generation
- Currency formatting
- Date utilities
- Email validation
- Phone validation
- Query parameter parsing

#### Constants (`lib/constants/`)
- Site configuration
- Booking statuses
- Payment statuses
- Feature flags
- Routes and API routes

### Database Schema (`prisma/schema.prisma`)

**6 Tables:**
1. **Admin** - Admin users for dashboard
2. **Room** - Hotel rooms with pricing
3. **Tour** - Travel packages
4. **Booking** - Guest reservations
5. **Payment** - Payment records
6. **ContactInquiry** - Contact form submissions

### Types (`types/index.ts`)

Complete TypeScript interfaces for:
- Bookings, Rooms, Tours, Payments
- Contact inquiries, Admin users
- Form data structures
- API response formats

### Hooks (`hooks/`)

Custom React hooks for:
- **useBooking** - Booking form logic
- **usePayment** - Razorpay integration

### Styles (`styles/globals.css`)

- Tailwind CSS integration
- Custom luxury design tokens
- Component styles (.btn-primary, .input-primary, etc.)
- Animation utilities
- Responsive utilities

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

### Backend
- **Next.js API Routes** - Backend logic
- **Prisma** - Database ORM
- **NextAuth** - Authentication

### Database
- **PostgreSQL** - Relational database

### Services
- **Razorpay** - Payment processing
- **Nodemailer** - Email service
- **WhatsApp** - Future integration

## Development Workflow

1. **Create pages** in `app/` directory
2. **Build components** in `components/`
3. **Add API routes** in `app/api/`
4. **Define types** in `types/`
5. **Add business logic** in `lib/`
6. **Style with Tailwind** in `styles/`
7. **Use custom hooks** from `hooks/`

## Environment Variables

Required configuration:
```
DATABASE_URL          - PostgreSQL connection
NEXTAUTH_URL          - Site URL
NEXTAUTH_SECRET       - JWT secret
RAZORPAY_KEY_ID      - Payment gateway key
RAZORPAY_KEY_SECRET  - Payment gateway secret
EMAIL_*              - Email configuration
```

## Ready for Development

All files are structured and ready for:
- Feature implementation
- Component development
- API endpoint completion
- Database operations
- Authentication setup
- Payment integration
- Email notifications
- Admin dashboard building

See `DEVELOPMENT.md` for detailed setup and workflow instructions.
