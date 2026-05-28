import { z } from "zod";

/** Body for POST /api/payment/create-order */
export const createOrderSchema = z.object({
  booking_id: z.string().min(1, "booking_id is required").max(64),
  // Whole rupees only — no fractional INR for our use case. Hard upper bound
  // mirrors lib/payments/razorpay.ts to fail fast on tampered totals.
  amount: z
    .number()
    .positive("amount must be > 0")
    .max(10_000_000, "amount exceeds maximum"),
  currency: z
    .string()
    .length(3)
    .default("INR")
    .refine((c) => c.toUpperCase() === "INR", "Only INR payments are supported"),
  receipt: z.string().max(40).optional(),
  customer_name: z.string().max(120).optional(),
  customer_email: z.string().email().max(255).optional(),
  customer_phone: z.string().max(32).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Body for POST /api/payment/verify */
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^order_[A-Za-z0-9]+$/, "Invalid order id"),
  razorpay_payment_id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^pay_[A-Za-z0-9]+$/, "Invalid payment id"),
  razorpay_signature: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[a-fA-F0-9]+$/, "Invalid signature"),
  booking_id: z.string().min(1).max(64),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

/** Body for POST /api/admin/payments/[id]/refund */
export const refundSchema = z.object({
  // Optional partial-refund amount in whole rupees. Omit to refund the full
  // remaining (available) amount.
  amount: z
    .number()
    .positive("amount must be > 0")
    .max(10_000_000, "amount exceeds maximum")
    .optional(),
  reason: z.string().trim().max(512).optional(),
  currency: z
    .string()
    .length(3)
    .default("INR")
    .refine((c) => c.toUpperCase() === "INR", "Only INR refunds are supported"),
});
export type RefundInput = z.infer<typeof refundSchema>;
