# Khan Bhai S. 🏨

> A full-stack luxury hotel, restaurant & travel booking website built with **Next.js 14**, **Prisma**, and **Razorpay**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-5.8-2D3748?logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- 🏨 **Hotel Room Booking** — Browse rooms, check availability, and book online
- 🍽️ **Restaurant** — Menu gallery with operating hours
- 🧳 **Travel Packages** — Tour listings with day-by-day itineraries
- 💳 **Razorpay Payments** — UPI, cards, net banking support
- 📧 **Email Notifications** — Customer confirmation + owner alerts via Gmail SMTP
- 💬 **WhatsApp Integration** — Direct inquiry links
- 🔐 **Admin Dashboard** — Manage bookings, rooms, tours, and inquiries
- 🛡️ **Security** — JWT auth, bcrypt, Zod validation, HMAC payment verification

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.3 |
| Styling | Tailwind CSS + Framer Motion |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 5 |
| Auth | NextAuth.js v4 + JWT |
| Payments | Razorpay |
| Email | Nodemailer + Gmail SMTP |
| Deployment | Vercel |

---

## 📁 Project Structure

```
khan-bhai-website/
├── app/
│   ├── _components/       # Shared UI components
│   ├── admin/             # Protected admin panel
│   ├── api/               # API route handlers
│   ├── checkout/          # Booking + payment flow
│   ├── confirmation/      # Booking confirmation page
│   ├── restaurant/        # Restaurant page
│   ├── stay/              # Hotel rooms page
│   ├── travel/            # Travel packages page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable React components
├── config/                # App configuration
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (prisma, email, auth)
├── prisma/
│   ├── schema.prisma      # Database schema (6 tables)
│   ├── seed.ts            # Seed data
│   └── migrations/        # DB migration history
├── public/                # Static assets
├── styles/                # Global styles
└── types/                 # TypeScript type definitions
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or [Supabase](https://supabase.com) free tier)
- Razorpay account (test keys work for development)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/khan-bhai-website.git
cd khan-bhai-website
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/khan_bhai_db"

# NextAuth — generate secret with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret"

# Razorpay (use test keys during development)
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxx"

# Email (Gmail SMTP with App Password)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="noreply@khanbhaihotel.com"

# Site
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_NAME="Khan Bhai S."
ADMIN_EMAIL="admin@khanbhaihotel.com"
```

### 4. Set up the database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Run the development server

```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:migrate` | Run DB migrations (dev) |
| `npm run db:migrate:prod` | Deploy migrations (production) |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:reset` | Reset & re-seed database |

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `rooms` | Hotel room types and pricing |
| `tours` | Travel packages |
| `bookings` | All reservations (hotel + tours) |
| `payments` | Razorpay transaction logs |
| `admins` | Admin panel users |
| `contact_inquiries` | Contact form submissions |

---

## 🔌 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/rooms` | List available rooms |
| `GET` | `/api/tours` | List available tours |
| `POST` | `/api/bookings` | Create a booking |
| `GET` | `/api/bookings/:id` | Get booking details |
| `POST` | `/api/payment/create-order` | Create Razorpay order |
| `POST` | `/api/payment/verify` | Verify payment signature |
| `POST` | `/api/admin/login` | Admin authentication |
| `GET` | `/api/admin/bookings` | List all bookings (protected) |
| `PATCH` | `/api/admin/bookings/:id` | Update booking status (protected) |
| `GET` | `/api/admin/inquiries` | List inquiries (protected) |

---

## 🌐 Deploying to Vercel

1. Push your code to GitHub
2. Import your repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.local` to Vercel's project settings
4. Deploy!

> Run `npm run db:migrate:prod` against your production DB before going live.

---

## 🔐 Security

- Razorpay HMAC-SHA256 signature verification on all payments
- HttpOnly secure cookies for sessions
- Middleware guards on all `/admin/*` routes
- Bcrypt password hashing
- Zod input validation on all API routes
- Prisma parameterized queries (SQL injection safe)

---

## 🧪 Razorpay Test Credentials

Use these in development (test mode):

| Field | Value |
|-------|-------|
| Card | `4111 1111 1111 1111` |
| Expiry | Any future date |
| CVV | Any 3 digits |
| UPI | `success@razorpay` |

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙋 Contact

Built by **Itesh Bisht** — [iteshbisht361@gmail.com](mailto:iteshbisht361@gmail.com)
