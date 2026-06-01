import { describe, it, expect } from "vitest";
import {
  SCOOTER_MODELS,
  TAXI_ROUTES,
  getScooter,
  getTaxiRoute,
  scooterTotal,
  taxiTotal,
} from "@/lib/constants/travel";

describe("travel catalog", () => {
  it("ships 2 scooter models and 4 taxi routes", () => {
    expect(SCOOTER_MODELS).toHaveLength(2);
    expect(TAXI_ROUTES).toHaveLength(4);
  });

  it("every catalog id is lowercase/digits/hyphen so it passes the booking vehicle_type regex", () => {
    const re = /^[a-z0-9-]+$/;
    for (const s of SCOOTER_MODELS) expect(s.id).toMatch(re);
    for (const r of TAXI_ROUTES) expect(r.id).toMatch(re);
  });
});

describe("getScooter / getTaxiRoute", () => {
  it("resolves a known scooter by id", () => {
    expect(getScooter("activa")).toMatchObject({ name: "Honda Activa 6G", dailyRate: 500 });
  });

  it("resolves a known taxi route by id", () => {
    expect(getTaxiRoute("route-nainital")).toMatchObject({
      name: "Haldwani → Nainital",
      price: 2500,
    });
  });

  it("returns undefined for unknown ids", () => {
    expect(getScooter("nope")).toBeUndefined();
    expect(getTaxiRoute("nope")).toBeUndefined();
  });
});

describe("scooterTotal", () => {
  it("is dailyRate × days × quantity", () => {
    expect(scooterTotal("activa", 2, 1)).toBe(1000); // 500 × 2 × 1
    expect(scooterTotal("activa", 3, 2)).toBe(3000); // 500 × 3 × 2
    expect(scooterTotal("jupiter", 1, 1)).toBe(450);
  });

  it("returns null for an unknown scooter id", () => {
    expect(scooterTotal("nope", 2, 1)).toBeNull();
  });
});

describe("taxiTotal", () => {
  it("is routePrice × cars", () => {
    expect(taxiTotal("route-nainital", 1)).toBe(2500);
    expect(taxiTotal("fullday-hire", 2)).toBe(6000); // 3000 × 2
  });

  it("returns null for an unknown route id", () => {
    expect(taxiTotal("nope", 1)).toBeNull();
  });
});
