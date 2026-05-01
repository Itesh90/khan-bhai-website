import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import { validateTourUpdate } from "@/lib/services/validationService";
import {
  deleteTour,
  getTourById,
  updateTour,
} from "@/lib/services/tourService";
import { newRequestId } from "@/lib/logger";

interface Ctx {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    const tour = await getTourById(params.id);
    return successResponse(tour, { requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "GET /api/tours/[id]",
    });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const data = validateTourUpdate(await req.json());
    const tour = await updateTour(params.id, data);
    return successResponse(tour, { message: "Tour updated", requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "PATCH /api/tours/[id]",
    });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    await deleteTour(params.id);
    return successResponse(
      { id: params.id },
      { message: "Tour deleted", requestId }
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "DELETE /api/tours/[id]",
    });
  }
}
