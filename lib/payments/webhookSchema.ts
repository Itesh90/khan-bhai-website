import { z } from "zod";

/**
 * Zod schemas for Razorpay webhook payloads — Khan Bhai S.
 *
 * The webhook handler parses the *signature-verified* raw body through
 * `webhookEnvelopeSchema` before doing any work, so malformed events are
 * rejected with a clean 400 instead of throwing a TypeError deep inside the
 * handler. Ids are regex-validated to the documented Razorpay formats and money
 * is constrained to integer paise within a sane cap.
 */

const orderIdSchema = z
  .string()
  .max(64)
  .regex(/^order_[A-Za-z0-9]+$/, "Invalid order id");
const paymentIdSchema = z
  .string()
  .max(64)
  .regex(/^pay_[A-Za-z0-9]+$/, "Invalid payment id");
const refundIdSchema = z
  .string()
  .max(64)
  .regex(/^rfnd_[A-Za-z0-9]+$/, "Invalid refund id");

/** Integer paise, non-negative, capped well above any legitimate order. */
export const moneyPaiseSchema = z
  .number()
  .int("amount must be integer paise")
  .nonnegative()
  .max(10_000_000_000);

export const paymentEntitySchema = z.object({
  id: paymentIdSchema,
  order_id: orderIdSchema,
  amount: moneyPaiseSchema,
  currency: z.string().min(1).max(8),
  status: z.string().min(1).max(32),
  method: z.string().max(32).nullish(),
  email: z.string().max(255).nullish(),
  contact: z.string().max(32).nullish(),
  error_code: z.string().max(128).nullish(),
  error_description: z.string().max(512).nullish(),
});

export const orderEntitySchema = z.object({
  id: orderIdSchema,
  amount: moneyPaiseSchema,
  currency: z.string().min(1).max(8),
  receipt: z.string().max(64).nullish(),
  status: z.string().min(1).max(32),
});

export const refundEntitySchema = z.object({
  id: refundIdSchema,
  payment_id: paymentIdSchema,
  amount: moneyPaiseSchema,
  currency: z.string().min(1).max(8),
  status: z.string().min(1).max(32),
  error_description: z.string().max(512).nullish(),
});

export const webhookEnvelopeSchema = z.object({
  event: z.string().min(1).max(64),
  account_id: z.string().max(64).optional(),
  id: z.string().max(64).optional(),
  created_at: z.number().int().optional(),
  payload: z.object({
    payment: z.object({ entity: paymentEntitySchema }).optional(),
    order: z.object({ entity: orderEntitySchema }).optional(),
    refund: z.object({ entity: refundEntitySchema }).optional(),
  }),
});

export type WebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;
export type PaymentEntity = z.infer<typeof paymentEntitySchema>;
export type OrderEntity = z.infer<typeof orderEntitySchema>;
export type RefundEntity = z.infer<typeof refundEntitySchema>;
