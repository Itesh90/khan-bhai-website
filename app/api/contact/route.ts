import { NextRequest } from "next/server";
import { successResponse, buildPagination } from "@/lib/api-response";
import { handleApiError, RateLimitError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import {
  validateContact,
  validateContactQuery,
  searchParamsToObject,
} from "@/lib/services/validationService";
import {
  createInquiry,
  listInquiries,
} from "@/lib/services/contactService";
import { sendContactAdminNotification } from "@/lib/services/emailService";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/utils/rateLimit";
import { newRequestId, logger } from "@/lib/logger";

/**
 * POST /api/contact — Public. Submit a new inquiry.
 *
 * Rate-limited at 5 submissions per IP per hour to discourage spam.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(
      `contact:submit:${ip}`,
      RATE_LIMITS.CONTACT_SUBMIT.limit,
      RATE_LIMITS.CONTACT_SUBMIT.windowMs
    );
    if (!rl.ok) {
      logger.warn("contact.rate_limited", { ip, requestId });
      const res = handleApiError(
        new RateLimitError(
          "Too many submissions. Please wait a while and try again."
        ),
        { requestId, route: "POST /api/contact" }
      );
      for (const [k, v] of Object.entries(rateLimitHeaders(rl))) {
        res.headers.set(k, v);
      }
      return res;
    }

    const body = await request.json();
    const input = validateContact(body);
    const inquiry = await createInquiry(input);

    void sendContactAdminNotification({
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      subject: inquiry.subject,
      message: inquiry.message,
    });

    return successResponse(inquiry, {
      status: 201,
      message: "Inquiry received",
      requestId,
      headers: rateLimitHeaders(rl),
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "POST /api/contact" });
  }
}

/**
 * GET /api/contact — Admin only. List inquiries.
 */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  try {
    await requireAdmin();
    const filters = validateContactQuery(
      searchParamsToObject(request.nextUrl.searchParams)
    );
    const { items, total } = await listInquiries(filters);
    return successResponse(items, {
      pagination: buildPagination(total, filters.limit, filters.offset),
      requestId,
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "GET /api/contact" });
  }
}
