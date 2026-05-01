/**
 * Shared API Response Types
 * Standard response envelopes used across all API routes.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiError {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Re-export domain types
export type {
  IBooking as Booking,
  IRoom as Room,
  ITour as Tour,
  IPayment as Payment,
  IContactInquiry as ContactInquiry,
  IAdmin as Admin,
} from "./index";
