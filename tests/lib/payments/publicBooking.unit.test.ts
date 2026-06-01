import { describe, it, expect } from "vitest";
import { toPublicBooking } from "@/lib/services/publicBooking";

const baseScooter = {
  bookingRef: "KB-SCOOT01",
  guestName: "Asha Devi",
  type: "scooter",
  status: "paid",
  totalPrice: 1000,
  vehicleType: "activa",
};

const baseTaxi = {
  bookingRef: "KB-TAXI01",
  guestName: "Asha Devi",
  type: "taxi",
  status: "paid",
  totalPrice: 2500,
  vehicleType: "route-nainital",
};

describe("toPublicBooking — scooter/taxi item name", () => {
  it("names a scooter booking by its catalog model", () => {
    expect(toPublicBooking(baseScooter).itemName).toBe("Honda Activa 6G");
  });

  it("names a taxi booking by its catalog route", () => {
    expect(toPublicBooking(baseTaxi).itemName).toBe("Haldwani → Nainital");
  });

  it("falls back gracefully when the vehicle id is unknown", () => {
    expect(toPublicBooking({ ...baseScooter, vehicleType: "ghost" }).itemName).toBe(
      "Scooter rental"
    );
    expect(toPublicBooking({ ...baseTaxi, vehicleType: "ghost" }).itemName).toBe(
      "Taxi booking"
    );
  });

  it("carries the booking type through as itemType", () => {
    expect(toPublicBooking(baseScooter).itemType).toBe("scooter");
    expect(toPublicBooking(baseTaxi).itemType).toBe("taxi");
  });
});
