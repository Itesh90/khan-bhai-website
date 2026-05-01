import { NextRequest } from "next/server";
import { successResponse, buildPagination } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import {
  validateTour,
  validateToursQuery,
  searchParamsToObject,
} from "@/lib/services/validationService";
import { createTour, getTours } from "@/lib/services/tourService";
import { newRequestId } from "@/lib/logger";

/**
 * GET /api/tours — Public.
 */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const filters = validateToursQuery(
      searchParamsToObject(request.nextUrl.searchParams)
    );
    const { items, total } = await getTours(filters);
    return successResponse(items, {
      pagination: buildPagination(total, filters.limit, filters.offset),
      requestId,
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "GET /api/tours" });
  }
}

/**
 * POST /api/tours — Admin only.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const body = await request.json();
    const input = validateTour(body);
    const tour = await createTour(input);
    return successResponse(tour, {
      status: 201,
      message: "Tour created",
      requestId,
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "POST /api/tours" });
  }
}
