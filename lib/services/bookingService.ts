import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/lib/errors";
import { generateBookingReference, calculateNights } from "@/lib/utils/helpers";
import { scooterTotal, taxiTotal } from "@/lib/constants/travel";
import { logger } from "@/lib/logger";
import { BOOKING_STATUS_TRANSITIONS } from "@/lib/schemas/bookingSchema";
import type {
  CreateBookingInput,
  UpdateBookingInput,
  ListBookingsQuery,
} from "@/lib/schemas/bookingSchema";

const bookingInclude = {
  room: { select: { id: true, name: true, price: true, maxGuests: true, images: true } },
  tour: { select: { id: true, name: true, price: true, duration: true, destination: true, images: true } },
  payment: true,
} satisfies Prisma.BookingInclude;

const RESTAURANT_CAPACITIES: Record<string, number> = {
  "Luxury Indoors": 40,
  "Garden Lawn": 60,
  "Rooftop": 30,
};

/**
 * Build the Prisma `where` clause for booking listings.
 */
function buildBookingWhere(filters: ListBookingsQuery): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }

  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { bookingRef: { contains: term, mode: "insensitive" } },
      { guestName: { contains: term, mode: "insensitive" } },
      { guestEmail: { contains: term, mode: "insensitive" } },
      { guestPhone: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

const SORT_KEY_MAP: Record<string, keyof Prisma.BookingOrderByWithRelationInput> = {
  createdAt: "createdAt",
  checkInDate: "checkInDate",
  totalPrice: "totalPrice",
  status: "status",
};

export async function getBookings(
  filters: ListBookingsQuery
): Promise<{ items: Awaited<ReturnType<typeof prisma.booking.findMany>>; total: number }> {
  const where = buildBookingWhere(filters);

  const sortField = SORT_KEY_MAP[filters.sortBy] ?? "createdAt";
  const orderBy: Prisma.BookingOrderByWithRelationInput = {
    [sortField]: filters.sortOrder,
  };

  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      take: filters.limit,
      skip: filters.offset,
      orderBy,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total };
}

export async function getBookingById(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
  if (!booking) throw new NotFoundError("Booking not found");
  return booking;
}

/**
 * Check whether `roomId` is free for the requested date range. Used by
 * createBooking AND can be called externally from /api/rooms availability.
 */
export async function isRoomDateRangeFree(
  tx: Prisma.TransactionClient | typeof prisma,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflict = await tx.booking.findFirst({
    where: {
      roomId,
      status: { in: ["pending", "paid", "confirmed"] },
      ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } },
      ],
    },
    select: { id: true },
  });
  return !conflict;
}

/**
 * Create a booking with server-side price calculation, availability check,
 * and a single DB transaction to prevent double-booking races.
 */
export async function createBooking(input: CreateBookingInput) {
  return prisma.$transaction(async (tx) => {
    let totalPrice = 0;
    let roomId: string | undefined;
    let tourId: string | undefined;
    let vehicleType: string | undefined;
    let checkInDate: Date | undefined;
    let checkOutDate: Date | undefined;

    if (input.booking_type === "room") {
      const room = await tx.room.findUnique({
        where: { id: input.room_id! },
        select: {
          id: true,
          available: true,
          maxGuests: true,
          price: true,
        },
      });
      if (!room) throw new NotFoundError("Selected room not found");
      if (!room.available) throw new ConflictError("Room is not available");
      if (input.guests > room.maxGuests) {
        throw new ValidationError(
          `Room supports up to ${room.maxGuests} guests`
        );
      }

      checkInDate = input.check_in!;
      checkOutDate = input.check_out!;

      const free = await isRoomDateRangeFree(
        tx,
        room.id,
        checkInDate,
        checkOutDate
      );
      if (!free) {
        throw new ConflictError("Room is not available for selected dates");
      }

      const nights = calculateNights(checkInDate, checkOutDate);
      if (nights <= 0) {
        throw new ValidationError("Invalid stay duration");
      }
      totalPrice = Number(room.price) * nights;
      roomId = room.id;
    } else if (input.booking_type === "restaurant") {
      const diningArea = input.diningArea || "Luxury Indoors";
      const timeSlot = input.timeSlot || "";
      const checkIn = input.check_in!;

      const startOfDay = new Date(checkIn);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(checkIn);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const bookings = await tx.booking.findMany({
        where: {
          type: "restaurant",
          diningArea,
          timeSlot,
          checkInDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: { in: ["pending", "paid", "confirmed"] },
        },
        select: { numberOfGuests: true },
      });

      const reserved = bookings.reduce((sum, b) => sum + b.numberOfGuests, 0);
      const capacity = RESTAURANT_CAPACITIES[diningArea] ?? 40;

      if (reserved + input.guests > capacity) {
        throw new ConflictError(
          `Only ${capacity - reserved} seats are available in ${diningArea} for ${timeSlot}`
        );
      }

      totalPrice = 200 * input.guests;
      checkInDate = checkIn;
    } else if (input.booking_type === "scooter") {
      // Quantity of scooters is carried in `guests`. Price is computed from the
      // shared catalog (lib/constants/travel.ts) — the single source of truth
      // that the checkout page also reads, so the two can never disagree.
      checkInDate = input.check_in!;
      checkOutDate = input.check_out!;
      const days = calculateNights(checkInDate, checkOutDate);
      if (days <= 0) {
        throw new ValidationError("Invalid rental duration");
      }
      const total = scooterTotal(input.vehicle_type!, days, input.guests);
      if (total === null) {
        throw new NotFoundError("Selected scooter is not available");
      }
      totalPrice = total;
      vehicleType = input.vehicle_type!;
    } else if (input.booking_type === "taxi") {
      // Number of cars is carried in `guests`; pickup time in `timeSlot`.
      const total = taxiTotal(input.vehicle_type!, input.guests);
      if (total === null) {
        throw new NotFoundError("Selected taxi route is not available");
      }
      totalPrice = total;
      vehicleType = input.vehicle_type!;
      checkInDate = input.check_in!;
    } else {
      const tour = await tx.tour.findUnique({
        where: { id: input.tour_id! },
        select: {
          id: true,
          available: true,
          maxGuests: true,
          price: true,
          startDate: true,
          endDate: true,
        },
      });
      if (!tour) throw new NotFoundError("Selected tour not found");
      if (!tour.available) throw new ConflictError("Tour is not available");
      if (input.guests > tour.maxGuests) {
        throw new ValidationError(
          `Tour supports up to ${tour.maxGuests} guests`
        );
      }
      totalPrice = Number(tour.price) * input.guests;
      tourId = tour.id;
      checkInDate = input.check_in ?? tour.startDate ?? undefined;
      checkOutDate = input.check_out ?? tour.endDate ?? undefined;
    }

    if (totalPrice <= 0) {
      throw new ValidationError("Computed booking total is invalid");
    }

    const booking = await tx.booking.create({
      data: {
        bookingRef: generateBookingReference(),
        type: input.booking_type,
        roomId,
        tourId,
        vehicleType,
        guestName: input.customer_name,
        guestEmail: input.customer_email,
        guestPhone: input.customer_phone,
        numberOfGuests: input.guests,
        checkInDate,
        checkOutDate,
        diningArea: input.diningArea,
        timeSlot: input.timeSlot,
        specialRequests: input.special_requests,
        status: "pending",
        totalPrice,
      },
      include: bookingInclude,
    });

    logger.info("booking.created", {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      type: booking.type,
      totalPrice,
    });

    return booking;
  });
}

/**
 * Update a booking. When `status` is changed, the transition is validated
 * against BOOKING_STATUS_TRANSITIONS to prevent illegal moves
 * (e.g. cancelled → paid).
 */
export async function updateBooking(id: string, data: UpdateBookingInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundError("Booking not found");

    if (data.status && data.status !== existing.status) {
      const allowed = BOOKING_STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(data.status)) {
        throw new ConflictError(
          `Cannot transition booking from '${existing.status}' to '${data.status}'`
        );
      }
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.special_requests !== undefined
          ? { specialRequests: data.special_requests }
          : {}),
      },
      include: bookingInclude,
    });

    logger.info("booking.updated", {
      bookingId: id,
      changes: Object.keys(data),
      from: existing.status,
      to: data.status ?? existing.status,
    });

    return updated;
  });
}

/**
 * "Soft delete" a booking by setting status to `cancelled`. We do not actually
 * hard-delete because we want to retain the record for accounting / history.
 */
export async function cancelBooking(id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundError("Booking not found");

    if (existing.status === "cancelled") {
      // Idempotent — return current record.
      return tx.booking.findUniqueOrThrow({
        where: { id },
        include: bookingInclude,
      });
    }

    const allowed = BOOKING_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes("cancelled")) {
      throw new ConflictError(
        `Cannot cancel booking in status '${existing.status}'`
      );
    }

    const updated = await tx.booking.update({
      where: { id },
      data: { status: "cancelled" },
      include: bookingInclude,
    });

    logger.info("booking.cancelled", { bookingId: id });
    return updated;
  });
}

/**
 * Get seat availability for a specific dining area and time slot on a given date.
 */
export async function getRestaurantAvailability(
  date: Date,
  diningArea: string,
  timeSlot: string
): Promise<{ capacity: number; reserved: number; available: number }> {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      type: "restaurant",
      diningArea,
      timeSlot,
      checkInDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { in: ["pending", "paid", "confirmed"] },
    },
    select: { numberOfGuests: true },
  });

  const reserved = bookings.reduce((sum, b) => sum + b.numberOfGuests, 0);
  const capacity = RESTAURANT_CAPACITIES[diningArea] ?? 40;
  const available = Math.max(0, capacity - reserved);

  return { capacity, reserved, available };
}
