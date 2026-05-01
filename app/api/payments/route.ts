import { NextResponse } from "next/server";

/**
 * /api/payments — index. Use the sub-routes:
 *   POST /api/payments/create-order
 *   POST /api/payments/verify
 *   POST /api/payments/webhook
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    routes: [
      "POST /api/payments/create-order",
      "POST /api/payments/verify",
      "POST /api/payments/webhook",
    ],
  });
}
