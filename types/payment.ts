/**
 * Razorpay payment integration types — Khan Bhai S.
 */

export type PaymentStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED";

/** Response returned from POST /api/payment/create-order to the frontend. */
export interface RazorpayOrderResponse {
  orderId: string;
  amount: number; // amount in paise
  currency: string;
  key: string; // public Razorpay key id
  bookingId: string;
  bookingRef: string;
  receipt: string;
}

/** Payload received from the Razorpay client-side success handler. */
export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Body for POST /api/payment/create-order */
export interface CreateOrderPayload {
  booking_id: string;
  amount: number; // INR rupees (will be converted to paise)
  currency?: string;
  receipt?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

/** Body for POST /api/payment/verify */
export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking_id: string;
}

/** Razorpay webhook event payload — minimal fields used by the app. */
export interface RazorpayWebhookEvent {
  event:
    | "payment.authorized"
    | "payment.captured"
    | "payment.failed"
    | "order.paid"
    | "refund.created"
    | "refund.processed"
    | string;
  account_id?: string;
  created_at: number;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        email?: string;
        contact?: string;
        error_code?: string;
        error_description?: string;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        receipt?: string;
        status: string;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
  };
}
