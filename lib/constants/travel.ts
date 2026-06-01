/**
 * Travel-desk catalog — Khan Bhai S.
 *
 * Single source of truth for the scooter-rental and taxi/cab services. This
 * module is intentionally PURE (no Prisma, no server-only imports) so it can be
 * imported by BOTH the client (travel page + checkout, for display) AND the
 * server (bookingService, for the authoritative price). One constant read by
 * both sides means the catalog can never drift — the structural fix for the
 * class of bug that broke tour bookings.
 *
 * Pricing model:
 *   - Scooter: dailyRate × days × quantity (priced per day).
 *   - Taxi:    routePrice × cars (fixed price per pre-defined route).
 *
 * All prices are the GST-inclusive final amount the customer pays — matching
 * how room prices are treated across the site.
 */

export interface ScooterModel {
  id: string;
  name: string;
  /** Rental price per day in INR (GST-inclusive). */
  dailyRate: number;
  img: string;
  blurb: string;
}

export interface TaxiRoute {
  id: string;
  name: string;
  /** Flat price for the route in INR (GST-inclusive). */
  price: number;
  img: string;
  blurb: string;
}

export const SCOOTER_MODELS: ScooterModel[] = [
  {
    id: "activa",
    name: "Honda Activa 6G",
    dailyRate: 500,
    img: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
    blurb:
      "The dependable workhorse of the hills. Automatic, easy to ride, helmet and a full tank to start.",
  },
  {
    id: "jupiter",
    name: "TVS Jupiter",
    dailyRate: 450,
    img: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&q=80",
    blurb:
      "Light, frugal, and comfortable for two. A favourite for unhurried day trips around the lakes.",
  },
];

export const TAXI_ROUTES: TaxiRoute[] = [
  {
    id: "route-nainital",
    name: "Haldwani → Nainital",
    price: 2500,
    img: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80",
    blurb: "Private cab up to the lake city. Roughly 1.5 hours, your pace, your stops.",
  },
  {
    id: "route-corbett",
    name: "Haldwani → Jim Corbett",
    price: 3500,
    img: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80",
    blurb: "Door-to-door to the forest gates, with room for bags and safari gear.",
  },
  {
    id: "airport-pickup",
    name: "Airport / Station Pickup",
    price: 1200,
    img: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=1200&q=80",
    blurb: "Meet-and-greet pickup from Pantnagar airport or Haldwani/Kathgodam station.",
  },
  {
    id: "fullday-hire",
    name: "Full-day Cab (8h / 80km)",
    price: 3000,
    img: "https://images.unsplash.com/photo-1543465077-db45d34b88a5?w=1200&q=80",
    blurb: "A car and driver for the whole day — sightseeing on your own itinerary.",
  },
];

export function getScooter(id: string): ScooterModel | undefined {
  return SCOOTER_MODELS.find((s) => s.id === id);
}

export function getTaxiRoute(id: string): TaxiRoute | undefined {
  return TAXI_ROUTES.find((r) => r.id === id);
}

/**
 * Authoritative scooter total in INR. Returns null when the model id is unknown
 * so callers (the booking service) can reject tampered ids with a 404.
 */
export function scooterTotal(
  modelId: string,
  days: number,
  quantity: number
): number | null {
  const model = getScooter(modelId);
  if (!model) return null;
  return model.dailyRate * days * quantity;
}

/**
 * Authoritative taxi total in INR. Returns null when the route id is unknown.
 */
export function taxiTotal(routeId: string, cars: number): number | null {
  const route = getTaxiRoute(routeId);
  if (!route) return null;
  return route.price * cars;
}
