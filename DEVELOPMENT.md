# Khan Bhai S. - Development Guide

## Project Setup

### Initial Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   # or for migrations: npm run db:migrate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The site will be available at `http://localhost:3000`

## Project Structure

```
khan-bhai-website/
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── stay/                    # Rooms/Stays page
│   ├── restaurant/              # Restaurant page
│   ├── travel/                  # Travel & Tours page
│   ├── checkout/                # Checkout page
│   ├── confirmation/            # Confirmation page
│   ├── admin/                   # Admin dashboard
│   ├── api/                     # API Routes
│   │   ├── auth/               # Authentication
│   │   ├── bookings/           # Bookings management
│   │   ├── payments/           # Payment processing
│   │   ├── rooms/              # Room management
│   │   ├── tours/              # Tour management
│   │   └── contact/            # Contact inquiries
│   └── _components/             # Internal components (not routable)
│
├── components/                   # Reusable components
│   ├── ui/                      # Base UI components
│   ├── shared/                  # Shared components (Header, Footer)
│   ├── admin/                   # Admin components
│   └── features/                # Feature-specific components
│
├── lib/                         # Core libraries
│   ├── db/                      # Database utilities
│   ├── auth/                    # Authentication logic
│   ├── payments/                # Payment integration
│   ├── email/                   # Email service
│   ├── utils/                   # Helper functions
│   └── constants/               # Constants
│
├── prisma/                      # Database
│   ├── schema.prisma           # Database schema
│   └── migrations/             # DB migrations
│
├── types/                       # TypeScript types
├── hooks/                       # React hooks
├── styles/                      # Global styles
├── public/                      # Static assets
│   ├── images/
│   └── fonts/
│
├── config/                      # Configuration files
├── middleware.ts                # Next.js middleware
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── package.json
└── .env.example                 # Environment variables template
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Building
npm run build        # Build for production
npm start            # Start production server

# Database
npm run db:push      # Push schema changes to database
npm run db:migrate   # Create and apply migrations
npm run db:studio    # Open Prisma Studio

# Linting
npm run lint         # Run ESLint
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key tables:

- **Admin**: Admin users and authentication
- **Room**: Hotel rooms and availability
- **Tour**: Travel packages and tours
- **Booking**: Guest bookings for rooms or tours
- **Payment**: Payment records and status
- **ContactInquiry**: Contact form submissions

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/session` - Get current session

### Bookings
- `GET /api/bookings` - List all bookings (admin)
- `POST /api/bookings` - Create new booking

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `PUT /api/payments/verify` - Verify payment
- `PATCH /api/payments/webhook` - Handle webhooks

### Rooms
- `GET /api/rooms` - List available rooms
- `POST /api/rooms` - Create room (admin)

### Tours
- `GET /api/tours` - List available tours
- `POST /api/tours` - Create tour (admin)

### Contact
- `POST /api/contact` - Submit contact inquiry
- `GET /api/contact` - List inquiries (admin)

## Key Features

### Authentication (NextAuth)
- Admin login with email and password
- JWT-based sessions
- Protected routes with middleware

### Payments (Razorpay)
- Create payment orders
- Verify payment signatures
- Webhook handling for payment updates
- Save payment records to database

### Emails (Nodemailer)
- Booking confirmation emails
- Payment confirmation emails
- Contact form submissions

### Database (Prisma)
- Type-safe database queries
- Automatic migrations
- Prisma Studio for data management

## Development Workflow

1. **Create API endpoint** in `app/api/`
2. **Add database models** in `prisma/schema.prisma`
3. **Create UI components** in `components/`
4. **Add page/route** in `app/`
5. **Test** and iterate

## Common Tasks

### Add a new page
1. Create directory in `app/` (e.g., `app/about/`)
2. Add `page.tsx` file
3. Add route to navigation if needed

### Add a new API endpoint
1. Create file in `app/api/` (e.g., `app/api/users/route.ts`)
2. Export methods: `GET`, `POST`, `PUT`, `DELETE`
3. Handle request/response

### Add database table
1. Update `prisma/schema.prisma`
2. Run `npm run db:migrate` or `npm run db:push`
3. Use in code: `prisma.tableName.method()`

## Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Site URL for NextAuth
- `NEXTAUTH_SECRET` - JWT secret key
- `RAZORPAY_KEY_ID` - Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Razorpay secret
- `EMAIL_*` - Email configuration

See `.env.example` for full list and defaults.

## Debugging

### Database Issues
```bash
npm run db:studio   # Opens Prisma Studio in browser
```

### Check logs
- Dev server: Check terminal output
- Client: Check browser console
- Server: Check terminal and logs

## Next Phase Tasks

- [ ] Implement booking form UI
- [ ] Set up Razorpay integration
- [ ] Configure email service
- [ ] Build admin dashboard
- [ ] Add image optimization
- [ ] Implement search/filter features
- [ ] Add testimonials section
- [ ] Set up analytics
- [ ] Add WhatsApp integration
- [ ] Deploy to production

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [NextAuth Docs](https://next-auth.js.org/)
- [Razorpay Docs](https://razorpay.com/docs/)

## Support

For issues or questions, refer to the project roadmap or contact the development team.
