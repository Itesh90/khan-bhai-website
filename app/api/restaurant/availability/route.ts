import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError, ValidationError } from "@/lib/errors";
import { getRestaurantAvailability } from "@/lib/services/bookingService";
import { newRequestId } from "@/lib/logger";

/**
 * GET /api/restaurant/availability — Check availability for table bookings.
 *
 * Query params:
 *   - date: ISO date string (YYYY-MM-DD)
 *   - diningArea: "Luxury Indoors" | "Garden Lawn" | "Rooftop"
 *   - timeSlot: "12:00 PM" etc.
 */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get("date");
    const diningArea = searchParams.get("diningArea");
    const timeSlot = searchParams.get("timeSlot");

    if (!dateStr || !diningArea || !timeSlot) {
      throw new ValidationError(
        "Missing required parameters: date, diningArea, and timeSlot are required"
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new ValidationError("Invalid date format. Use YYYY-MM-DD");
    }

    const availability = await getRestaurantAvailability(
      date,
      diningArea,
      timeSlot
    );

    return successResponse(availability, { requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "GET /api/restaurant/availability",
    });
  }
}
