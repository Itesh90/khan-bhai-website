"use client";

import { useState } from "react";

interface RazorpayPaymentData {
  orderId: string;
  amount: number;
  bookingId: string;
  guestEmail: string;
  guestName: string;
  guestPhone: string;
}

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = async (data: RazorpayPaymentData) => {
    setLoading(true);
    setError(null);

    try {
      // Load Razorpay script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: data.orderId,
          amount: data.amount * 100, // Razorpay expects amount in paise
          currency: "INR",
          name: "Khan Bhai S.",
          description: "Booking Payment",
          customer_id: data.bookingId,
          prefill: {
            name: data.guestName,
            email: data.guestEmail,
            contact: data.guestPhone,
          },
          theme: {
            color: "#d4af37", // Luxury gold
          },
          handler: async (response: any) => {
            try {
              // Verify payment on backend
              const verifyResponse = await fetch("/api/payments/verify", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  orderId: data.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  bookingId: data.bookingId,
                }),
              });

              if (!verifyResponse.ok) {
                throw new Error("Payment verification failed");
              }

              return verifyResponse.json();
            } catch (err) {
              setError("Payment verification failed");
              throw err;
            }
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment processing failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    processPayment,
  };
}
