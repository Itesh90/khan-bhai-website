import fc from "fast-check";
import { orderIdArb, paymentIdArb } from "./razorpayIdArb";
import { rupeesArb } from "./paiseArb";

export type PaymentStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED";

export const paymentStatusArb: fc.Arbitrary<PaymentStatus> = fc.constantFrom(
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED"
);

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  status: PaymentStatus;
  method: string | null;
}

export const paymentArb: fc.Arbitrary<PaymentRecord> = fc.record({
  id: fc.uuid(),
  bookingId: fc.uuid(),
  amount: rupeesArb,
  currency: fc.constant("INR"),
  razorpayOrderId: fc.option(orderIdArb, { nil: null }),
  razorpayPaymentId: fc.option(paymentIdArb, { nil: null }),
  razorpaySignature: fc.option(fc.hexaString({ minLength: 64, maxLength: 64 }), {
    nil: null,
  }),
  status: paymentStatusArb,
  method: fc.option(fc.constantFrom("upi", "card", "netbanking", "wallet"), {
    nil: null,
  }),
});
