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
      price: 2400,
      available: true,
    },
    create: {
      id: "deluxe",
      name: "Deluxe Room",
      description:
        "Elegantly furnished deluxe room featuring a relaxing balcony, workspace, and comfortable king bed.",
      price: 2400,
      maxGuests: 2,
      amenities: ["WiFi", "AC", "TV", "Balcony", "Workspace"],
      images: [
        "/images/stay/deluxe-room.jpg",
        "/images/stay/deluxe-room-2.jpg",
        "/images/stay/deluxe-room-3.jpg",
      ],
      available: true,
    },
  });

  const premiumSuite = await prisma.room.upsert({
    where: { id: "balcony" },
    update: {
      price: 3000,
      name: "Room with Balcony View",
      available: true,
    },
    create: {
      id: "balcony",
      name: "Room with Balcony View",
      description:
        "Premium room with a vaulted ceiling and a beautiful sit-out balcony offering stunning views of the valley.",
      price: 3000,
      maxGuests: 2,
      amenities: ["WiFi", "AC", "TV", "Balcony View", "Mini Bar"],
      images: [
        "/images/stay/balcony-room.jpg",
        "/images/stay/balcony-room-2.jpg",
        "/images/stay/balcony-room-3.jpg",
        "/images/stay/balcony-room-4.jpg",
      ],
      available: true,
    },
  });

  const familyRoom = await prisma.room.upsert({
    where: { id: "suite" },
    update: {
      price: 7500,
      name: "Sweet Room",
      available: true,
    },
    create: {
      id: "suite",
      name: "Sweet Room",
      description:
        "Spacious split-level loft with a private wooden staircase, four beds, a sit-out balcony, and a separate lounge area.",
      price: 7500,
      maxGuests: 4,
      amenities: [
        "WiFi",
        "AC",
        "TV",
        "Private Balcony",
        "Lounge Area",
        "Four beds",
      ],
      images: [
        "/images/stay/loft-suite.jpg",
        "/images/stay/loft-suite-2.jpg",
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
    update: { name: "Char Dham & Kedarnath", price: 12000, duration: 4, available: true },
    create: {
      id: "kedarnath",
      name: "Char Dham & Kedarnath",
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

  // ── 3b. Kumaon traveller-type packages ───────────────────────────────────────
  // Segmented by who's travelling (family / solo / adventure / group) the way
  // peer operators in the region package their trips. Ids are the slug the
  // public catalogue links with (?type=tour&id=…) and match the tour_id regex.

  const familyBlissTour = await prisma.tour.upsert({
    where: { id: "family-bliss" },
    update: { name: "Nainital Family Bliss", price: 6000, duration: 3, available: true },
    create: {
      id: "family-bliss",
      name: "Nainital Family Bliss",
      description:
        "Nainital without the noise, at a pace that suits children and grandparents alike. Lakeside cottage, gentle sightseeing, and an easy day trip to Bhimtal.",
      destination: "Nainital & Bhimtal, Uttarakhand",
      price: 6000,
      duration: 3,
      maxGuests: 18,
      includes: ["Breakfast", "Transport", "Cottage Stay", "Boat Ride"],
      images: ["/images/travel/IMG_1771.jpg"],
      itinerary: [
        {
          day: 1,
          title: "Soft Arrival",
          description:
            "Check in to a lakeside cottage with a lake-view balcony, evening boat ride on Naini Lake, and a Mall Road stroll with an ice-cream stop.",
        },
        {
          day: 2,
          title: "Gentle Mix",
          description:
            "Morning cable-car to Snow View, short pony rides for the children, lunch back at the cottage, and an easy garden walk to Echo Point.",
        },
        {
          day: 3,
          title: "Calm Exit",
          description:
            "Cab to Bhimtal, feeding the fish at the dock, a packed picnic lunch by the water, and return to Nainital by noon for checkout.",
        },
      ],
      available: true,
    },
  });

  const soloSerenityTour = await prisma.tour.upsert({
    where: { id: "solo-serenity" },
    update: { name: "Solo Serenity Retreat", price: 7500, duration: 3, available: true },
    create: {
      id: "solo-serenity",
      name: "Solo Serenity Retreat",
      description:
        "No guide, no group, nothing forced. A private cottage by the lake, an unhurried lake walk, and as much or as little as you feel like doing.",
      destination: "Nainital & Bhimtal, Uttarakhand",
      price: 7500,
      duration: 3,
      // Marketed as a solo retreat, but the per-person rate also covers a small
      // group who want the same quiet itinerary — capped low to keep it intimate.
      maxGuests: 4,
      includes: ["Private AC Cottage", "Breakfast", "One Boat Ride", "Local Cab"],
      images: ["/images/travel/IMG_1763.png"],
      itinerary: [
        {
          day: 1,
          title: "Arrival & Anchor",
          description:
            "Settle in to a private AC cottage with lake views, a solo sunset boat ride on Naini Lake, and herbal chai on the Mallital promenade.",
        },
        {
          day: 2,
          title: "Breathe Easy",
          description:
            "An easy 2 km lake-circuit walk in the morning, fresh apple cider at a roadside stall, and an afternoon entirely your own — read, write, or simply rest.",
        },
        {
          day: 3,
          title: "Bhimtal Drift",
          description:
            "A short cab transfer to Bhimtal, leisure time by the dock, return to Nainital by noon, and an unhurried checkout.",
        },
      ],
      available: true,
    },
  });

  const gangbaazTour = await prisma.tour.upsert({
    where: { id: "gangbaaz" },
    update: { name: "Gangbaaz Adventure Pack", price: 8500, duration: 3, available: true },
    create: {
      id: "gangbaaz",
      name: "Gangbaaz Adventure Pack",
      description:
        "For the ones who came to do, not just to look. Tandem paragliding, a Tiffin Top trek, ridge cycling, and a BBQ night — three days at full tilt.",
      destination: "Nainital & Bhimtal, Uttarakhand",
      price: 8500,
      duration: 3,
      maxGuests: 16,
      includes: [
        "Shared AC Stay",
        "Breakfast + BBQ Dinner",
        "Cabs",
        "Paragliding (1 slot / 2 people)",
        "Boating",
        "Ropeway",
      ],
      images: ["/images/travel/IMG_1767.jpg"],
      itinerary: [
        {
          day: 1,
          title: "Crash & Launch",
          description:
            "Check in to a lakeside guesthouse, then a tandem paragliding flight over Naini Lake, followed by an evening out on Mall Road.",
        },
        {
          day: 2,
          title: "Grind Light",
          description:
            "A 40-minute trek to Tiffin Top with summit photos, ropeway descent, afternoon cycling around the ridge, and a self-grilled BBQ dinner at the lodge.",
        },
        {
          day: 3,
          title: "Bhimtal Blitz",
          description:
            "Cab to Bhimtal for motor-boating, optional zip-lining over the water, an apple-orchard photo stop, and checkout by 1 PM.",
        },
      ],
      available: true,
    },
  });

  const kumaonGrandTour = await prisma.tour.upsert({
    where: { id: "kumaon-grand" },
    update: { name: "Nainital · Ranikhet · Corbett", price: 18000, duration: 7, available: true },
    create: {
      id: "kumaon-grand",
      name: "Nainital · Ranikhet · Corbett",
      description:
        "The grand Kumaon loop in seven unhurried days — the lakes of Nainital, the vintage cantonment calm of Ranikhet, and the wild edges of Jim Corbett.",
      destination: "Nainital · Ranikhet · Corbett, Uttarakhand",
      price: 18000,
      duration: 7,
      maxGuests: 14,
      includes: ["Daily Breakfast & Dinner", "All Transport", "Hotels", "Guide"],
      images: ["/images/travel/IMG_1773.jpg"],
      itinerary: [
        {
          day: 1,
          title: "Arrival at Kathgodam / Nainital",
          description:
            "Pickup at Kathgodam or Nainital, hotel check-in, and an easy first evening on Mall Road and the Tibetan market.",
        },
        {
          day: 2,
          title: "Nainital Sightseeing",
          description:
            "Himalaya Darshan viewpoint, Kilbury forest, a tea break at Pangot, Cave Garden, cable-car to Snow View, boating on Naini Lake, and Hanuman Garhi.",
        },
        {
          day: 3,
          title: "Nainital to Ranikhet",
          description:
            "Drive to Ranikhet and settle in to its old-world, vintage-military calm and wide Himalayan views.",
        },
        {
          day: 4,
          title: "Ranikhet Exploration",
          description:
            "War Memorial Museum, Chaubatia Gardens, and the famous Golf Course, ending with sunset over the snow peaks.",
        },
        {
          day: 5,
          title: "Ranikhet to Corbett",
          description:
            "Long, scenic drive to Jim Corbett, check in to a jungle resort, and an evening riverside walk along the Kosi.",
        },
        {
          day: 6,
          title: "Corbett Day",
          description:
            "Optional early-morning jungle safari (booked in advance), Corbett Falls, and the Sitabani forest, with a free evening.",
        },
        {
          day: 7,
          title: "Departure",
          description:
            "Breakfast and the return drive, with drop to your station or onward route.",
        },
      ],
      available: true,
    },
  });

  const kumaonDarshanTour = await prisma.tour.upsert({
    where: { id: "kumaon-darshan" },
    update: { name: "Kumaon Darshan", price: 22000, duration: 8, available: true },
    create: {
      id: "kumaon-darshan",
      name: "Kumaon Darshan",
      description:
        "The deep eight-day Kumaon circuit — Kausani, Chaukori, Munsiyari, the caves of Patal Bhuvaneshwar, and the ancient temples of Jageshwar and Almora.",
      destination: "Kausani · Munsiyari · Jageshwar · Almora, Uttarakhand",
      price: 22000,
      duration: 8,
      maxGuests: 14,
      includes: ["Daily Breakfast & Dinner", "All Transport", "Hotels", "Temple Guide"],
      images: ["/images/travel/IMG_1765.jpg"],
      itinerary: [
        {
          day: 1,
          title: "Nainital to Kausani",
          description:
            "Via Bhowali, Kainchi Dham, and Ranikhet (Himalaya viewpoint, Kalika temple, shawl factory). Night halt at Kausani.",
        },
        {
          day: 2,
          title: "Kausani to Chaukori",
          description:
            "Tea gardens, the ancient Baijnath temple, and Bageshwar en route to Chaukori. Night halt at Chaukori.",
        },
        {
          day: 3,
          title: "Chaukori to Munsiyari",
          description:
            "Through Thal and the high Birthi Falls to the trekking town of Munsiyari. Night halt at Munsiyari.",
        },
        {
          day: 4,
          title: "Munsiyari Sightseeing",
          description:
            "Nanda Devi temple and the tribal heritage museum, with the Panchachuli peaks in view. Night halt at Munsiyari.",
        },
        {
          day: 5,
          title: "Munsiyari to Patal Bhuvaneshwar",
          description:
            "Drive to the limestone cave-temple of Patal Bhuvaneshwar. Night halt nearby.",
        },
        {
          day: 6,
          title: "To Jageshwar",
          description:
            "The Jageshwar Dham complex of over a hundred ancient stone temples set in deodar forest. Night halt at Jageshwar.",
        },
        {
          day: 7,
          title: "Jageshwar to Almora",
          description:
            "Lakhudiyar's prehistoric cave paintings and the Chitai Golu Devta temple. Night halt at Almora.",
        },
        {
          day: 8,
          title: "Almora to Kathgodam",
          description:
            "Via Ghorakhal, Bhimtal, and Sattal for the drive back, with drop at Kathgodam.",
        },
      ],
      available: true,
    },
  });

  console.log(
    `  ✅  Tours: ${nainitalTour.name}, ${corbettTour.name}, ${kedarnathTour.name}, ` +
      `${familyBlissTour.name}, ${soloSerenityTour.name}, ${gangbaazTour.name}, ` +
      `${kumaonGrandTour.name}, ${kumaonDarshanTour.name}`
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
