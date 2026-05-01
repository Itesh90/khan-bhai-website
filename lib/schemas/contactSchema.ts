import { z } from "zod";

/**
 * Indian phone — optional in the contact form. Accepts the same formats as
 * the booking schema and normalizes to a bare 10-digit string. If the user
 * leaves it blank, we map empty/whitespace to `undefined`.
 */
const indianPhoneOptional = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .transform((d) => (d.length === 12 && d.startsWith("91") ? d.slice(2) : d))
  .refine(
    (v) => v.length === 0 || /^[6-9]\d{9}$/.test(v),
    "Please enter a valid 10-digit Indian mobile number"
  )
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional();

export const createContactSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name is required")
    .max(120, "Name is too long"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  phone: indianPhoneOptional,
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(5, "Message is too short")
    .max(5000, "Message is too long"),
  type: z.enum(["room", "tour", "general"]).default("general"),
  subject: z.string().trim().max(200).optional(),
});

export const updateContactSchema = z
  .object({
    read: z.boolean().optional(),
    status: z.enum(["new", "read", "responded"]).optional(),
  })
  .refine(
    (d) => d.read !== undefined || d.status !== undefined,
    "At least one field must be provided to update"
  );

export const listContactQuerySchema = z.object({
  type: z.enum(["room", "tour", "general"]).optional(),
  read: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().trim().max(120).optional(),
  sortBy: z.enum(["createdAt", "name", "type"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminLoginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password is too long"),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactQuery = z.infer<typeof listContactQuerySchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
