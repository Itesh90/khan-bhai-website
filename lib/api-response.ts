import { NextResponse } from "next/server";
import type {
  ApiSuccess,
  PaginationInfo,
} from "@/types/api";
import { SECURITY_HEADERS } from "@/lib/utils/security";

/**
 * Apply standard security & cache headers to a NextResponse.
 */
function applyStandardHeaders(
  res: NextResponse,
  opts?: { requestId?: string }
): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  // API responses should never be cached by intermediaries by default.
  res.headers.set("Cache-Control", "no-store, max-age=0");
  if (opts?.requestId) {
    res.headers.set("x-request-id", opts.requestId);
  }
  return res;
}

/**
 * Standard success response builder.
 */
export function successResponse<T>(
  data: T,
  init?: {
    status?: number;
    message?: string;
    pagination?: PaginationInfo;
    requestId?: string;
    headers?: Record<string, string>;
  }
): NextResponse<ApiSuccess<T>> {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(init?.message ? { message: init.message } : {}),
    ...(init?.pagination ? { pagination: init.pagination } : {}),
  };
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  applyStandardHeaders(res, { requestId: init?.requestId });
  if (init?.headers) {
    for (const [k, v] of Object.entries(init.headers)) res.headers.set(k, v);
  }
  return res as NextResponse<ApiSuccess<T>>;
}

/**
 * Compute pagination info.
 */
export function buildPagination(
  total: number,
  limit: number,
  offset: number
): PaginationInfo {
  const safeLimit = Math.max(1, limit);
  return {
    total,
    page: Math.floor(offset / safeLimit) + 1,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
}

export { applyStandardHeaders };
