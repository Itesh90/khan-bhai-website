import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import type { ApiError } from "@/types/api";
import { SECURITY_HEADERS } from "@/lib/utils/security";
import { logger } from "@/lib/logger";

/**
 * Custom error classes
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code = "SERVER_ERROR",
    statusCode = 500,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, "CONFLICT", 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests", details?: unknown) {
    super(message, "RATE_LIMITED", 429, details);
  }
}

export class ServerError extends AppError {
  constructor(message = "Internal server error", details?: unknown) {
    super(message, "SERVER_ERROR", 500, details);
  }
}

/**
 * Apply standard security headers to an error response.
 */
function withSecurityHeaders(
  res: NextResponse,
  requestId?: string
): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  res.headers.set("Cache-Control", "no-store, max-age=0");
  if (requestId) res.headers.set("x-request-id", requestId);
  return res;
}

/**
 * Build a standard error response.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  requestId?: string
): NextResponse<ApiError> {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  const res = NextResponse.json(body, { status });
  withSecurityHeaders(res, requestId);
  return res as NextResponse<ApiError>;
}

/**
 * Convert any thrown error into a NextResponse with consistent format.
 *
 * Logs every error via the structured logger; production responses do NOT
 * leak stack traces or unexpected internal details.
 */
export function handleApiError(
  error: unknown,
  ctx?: { requestId?: string; route?: string }
): NextResponse<ApiError> {
  const requestId = ctx?.requestId;
  const isProd = process.env.NODE_ENV === "production";

  if (error instanceof ZodError) {
    logger.warn("api.validation_failed", {
      requestId,
      route: ctx?.route,
      issues: error.issues,
    });
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid request payload",
      400,
      error.flatten(),
      requestId
    );
  }

  if (error instanceof AppError) {
    // 4xx are user/expected → info; 5xx are real failures → error.
    const sink = error.statusCode >= 500 ? "error" : "info";
    logger[sink]("api.error", {
      requestId,
      route: ctx?.route,
      code: error.code,
      status: error.statusCode,
      message: error.message,
    });
    return errorResponse(
      error.code,
      error.message,
      error.statusCode,
      error.details,
      requestId
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("api.prisma_known_error", {
      requestId,
      route: ctx?.route,
      code: error.code,
      meta: error.meta,
    });
    if (error.code === "P2002") {
      return errorResponse(
        "CONFLICT",
        "A record with this value already exists",
        409,
        { target: (error.meta as any)?.target },
        requestId
      );
    }
    if (error.code === "P2025") {
      return errorResponse("NOT_FOUND", "Record not found", 404, undefined, requestId);
    }
    if (error.code === "P2003") {
      return errorResponse(
        "VALIDATION_ERROR",
        "Related record does not exist",
        400,
        undefined,
        requestId
      );
    }
    return errorResponse(
      "DATABASE_ERROR",
      "Database request failed",
      500,
      isProd ? undefined : { code: error.code },
      requestId
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error("api.prisma_validation", {
      requestId,
      route: ctx?.route,
    });
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid database query",
      400,
      undefined,
      requestId
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error("api.prisma_init_failed", {
      requestId,
      route: ctx?.route,
      error,
    });
    return errorResponse(
      "DATABASE_UNAVAILABLE",
      "Database is currently unavailable",
      503,
      undefined,
      requestId
    );
  }

  logger.error("api.unhandled_error", {
    requestId,
    route: ctx?.route,
    error,
  });

  // In production, never echo back the raw error message — it can leak
  // secrets or stack-trace style data.
  const message = isProd
    ? "An unexpected error occurred. Please try again."
    : error instanceof Error
    ? error.message
    : "An unknown error occurred";
  return errorResponse("SERVER_ERROR", message, 500, undefined, requestId);
}
