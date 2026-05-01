import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import { validateBookingUpdate } from "@/lib/services/validationService";
import {
  cancelBooking,
  getBookingById,
  updateBooking,
} from "@/lib/services/bookingService";
import { newRequestId } from "@/lib/logger";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/bookings/[id] — Admin only.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const booking = await getBookingById(params.id);
    return successResponse(booking, { requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "GET /api/bookings/[id]",
    });
  }
}

/**
 * PATCH /api/bookings/[id] — Admin only. Update status or special_requests.
 * Status transitions are validated server-side.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const body = await req.json();
    const data = validateBookingUpdate(body);
    const booking = await updateBooking(params.id, data);
    return successResponse(booking, {
      message: "Booking updated",
      requestId,
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "PATCH /api/bookings/[id]",
    });
  }
}

/**
 * DELETE /api/bookings/[id] — Admin only. Soft-delete (sets status=cancelled).
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const booking = await cancelBooking(params.id);
    return successResponse(booking, {
      message: "Booking cancelled",
      requestId,
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "DELETE /api/bookings/[id]",
    });
  }
}
