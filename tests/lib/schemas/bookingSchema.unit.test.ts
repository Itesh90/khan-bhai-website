import { describe, it, expect } from "vitest";
import { createBookingSchema } from "@/lib/schemas/bookingSchema";

const DAY = 86_400_000;
const future = (days: number) =>
  new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

const who = {
  customer_name: "Asha Devi",
  customer_email: "asha@example.com",
  customer_phone: "9876543210",
  guests: 1,
};

describe("createBookingSchema — scooter", () => {
  const base = {
    booking_type: "scooter" as const,
    vehicle_type: "activa",
    check_in: future(1),
    check_out: future(3),
    ...who,
  };

  it("accepts a well-formed scooter booking", () => {
    expect(createBookingSchema.safeParse(base).success).toBe(true);
  });

  it("requires vehicle_type", () => {
    const { vehicle_type, ...rest } = base;
    expect(createBookingSchema.safeParse(rest).success).toBe(false);
  });

  it("requires both a start and end date", () => {
    const { check_out, ...rest } = base;
    expect(createBookingSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an end date that is not after the start date", () => {
    const bad = { ...base, check_in: future(3), check_out: future(3) };
    expect(createBookingSchema.safeParse(bad).success).toBe(false);
  });
});

describe("createBookingSchema — taxi", () => {
  const base = {
    booking_type: "taxi" as const,
    vehicle_type: "route-nainital",
    check_in: future(2),
    timeSlot: "9:00 AM",
    ...who,
  };

  it("accepts a well-formed taxi booking", () => {
    expect(createBookingSchema.safeParse(base).success).toBe(true);
  });

  it("requires vehicle_type", () => {
    const { vehicle_type, ...rest } = base;
    expect(createBookingSchema.safeParse(rest).success).toBe(false);
  });

  it("requires a travel date", () => {
    const { check_in, ...rest } = base;
    expect(createBookingSchema.safeParse(rest).success).toBe(false);
  });

  it("requires a pickup time slot", () => {
    const { timeSlot, ...rest } = base;
    expect(createBookingSchema.safeParse(rest).success).toBe(false);
  });
});
