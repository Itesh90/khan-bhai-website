import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { getAdmin } from "@/lib/auth/guard";
import { newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * Returns the current admin session (or null).
 */
export async function GET() {
  const requestId = newRequestId();
  try {
    const user = await getAdmin();
    return successResponse({ user }, { requestId });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "GET /api/auth/session",
    });
  }
}
