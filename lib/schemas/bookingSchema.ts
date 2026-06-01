import { z } from "zod";

/**
 * Indian mobile phone — exactly 10 digits starting with 6/7/8/9, after stripping
 * an optional +91 / 91 country code and any whitespace, dashes or parentheses.
 *
 * Stored canonical form: bare 10 digits.
 */
const indianPhoneSchema = z
  .string({ required_error: "Phone number is required" })
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .transform((digits) =>
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits
  )
  .refine(
    (v) => /^[6-9]\d{9}$/.test(v),
    "Please enter a valid 10-digit Indian mobile number"
  );

const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address")
  .max(255, "Email is too long");

const nameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(120, "Name is too long");

/** Reject dates clearly in the past (allow same-day check-ins). */
const futureDateSchema = z.coerce
  .date({ invalid_type_error: "Invalid date" })
  .refine((d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
  }, "Date must not be in the past");

export const createBookingSchema = z
  .object({
    booking_type: z.enum(["room", "tour", "restaurant", "scooter", "taxi"], {
      errorMap: () => ({
        message:
          "booking_type must be 'room', 'tour', 'restaurant', 'scooter' or 'taxi'",
      }),
    }),
    customer_name: nameSchema,
    customer_email: emailSchema,
    customer_phone: indianPhoneSchema,
    guests: z
      .number({ invalid_type_error: "guests must be a number" })
      .int("guests must be an integer")
      .min(1, "At least 1 guest is required")
      .max(50, "Too many guests"),
    // Accept both cuids (default Prisma id) and slug-style ids the seed uses
    // for the user-facing room/tour catalogue (e.g. "deluxe", "balcony").
    room_id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, "Invalid room id")
      .optional(),
    tour_id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, "Invalid tour id")
      .optional(),
    // Scooter model id or taxi route id (matches lib/constants/travel.ts ids).
    vehicle_type: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, "Invalid vehicle type")
      .optional(),
    check_in: futureDateSchema.optional(),
    check_out: z.coerce.date().optional(),
    diningArea: z.string().optional(),
    timeSlot: z.string().optional(),
    special_requests: z
      .string()
      .trim()
      .max(2000, "Special requests are too long")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.booking_type === "room") {
      if (!data.room_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "room_id is required for room bookings",
          path: ["room_id"],
        });
      }
      if (!data.check_in || !data.check_out) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "check_in and check_out are required for room bookings",
          path: ["check_in"],
        });
      } else if (data.check_out <= data.check_in) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "check_out must be after check_in",
          path: ["check_out"],
        });
      } else {
        // Sanity: cap stays at 90 nights to catch obvious tampering.
        const ms = data.check_out.getTime() - data.check_in.getTime();
        const nights = Math.ceil(ms / (1000 * 60 * 60 * 24));
        if (nights > 90) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Stay cannot exceed 90 nights — please contact us for long stays",
            path: ["check_out"],
          });
        }
      }
    }
    if (data.booking_type === "tour" && !data.tour_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "tour_id is required for tour bookings",
        path: ["tour_id"],
      });
    }
    if (data.booking_type === "restaurant") {
      if (!data.check_in) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dining date is required for table bookings",
          path: ["check_in"],
        });
      }
      if (!data.diningArea) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dining Area is required for table bookings",
          path: ["diningArea"],
        });
      }
      if (!data.timeSlot) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Time slot is required for table bookings",
          path: ["timeSlot"],
        });
      }
    }
    if (data.booking_type === "scooter") {
      if (!data.vehicle_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A scooter model is required for scooter rentals",
          path: ["vehicle_type"],
        });
      }
      if (!data.check_in || !data.check_out) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rental start and end dates are required for scooter rentals",
          path: ["check_in"],
        });
      } else if (data.check_out <= data.check_in) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rental end date must be after the start date",
          path: ["check_out"],
        });
      } else {
        // Cap rentals at 30 days to catch obvious tampering.
        const ms = data.check_out.getTime() - data.check_in.getTime();
        const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
        if (days > 30) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Scooter rentals cannot exceed 30 days — please contact us",
            path: ["check_out"],
          });
        }
      }
    }
    if (data.booking_type === "taxi") {
      if (!data.vehicle_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A taxi route is required for taxi bookings",
          path: ["vehicle_type"],
        });
      }
      if (!data.check_in) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Travel date is required for taxi bookings",
          path: ["check_in"],
        });
      }
      if (!data.timeSlot) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pickup time is required for taxi bookings",
          path: ["timeSlot"],
        });
      }
    }
  });

/**
 * Allowed status transitions enforced at the service layer. Centralised in
 * lib/payments/stateMachine.ts and re-exported here for backwards-compatible
 * imports.
 */
export { BOOKING_STATUS_TRANSITIONS } from "@/lib/payments/stateMachine";

export const updateBookingSchema = z
  .object({
    status: z.enum(["pending", "paid", "confirmed", "cancelled"]).optional(),
    special_requests: z.string().trim().max(2000).optional(),
  })
  .refine(
    (d) => d.status !== undefined || d.special_requests !== undefined,
    "At least one field must be provided to update"
  );

export const listBookingsQuerySchema = z.object({
  status: z.enum(["pending", "paid", "confirmed", "cancelled"]).optional(),
  type: z.enum(["room", "tour", "restaurant", "scooter", "taxi"]).optional(),
  search: z.string().trim().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z
    .enum(["createdAt", "checkInDate", "totalPrice", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
