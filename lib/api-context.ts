/**
 * API request context helpers — Khan Bhai S.
 *
 * Provides:
 *   - newRequestId() — short unique correlation id (re-export)
 *   - withApi() — wraps a route handler with structured request/response
 *     logging and consistent error handling.
 *
 * Usage:
 *   export const POST = withApi("POST /api/bookings", async (req, ctx) => {
 *     const data = validateBooking(await req.json());
 *     return successResponse(await createBooking(data));
 *   });
 */

import type { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { logger, newRequestId } from "@/lib/logger";
import { getClientIp } from "@/lib/utils/rateLimit";

export { newRequestId };

export interface ApiContext {
  requestId: string;
  route: string;
  ip: string;
  userAgent: string;
}

type Handler<TParams> = (
  request: NextRequest,
  ctx: ApiContext & { params?: TParams }
) => Promise<NextResponse>;

/**
 * Wrap a Next.js route handler with structured logging + safe error handling.
 *
 * Generates a request id, attaches it to the response (`x-request-id`), and
 * captures latency in millis. Any thrown error is converted via handleApiError.
 */
export function withApi<TParams = unknown>(
  route: string,
  handler: Handler<TParams>
) {
  return async (
    request: NextRequest,
    routeCtx?: { params?: TParams }
  ): Promise<NextResponse> => {
    const requestId = newRequestId();
    const start = Date.now();
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";

    const ctx: ApiContext & { params?: TParams } = {
      requestId,
      route,
      ip,
      userAgent,
      params: routeCtx?.params,
    };

    logger.info("api.request", {
      requestId,
      route,
      method: request.method,
      ip,
    });

    try {
      const res = await handler(request, ctx);
      const elapsedMs = Date.now() - start;
      logger.info("api.response", {
        requestId,
        route,
        status: res.status,
        elapsedMs,
      });
      // Ensure the request id is on the response.
      if (!res.headers.get("x-request-id")) {
        res.headers.set("x-request-id", requestId);
      }
      return res;
    } catch (error) {
      const elapsedMs = Date.now() - start;
      const res = handleApiError(error, { requestId, route });
      logger.warn("api.error_response", {
        requestId,
        route,
        status: res.status,
        elapsedMs,
      });
      return res;
    }
  };
}
