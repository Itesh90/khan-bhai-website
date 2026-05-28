import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError, ValidationError } from "@/lib/errors";
import { checkAvailability } from "@/lib/services/roomService";
import { newRequestId } from "@/lib/logger";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/rooms/[id]/availability — Check if a room is available for given dates.
 *
 * Query params:
 *   - checkIn: ISO date string (YYYY-MM-DD)
 *   - checkOut: ISO date string (YYYY-MM-DD)
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    const { searchParams } = request.nextUrl;
    const checkInStr = searchParams.get("checkIn");
    const checkOutStr = searchParams.get("checkOut");

    if (!checkInStr || !checkOutStr) {
      throw new ValidationError("checkIn and checkOut dates are required");
    }

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new ValidationError("Invalid checkIn or checkOut date format");
    }

    if (checkOut <= checkIn) {
      throw new ValidationError("checkOut date must be after checkIn date");
    }

    const isAvailable = await checkAvailability(params.id, checkIn, checkOut);

    return successResponse({ available: isAvailable }, { requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: `GET /api/rooms/${params.id}/availability`,
    });
  }
}
