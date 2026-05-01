import { NextRequest } from "next/server";
import { successResponse, buildPagination } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import {
  validateRoom,
  validateRoomsQuery,
  searchParamsToObject,
} from "@/lib/services/validationService";
import { createRoom, getRooms } from "@/lib/services/roomService";
import { newRequestId } from "@/lib/logger";

/**
 * GET /api/rooms — Public. List rooms with filters.
 */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const filters = validateRoomsQuery(
      searchParamsToObject(request.nextUrl.searchParams)
    );
    const { items, total } = await getRooms(filters);
    return successResponse(items, {
      pagination: buildPagination(total, filters.limit, filters.offset),
      requestId,
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "GET /api/rooms" });
  }
}

/**
 * POST /api/rooms — Admin only.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const body = await request.json();
    const input = validateRoom(body);
    const room = await createRoom(input);
    return successResponse(room, {
      status: 201,
      message: "Room created",
      requestId,
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "POST /api/rooms" });
  }
}
