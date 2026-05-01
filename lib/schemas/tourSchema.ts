import { z } from "zod";

export const createTourSchema = z
  .object({
    name: z
      .string({ required_error: "Tour name is required" })
      .trim()
      .min(2, "Tour name is required")
      .max(160, "Tour name is too long"),
    description: z
      .string({ required_error: "Description is required" })
      .trim()
      .min(10, "Description is too short")
      .max(8000, "Description is too long"),
    destination: z
      .string({ required_error: "Destination is required" })
      .trim()
      .min(2, "Destination is required")
      .max(160, "Destination is too long"),
    price: z
      .number({ invalid_type_error: "price must be a number" })
      .positive("price must be greater than 0")
      .max(1_000_000, "price exceeds maximum"),
    duration: z
      .number({ invalid_type_error: "duration must be a number" })
      .int("duration must be an integer")
      .min(1, "duration must be at least 1 day")
      .max(365, "duration is too long"),
    maxGuests: z
      .number({ invalid_type_error: "maxGuests must be a number" })
      .int("maxGuests must be an integer")
      .min(1)
      .max(200),
    images: z
      .array(z.string().trim().url("Invalid image URL"))
      .max(20)
      .default([]),
    /**
     * Itinerary may be a free-text string OR a structured array of day objects.
     * The DB column is JSON so we accept both shapes.
     */
    itinerary: z.union([
      z
        .string({ required_error: "itinerary is required" })
        .trim()
        .min(1, "itinerary is required"),
      z
        .array(
          z.object({
            day: z.number().int().positive(),
            title: z.string().trim().min(1),
            description: z.string().trim().min(1),
          })
        )
        .min(1, "itinerary must contain at least one day"),
    ]),
    includes: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
    available: z.boolean().optional().default(true),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be after startDate",
        path: ["endDate"],
      });
    }
  });

export const updateTourSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().min(10).max(8000).optional(),
    destination: z.string().trim().min(2).max(160).optional(),
    price: z.number().positive().max(1_000_000).optional(),
    duration: z.number().int().min(1).max(365).optional(),
    maxGuests: z.number().int().min(1).max(200).optional(),
    images: z.array(z.string().url()).max(20).optional(),
    itinerary: z
      .union([
        z.string().trim().min(1),
        z.array(
          z.object({
            day: z.number().int().positive(),
            title: z.string().trim().min(1),
            description: z.string().trim().min(1),
          })
        ),
      ])
      .optional(),
    includes: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
    available: z.boolean().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (d) => Object.keys(d).length > 0,
    "At least one field must be provided to update"
  );

export const listToursQuerySchema = z.object({
  destination: z.string().trim().max(160).optional(),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().positive().optional(),
  durationMin: z.coerce.number().int().min(1).optional(),
  durationMax: z.coerce.number().int().min(1).optional(),
  available: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().trim().max(120).optional(),
  sortBy: z
    .enum(["price", "duration", "createdAt", "name"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateTourInput = z.infer<typeof createTourSchema>;
export type UpdateTourInput = z.infer<typeof updateTourSchema>;
export type ListToursQuery = z.infer<typeof listToursQuerySchema>;
