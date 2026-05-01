import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/guard";
import { validateContactUpdate } from "@/lib/services/validationService";
import {
  deleteInquiry,
  getInquiryById,
  updateInquiry,
} from "@/lib/services/contactService";
import { newRequestId } from "@/lib/logger";

interface Ctx {
  params: { id: string };
}

/**
 * GET /api/contact/[id] — Admin only.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const inquiry = await getInquiryById(params.id);
    return successResponse(inquiry, { requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "GET /api/contact/[id]",
    });
  }
}

/**
 * PATCH /api/contact/[id] — Admin only. Mark as read / responded.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const data = validateContactUpdate(await req.json());
    const inquiry = await updateInquiry(params.id, data);
    return successResponse(inquiry, {
      message: "Inquiry updated",
      requestId,
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "PATCH /api/contact/[id]",
    });
  }
}

/**
 * DELETE /api/contact/[id] — Superadmin only. Hard-delete inquiry.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const requestId = newRequestId();
  try {
    await requireSuperAdmin();
    await deleteInquiry(params.id);
    return successResponse(
      { id: params.id },
      { message: "Inquiry deleted", requestId }
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "DELETE /api/contact/[id]",
    });
  }
}
