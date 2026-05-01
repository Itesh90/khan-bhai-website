import type { ZodTypeAny, z } from "zod";
import { ValidationError } from "@/lib/errors";
import {
  createBookingSchema,
  updateBookingSchema,
  listBookingsQuerySchema,
} from "@/lib/schemas/bookingSchema";
import {
  createRoomSchema,
  updateRoomSchema,
  listRoomsQuerySchema,
} from "@/lib/schemas/roomSchema";
import {
  createTourSchema,
  updateTourSchema,
  listToursQuerySchema,
} from "@/lib/schemas/tourSchema";
import {
  createContactSchema,
  updateContactSchema,
  listContactQuerySchema,
} from "@/lib/schemas/contactSchema";

/**
 * Validate `data` with `schema`. On failure, throws a ValidationError that the
 * global error handler converts into a 400 response.
 */
export function validate<S extends ZodTypeAny>(
  schema: S,
  data: unknown
): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("Invalid input", result.error.flatten());
  }
  return result.data;
}

export const validateBooking = (data: unknown) =>
  validate(createBookingSchema, data);
export const validateBookingUpdate = (data: unknown) =>
  validate(updateBookingSchema, data);
export const validateBookingsQuery = (data: unknown) =>
  validate(listBookingsQuerySchema, data);

export const validateRoom = (data: unknown) => validate(createRoomSchema, data);
export const validateRoomUpdate = (data: unknown) =>
  validate(updateRoomSchema, data);
export const validateRoomsQuery = (data: unknown) =>
  validate(listRoomsQuerySchema, data);

export const validateTour = (data: unknown) => validate(createTourSchema, data);
export const validateTourUpdate = (data: unknown) =>
  validate(updateTourSchema, data);
export const validateToursQuery = (data: unknown) =>
  validate(listToursQuerySchema, data);

export const validateContact = (data: unknown) =>
  validate(createContactSchema, data);
export const validateContactUpdate = (data: unknown) =>
  validate(updateContactSchema, data);
export const validateContactQuery = (data: unknown) =>
  validate(listContactQuerySchema, data);

/**
 * Convert URLSearchParams to a plain object suitable for Zod parsing.
 */
export function searchParamsToObject(
  searchParams: URLSearchParams
): Record<string, string> {
  const obj: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}
