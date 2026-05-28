import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/guard";
import { refundSchema } from "@/lib/schemas/paymentSchema";
import { initiateRefund } from "@/lib/services/paymentService";
import { newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/payments/[id]/refund — Admin only.
 * Initiate a full or partial refund against a captured payment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = newRequestId();
  try {
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const input = refundSchema.parse(body);

    const refund = await initiateRefund(
      params.id,
      { amount: input.amount, reason: input.reason, currency: input.currency },
      { requestId }
    );

    return successResponse(
      {
        id: refund.id,
        paymentId: refund.paymentId,
        razorpayRefundId: refund.razorpayRefundId,
        amount: Number(refund.amount.toString()),
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        createdAt: refund.createdAt,
      },
      { status: 201, message: "Refund initiated", requestId }
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "POST /api/admin/payments/[id]/refund",
    });
  }
}
