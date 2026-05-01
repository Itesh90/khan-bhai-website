import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  CreateRoomInput,
  UpdateRoomInput,
  ListRoomsQuery,
} from "@/lib/schemas/roomSchema";

const SORT_KEY_MAP: Record<string, keyof Prisma.RoomOrderByWithRelationInput> = {
  createdAt: "createdAt",
  price: "price",
  maxGuests: "maxGuests",
  name: "name",
};

function buildRoomWhere(filters: ListRoomsQuery): Prisma.RoomWhereInput {
  const where: Prisma.RoomWhereInput = {};

  if (filters.capacity) where.maxGuests = { gte: filters.capacity };

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.price = {};
    if (filters.priceMin !== undefined) where.price.gte = filters.priceMin;
    if (filters.priceMax !== undefined) where.price.lte = filters.priceMax;
  }

  if (typeof filters.available === "boolean") {
    where.available = filters.available;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function getRooms(filters: ListRoomsQuery) {
  const where = buildRoomWhere(filters);

  const sortField = SORT_KEY_MAP[filters.sortBy] ?? "createdAt";
  const orderBy: Prisma.RoomOrderByWithRelationInput = {
    [sortField]: filters.sortOrder,
  };

  const [items, total] = await prisma.$transaction([
    prisma.room.findMany({
      where,
      take: filters.limit,
      skip: filters.offset,
      orderBy,
    }),
    prisma.room.count({ where }),
  ]);

  return { items, total };
}

export async function getRoomById(id: string) {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new NotFoundError("Room not found");
  return room;
}

/**
 * Check whether a room is available for a given date range.
 *
 * Considers `room.available` flag plus any overlapping non-cancelled
 * bookings. Pending bookings are treated as occupying the room — otherwise
 * a flood of pending bookings could double-book.
 */
export async function checkAvailability(
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  if (!(checkIn instanceof Date) || !(checkOut instanceof Date)) return false;
  if (checkOut <= checkIn) return false;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { available: true },
  });
  if (!room || !room.available) return false;

  const conflict = await prisma.booking.findFirst({
    where: {
      roomId,
      status: { in: ["pending", "paid", "confirmed"] },
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } },
      ],
    },
    select: { id: true },
  });
  return !conflict;
}

export async function createRoom(data: CreateRoomInput) {
  const room = await prisma.room.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      maxGuests: data.maxGuests,
      amenities: data.amenities,
      images: data.images,
      available: data.available ?? true,
    },
  });
  logger.info("room.created", { roomId: room.id, name: room.name });
  return room;
}

export async function updateRoom(id: string, data: UpdateRoomInput) {
  const exists = await prisma.room.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new NotFoundError("Room not found");

  const room = await prisma.room.update({ where: { id }, data });
  logger.info("room.updated", { roomId: id, changes: Object.keys(data) });
  return room;
}

/**
 * Soft-disable: if a room has active bookings we mark it unavailable
 * rather than allow accidental hard-delete that would null out historical
 * bookings (FK is `onDelete: SetNull`).
 */
export async function deleteRoom(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      bookings: {
        where: { status: { in: ["pending", "paid", "confirmed"] } },
        select: { id: true },
      },
    },
  });
  if (!room) throw new NotFoundError("Room not found");
  if (room.bookings.length > 0) {
    throw new ConflictError("Cannot delete room with active bookings");
  }
  const deleted = await prisma.room.delete({ where: { id } });
  logger.info("room.deleted", { roomId: id });
  return deleted;
}
