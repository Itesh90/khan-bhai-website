import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import { validateRoomUpdate } from "@/lib/services/validationService";
import {
  deleteRoom,
  getRoomById,
  updateRoom,
} from "@/lib/services/roomService";
import { newRequestId } from "@/lib/logger";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/rooms/[id] — Public.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    const room = await getRoomById(params.id);
    return successResponse(room, { requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "GET /api/rooms/[id]",
    });
  }
}

/**
 * PATCH /api/rooms/[id] — Admin only.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const data = validateRoomUpdate(await req.json());
    const room = await updateRoom(params.id, data);
    return successResponse(room, { message: "Room updated", requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "PATCH /api/rooms/[id]",
    });
  }
}

/**
 * DELETE /api/rooms/[id] — Admin only.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    await deleteRoom(params.id);
    return successResponse(
      { id: params.id },
      { message: "Room deleted", requestId }
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "DELETE /api/rooms/[id]",
    });
  }
}
