import { z } from "zod";

export const createRoomSchema = z.object({
  name: z
    .string({ required_error: "Room name is required" })
    .trim()
    .min(2, "Room name is required")
    .max(120, "Room name is too long"),
  description: z
    .string({ required_error: "Description is required" })
    .trim()
    .min(10, "Description is too short")
    .max(5000, "Description is too long"),
  price: z
    .number({ invalid_type_error: "price must be a number" })
    .positive("price must be greater than 0")
    .max(1_000_000, "price exceeds maximum"),
  maxGuests: z
    .number({ invalid_type_error: "maxGuests must be a number" })
    .int("maxGuests must be an integer")
    .min(1, "maxGuests must be at least 1")
    .max(50, "maxGuests is too high"),
  amenities: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  images: z
    .array(z.string().trim().url("Invalid image URL"))
    .max(20, "Too many images")
    .default([]),
  available: z.boolean().optional().default(true),
});

export const updateRoomSchema = createRoomSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  "At least one field must be provided to update"
);

export const listRoomsQuerySchema = z.object({
  capacity: z.coerce.number().int().min(1).optional(),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().positive().optional(),
  available: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().trim().max(120).optional(),
  sortBy: z.enum(["price", "maxGuests", "createdAt", "name"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
