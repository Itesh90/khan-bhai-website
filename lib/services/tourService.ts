import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  CreateTourInput,
  UpdateTourInput,
  ListToursQuery,
} from "@/lib/schemas/tourSchema";

const SORT_KEY_MAP: Record<string, keyof Prisma.TourOrderByWithRelationInput> = {
  createdAt: "createdAt",
  price: "price",
  duration: "duration",
  name: "name",
};

function buildTourWhere(filters: ListToursQuery): Prisma.TourWhereInput {
  const where: Prisma.TourWhereInput = {};

  if (filters.destination) {
    where.destination = {
      contains: filters.destination,
      mode: "insensitive",
    };
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.price = {};
    if (filters.priceMin !== undefined) where.price.gte = filters.priceMin;
    if (filters.priceMax !== undefined) where.price.lte = filters.priceMax;
  }

  if (filters.durationMin !== undefined || filters.durationMax !== undefined) {
    where.duration = {};
    if (filters.durationMin !== undefined) where.duration.gte = filters.durationMin;
    if (filters.durationMax !== undefined) where.duration.lte = filters.durationMax;
  }

  if (typeof filters.available === "boolean") {
    where.available = filters.available;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { destination: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function getTours(filters: ListToursQuery) {
  const where = buildTourWhere(filters);
  const sortField = SORT_KEY_MAP[filters.sortBy] ?? "createdAt";
  const orderBy: Prisma.TourOrderByWithRelationInput = {
    [sortField]: filters.sortOrder,
  };

  const [items, total] = await prisma.$transaction([
    prisma.tour.findMany({
      where,
      take: filters.limit,
      skip: filters.offset,
      orderBy,
    }),
    prisma.tour.count({ where }),
  ]);

  return { items, total };
}

export async function getTourById(id: string) {
  const tour = await prisma.tour.findUnique({ where: { id } });
  if (!tour) throw new NotFoundError("Tour not found");
  return tour;
}

export async function createTour(data: CreateTourInput) {
  const tour = await prisma.tour.create({
    data: {
      name: data.name,
      description: data.description,
      destination: data.destination,
      price: data.price,
      duration: data.duration,
      maxGuests: data.maxGuests,
      images: data.images,
      itinerary: data.itinerary as Prisma.InputJsonValue,
      includes: data.includes ?? [],
      available: data.available ?? true,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });
  logger.info("tour.created", { tourId: tour.id, name: tour.name });
  return tour;
}

export async function updateTour(id: string, data: UpdateTourInput) {
  const exists = await prisma.tour.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new NotFoundError("Tour not found");

  // Cast itinerary to JSON if provided.
  const updateData: Prisma.TourUpdateInput = { ...data } as any;
  if (data.itinerary !== undefined) {
    (updateData as any).itinerary = data.itinerary as Prisma.InputJsonValue;
  }

  const tour = await prisma.tour.update({ where: { id }, data: updateData });
  logger.info("tour.updated", { tourId: id, changes: Object.keys(data) });
  return tour;
}

/**
 * Hard-delete only when the tour has no bookings; otherwise raise.
 */
export async function deleteTour(id: string) {
  const tour = await prisma.tour.findUnique({
    where: { id },
    include: {
      bookings: {
        where: { status: { in: ["pending", "paid", "confirmed"] } },
        select: { id: true },
      },
    },
  });
  if (!tour) throw new NotFoundError("Tour not found");
  if (tour.bookings.length > 0) {
    throw new ConflictError("Cannot delete tour with active bookings");
  }
  const deleted = await prisma.tour.delete({ where: { id } });
  logger.info("tour.deleted", { tourId: id });
  return deleted;
}
