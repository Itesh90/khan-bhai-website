/**
 * Prisma Seed — Khan Bhai S.
 * Populates the database with sample admins, rooms, tours, bookings,
 * payments, and contact inquiries for development and testing.
 *
 * Run with:  npx prisma db seed
 */

import { PrismaClient, AdminRole, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding Khan Bhai S. database…");

  // ── 1. Admin users ──────────────────────────────────────────────────────────
  const SALT_ROUNDS = 12;

  const superadminHash = await bcrypt.hash("Admin@KhanBhai2024!", SALT_ROUNDS);
  const staffHash = await bcrypt.hash("Staff@KhanBhai2024!", SALT_ROUNDS);

  const superadmin = await prisma.admin.upsert({
    where: { email: "admin@khanbhais.in" },
    update: {},
    create: {
      email: "admin@khanbhais.in",
      password: superadminHash,
      name: "Khan Admin",
      role: AdminRole.SUPERADMIN,
    },
  });

  const staffAdmin = await prisma.admin.upsert({
    where: { email: "staff@khanbhais.in" },
    update: {},
    create: {
      email: "staff@khanbhais.in",
      password: staffHash,
      name: "Staff User",
      role: AdminRole.STAFF,
    },
  });

  console.log(`  ✅  Admins: ${superadmin.email}, ${staffAdmin.email}`);

  // ── 2. Rooms ─────────────────────────────────────────────────────────────────
  const standardRoom = await prisma.room.upsert({
    where: { id: "standard" },
    update: {
      price: 1200,
      available: false,
    },
    create: {
      id: "standard",
      name: "Standard Room",
      description:
        "A comfortable standard room with all essential amenities. Perfect for solo travellers or couples looking for a clean, cosy stay.",
      price: 1200,
      maxGuests: 2,
      amenities: ["WiFi", "AC", "TV", "Attached Bathroom"],
      images: [
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
        "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=800",
      ],
      available: false,
    },
  });

  const deluxeRoom = await prisma.room.upsert({
    where: { id: "deluxe" },
    update: {
      price: 2730,
      available: true,
    },
    create: {
      id: "deluxe",
      name: "Deluxe Room",
      description:
        "Elegantly furnished deluxe room featuring a relaxing balcony, workspace, and comfortable king bed.",
      price: 2730,
      maxGuests: 2,
      amenities: ["WiFi", "AC", "TV", "Balcony", "Workspace"],
      images: [
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      ],
      available: true,
    },
  });

  const premiumSuite = await prisma.room.upsert({
    where: { id: "balcony" },
    update: {
      price: 3360,
      name: "Room with Balcony View",
      available: true,
    },
    create: {
      id: "balcony",
      name: "Room with Balcony View",
      description:
        "Premium room with a beautiful sit-out balcony offering stunning views of the valley.",
      price: 3360,
      maxGuests: 2,
      amenities: ["WiFi", "AC", "TV", "Balcony View", "Mini Bar"],
      images: [
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
      ],
      available: true,
    },
  });

  const familyRoom = await prisma.room.upsert({
    where: { id: "suite" },
    update: {
      price: 7140,
      name: "Sweet Room",
      available: true,
    },
    create: {
      id: "suite",
      name: "Sweet Room",
      description:
        "Our flagship luxury suite room with fine wood finishes, private balcony, and separate lounge area.",
      price: 7140,
      maxGuests: 4,
      amenities: [
        "WiFi",
        "AC",
        "TV",
        "Private Balcony",
        "Lounge Area",
        "Four-poster Bed",
      ],
      images: [
        "https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800",
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800",
      ],
      available: true,
    },
  });

  console.log(
    `  ✅  Rooms: ${standardRoom.name}, ${deluxeRoom.name}, ${premiumSuite.name}, ${familyRoom.name}`
  );

  // ── 3. Tours ─────────────────────────────────────────────────────────────────
  // Tour ids/prices are kept in lockstep with the public catalogue
  // (app/travel/page.tsx + app/checkout/page.tsx). The ids use the slug form the
  // site links with (e.g. ?type=tour&id=nainital) and pass the booking
  // vehicle/tour id regex. Remove superseded rows from older seeds first.
  await prisma.tour.deleteMany({
    where: { id: { in: ["tour_nainital_001", "tour_corbett_002", "tour_kedarnath_003"] } },
  });

  const nainitalTour = await prisma.tour.upsert({
    where: { id: "nainital" },
    update: { name: "Nainital & Bhimtal", price: 6500, duration: 3, available: true },
    create: {
      id: "nainital",
      name: "Nainital & Bhimtal",
      description:
        "A refreshing 3-day getaway to the beautiful lake city of Nainital and nearby Bhimtal. Explore the iconic Naini Lake, Mall Road, Tiffin Top, and the scenic boat rides.",
      destination: "Nainital, Uttarakhand",
      price: 6500,
      duration: 3,
      maxGuests: 20,
      includes: ["Meals", "Transport", "Guide", "Hotel"],
      images: [
        "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800",
        "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival & Naini Lake",
          description:
            "Arrive at Nainital, check in to the hotel, enjoy a boat ride on Naini Lake, evening stroll along Mall Road, and welcome dinner.",
        },
        {
          day: 2,
          title: "Sightseeing & Departure",
          description:
            "Morning cable car ride to Snow View Point, visit Naina Devi Temple, light shopping at Tibetan Market, and departure post lunch.",
        },
      ],
      available: true,
    },
  });

  const corbettTour = await prisma.tour.upsert({
    where: { id: "corbett" },
    update: { name: "Jim Corbett", price: 8000, duration: 3, available: true },
    create: {
      id: "corbett",
      name: "Jim Corbett",
      description:
        "An exhilarating 3-day wildlife safari in Jim Corbett National Park — India's oldest national park. Spot tigers, elephants, and a rich variety of bird species.",
      destination: "Jim Corbett National Park, Uttarakhand",
      price: 8000,
      duration: 3,
      maxGuests: 12,
      includes: ["All Meals", "Jeep Safari", "Professional Guide", "Hotel"],
      images: [
        "https://images.unsplash.com/photo-1605537964076-b80a81c2e24e?w=800",
        "https://images.unsplash.com/photo-1549366021-9f761d450615?w=800",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival & Evening Safari",
          description:
            "Arrive at Ramnagar, check in to the jungle resort, evening zone safari with an expert naturalist.",
        },
        {
          day: 2,
          title: "Full-Day Safari",
          description:
            "Early morning Dhikala zone jeep safari, afternoon nature walk, campfire and wildlife talk in the evening.",
        },
        {
          day: 3,
          title: "Morning Safari & Departure",
          description:
            "Last morning safari, visit Corbett Museum, and departure by afternoon.",
        },
      ],
      available: true,
    },
  });

  const kedarnathTour = await prisma.tour.upsert({
    where: { id: "kedarnath" },
    update: { name: "Kedarnath Yatra", price: 12000, duration: 4, available: true },
    create: {
      id: "kedarnath",
      name: "Kedarnath Yatra",
      description:
        "A spiritually enriching 4-day pilgrimage to one of India's holiest Shiva temples. Experience the majestic Himalayas, sacred rituals, and profound inner peace.",
      destination: "Kedarnath, Uttarakhand",
      price: 12000,
      duration: 4,
      maxGuests: 15,
      includes: [
        "All Meals",
        "Transport",
        "Guide",
        "Hotel",
        "Porter (optional)",
      ],
      images: [
        "https://images.unsplash.com/photo-1632139894726-c4e98e6c3a8a?w=800",
        "https://images.unsplash.com/photo-1626714893820-0df0e5afed82?w=800",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival at Haridwar → Sitapur/Sonprayag",
          description:
            "Arrive at Haridwar or Rishikesh, board the tour vehicle to Sitapur/Sonprayag, check in to guesthouse, orientation session.",
        },
        {
          day: 2,
          title: "Trek to Kedarnath",
          description:
            "Early morning departure for the 16 km trek (or pony/helicopter) to Kedarnath, check in to government camps, evening aarti at the temple.",
        },
        {
          day: 3,
          title: "Kedarnath Darshan & Trek Down",
          description:
            "Brahma Muhurta (early morning) darshan, attend morning abhishek puja, begin descent to Gaurikund, overnight stay.",
        },
        {
          day: 4,
          title: "Return Journey & Departure",
          description:
            "Drive back to Haridwar/Rishikesh, visit Triveni Ghat for Ganga Aarti, departure with divine blessings.",
        },
      ],
      available: true,
    },
  });

  console.log(
    `  ✅  Tours: ${nainitalTour.name}, ${corbettTour.name}, ${kedarnathTour.name}`
  );

  // ── 4. Sample Bookings ────────────────────────────────────────────────────────

  // Booking 1: Past room booking — PAID
  const paidBooking = await prisma.booking.upsert({
    where: { bookingRef: "KB-SEED-PAID-001" },
    update: {
      roomId: deluxeRoom.id,
      totalPrice: 5460,
    },
    create: {
      bookingRef: "KB-SEED-PAID-001",
      type: "room",
      roomId: deluxeRoom.id,
      guestName: "Arjun Sharma",
      guestEmail: "arjun.sharma@gmail.com",
      guestPhone: "9876543210",
      numberOfGuests: 2,
      checkInDate: daysAgo(14),
      checkOutDate: daysAgo(12),
      specialRequests: "Late check-in expected around 10 PM.",
      status: "paid",
      totalPrice: 5460, // 2 nights × ₹2,730
    },
  });

  // Booking 2: Upcoming room booking — PENDING
  const pendingBooking = await prisma.booking.upsert({
    where: { bookingRef: "KB-SEED-PEND-002" },
    update: {
      roomId: deluxeRoom.id,
      totalPrice: 8190,
    },
    create: {
      bookingRef: "KB-SEED-PEND-002",
      type: "room",
      roomId: deluxeRoom.id,
      guestName: "Priya Mehta",
      guestEmail: "priya.mehta@yahoo.co.in",
      guestPhone: "9123456789",
      numberOfGuests: 1,
      checkInDate: daysFromNow(10),
      checkOutDate: daysFromNow(13),
      specialRequests: "Non-smoking room preferred.",
      status: "pending",
      totalPrice: 8190, // 3 nights × ₹2,730
    },
  });

  // Booking 3: Past tour booking — CONFIRMED
  const confirmedBooking = await prisma.booking.upsert({
    where: { bookingRef: "KB-SEED-CONF-003" },
    update: {},
    create: {
      bookingRef: "KB-SEED-CONF-003",
      type: "tour",
      tourId: nainitalTour.id,
      guestName: "Rahul & Family",
      guestEmail: "rahul.kapoor@hotmail.com",
      guestPhone: "9988776655",
      numberOfGuests: 4,
      checkInDate: daysAgo(30),
      checkOutDate: daysAgo(28),
      specialRequests: "Vegetarian meals for all guests.",
      status: "confirmed",
      totalPrice: 26000, // 4 guests × ₹6,500
    },
  });

  console.log(
    `  ✅  Bookings: ${paidBooking.bookingRef}, ${pendingBooking.bookingRef}, ${confirmedBooking.bookingRef}`
  );

  // ── 5. Sample Payments ────────────────────────────────────────────────────────

  // Payment 1: Successful payment for paidBooking
  const successPayment = await prisma.payment.upsert({
    where: { bookingId: paidBooking.id },
    update: {},
    create: {
      bookingId: paidBooking.id,
      amount: 4000,
      currency: "INR",
      paymentMethod: "razorpay",
      razorpayOrderId: "order_seed_success_001",
      razorpayPaymentId: "pay_seed_success_001",
      razorpaySignature: "sig_seed_success_001_placeholder",
      status: PaymentStatus.CAPTURED,
      method: "upi",
    },
  });

  // Payment 2: Failed payment (separate booking attempt)
  const failedPayment = await prisma.payment.upsert({
    where: { bookingId: confirmedBooking.id },
    update: {},
    create: {
      bookingId: confirmedBooking.id,
      amount: 26000,
      currency: "INR",
      paymentMethod: "razorpay",
      razorpayOrderId: "order_seed_failed_002",
      razorpayPaymentId: "pay_seed_failed_002",
      razorpaySignature: "sig_seed_failed_002_placeholder",
      status: PaymentStatus.FAILED,
      method: "card",
    },
  });

  console.log(
    `  ✅  Payments: ${successPayment.id} (CAPTURED), ${failedPayment.id} (FAILED)`
  );

  // ── 6. Contact Inquiries ───────────────────────────────────────────────────

  await prisma.contactInquiry.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "Sneha Joshi",
        email: "sneha.joshi@gmail.com",
        phone: "9871234560",
        subject: "Room availability for New Year",
        message:
          "Hi, I would like to know if the Premium Suite is available for 30th Dec to 2nd Jan. Please let me know the price and any festive packages available.",
        type: "room",
        status: "read",
        read: true,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(3),
      },
      {
        name: "Vikram Singh",
        email: "vikram.singh@outlook.com",
        phone: "9765432100",
        subject: "Kedarnath Yatra group booking query",
        message:
          "We are a group of 8 people planning the Kedarnath Yatra next month. Can you offer a group discount? Also, are porters included in the package?",
        type: "tour",
        status: "new",
        read: false,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
      {
        name: "Anita Rao",
        email: "anita.rao@rediffmail.com",
        phone: null,
        subject: "General enquiry about Khan Bhai S.",
        message:
          "I came across your website and I am very impressed. Could you please share your full brochure and details about all packages? Thank you.",
        type: "general",
        status: "new",
        read: false,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
    ],
  });

  console.log("  ✅  Contact inquiries seeded (3 records)");

  console.log("\n🎉  Seeding complete!\n");
  console.log("  Superadmin — email: admin@khanbhais.in   password: Admin@KhanBhai2024!");
  console.log("  Staff      — email: staff@khanbhais.in  password: Staff@KhanBhai2024!\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
