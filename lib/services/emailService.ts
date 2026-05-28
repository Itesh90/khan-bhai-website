import {
  sendEmail,
  sendBookingConfirmationEmail,
  sendPaymentConfirmationEmail,
} from "@/lib/email/nodemailer";
import { formatCurrency, formatDate } from "@/lib/utils/helpers";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || "admin@khanbhaihotel.com";

interface BookingLite {
  bookingRef: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  type: string;
  numberOfGuests: number;
  /** Accepts both plain number and Prisma Decimal (which has a .toString() method) */
  totalPrice: { toString(): string } | number;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
}

/**
 * Send booking confirmation to customer. Errors are logged, not thrown.
 */
export async function sendBookingConfirmation(booking: BookingLite) {
  try {
    await sendBookingConfirmationEmail(booking.guestEmail, {
      bookingRef: booking.bookingRef,
      guestName: booking.guestName,
      checkInDate: booking.checkInDate
        ? formatDate(booking.checkInDate)
        : undefined,
      checkOutDate: booking.checkOutDate
        ? formatDate(booking.checkOutDate)
        : undefined,
      totalPrice: typeof booking.totalPrice === "number"
        ? booking.totalPrice
        : Number(booking.totalPrice.toString()),
    });
  } catch (err) {
    console.error("[emailService] booking confirmation failed", err);
  }
}

/**
 * Notify the admin of a new booking.
 */
export async function sendAdminNotification(booking: BookingLite) {
  try {
    const html = `
      <h2>New Booking Received</h2>
      <ul>
        <li>Reference: <strong>${booking.bookingRef}</strong></li>
        <li>Type: ${booking.type}</li>
        <li>Guest: ${booking.guestName} (${booking.guestEmail}, ${booking.guestPhone})</li>
        <li>Guests: ${booking.numberOfGuests}</li>
        <li>Check-in: ${booking.checkInDate ? formatDate(booking.checkInDate) : "N/A"}</li>
        <li>Check-out: ${booking.checkOutDate ? formatDate(booking.checkOutDate) : "N/A"}</li>
        <li>Total: ${formatCurrency(typeof booking.totalPrice === "number" ? booking.totalPrice : Number(booking.totalPrice.toString()))}</li>
      </ul>
    `;
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Khan Bhai] New booking ${booking.bookingRef}`,
      html,
    });
  } catch (err) {
    console.error("[emailService] admin notification failed", err);
  }
}

/**
 * Notify admin of new contact inquiry.
 */
export async function sendContactAdminNotification(inquiry: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}) {
  try {
    const html = `
      <h2>New Contact Inquiry</h2>
      <p><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p>
      <p><strong>Phone:</strong> ${inquiry.phone ?? "N/A"}</p>
      <p><strong>Subject:</strong> ${inquiry.subject}</p>
      <p><strong>Message:</strong></p>
      <p>${inquiry.message.replace(/\n/g, "<br>")}</p>
    `;
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Khan Bhai] Contact: ${inquiry.subject}`,
      html,
    });
  } catch (err) {
    console.error("[emailService] contact notification failed", err);
  }
}

/**
 * Send a reply to a contact inquiry.
 */
export async function sendContactReply(
  toEmail: string,
  subject: string,
  message: string
) {
  return sendEmail({
    to: toEmail,
    subject,
    html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
  });
}

export { sendPaymentConfirmationEmail };

// ─────────────────────────────────────────────
// Payment notifications
// ─────────────────────────────────────────────

interface PaymentLite {
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  amount: { toString(): string } | number;
  method?: string | null;
  status?: string;
}

const OWNER_WHATSAPP =
  process.env.OWNER_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function toNumber(v: { toString(): string } | number): number {
  return typeof v === "number" ? v : Number(v.toString());
}

/**
 * Customer email: payment captured, booking confirmed.
 */
export async function sendPaymentConfirmation(
  booking: BookingLite,
  payment: PaymentLite
) {
  try {
    const amount = toNumber(payment.amount);
    const html = `
      <h2>Payment received — your booking is confirmed!</h2>
      <p>Dear ${booking.guestName},</p>
      <p>Thank you. We have received your payment of
        <strong>${formatCurrency(amount)}</strong> for booking
        <strong>${booking.bookingRef}</strong>.</p>
      <h3>Booking summary</h3>
      <ul>
        <li>Reference: <strong>${booking.bookingRef}</strong></li>
        <li>Type: ${booking.type}</li>
        <li>Guests: ${booking.numberOfGuests}</li>
        <li>Check-in: ${booking.checkInDate ? formatDate(booking.checkInDate) : "N/A"}</li>
        <li>Check-out: ${booking.checkOutDate ? formatDate(booking.checkOutDate) : "N/A"}</li>
        <li>Payment ID: ${payment.razorpayPaymentId ?? "—"}</li>
        <li>Order ID: ${payment.razorpayOrderId ?? "—"}</li>
        <li>Method: ${payment.method ?? "razorpay"}</li>
      </ul>
      <p><strong>Next steps:</strong> our team will reach out on WhatsApp shortly with arrival
      details. For any queries, message us directly:
      ${
        OWNER_WHATSAPP
          ? `<a href="https://wa.me/${OWNER_WHATSAPP.replace(/[^\d]/g, "")}">Chat on WhatsApp</a>`
          : "via the contact form on our site"
      }.</p>
      <p>Warm regards,<br/>Khan Bhai S. Team</p>
    `;
    await sendEmail({
      to: booking.guestEmail,
      subject: `[Khan Bhai] Payment received — ${booking.bookingRef}`,
      html,
    });
  } catch (err) {
    console.error("[emailService] sendPaymentConfirmation failed", err);
  }
}

/**
 * Customer email: payment failed — please retry.
 */
export async function sendPaymentFailedNotification(
  booking: BookingLite,
  reason: string
) {
  try {
    const html = `
      <h2>Payment could not be completed</h2>
      <p>Dear ${booking.guestName},</p>
      <p>Unfortunately, your payment for booking <strong>${booking.bookingRef}</strong>
      did not complete successfully.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>You can retry your payment here:
        <a href="${SITE_URL}/checkout?ref=${booking.bookingRef}">Retry Payment</a>.</p>
      <p>If you continue to face issues, please reach our support team.</p>
      <p>Regards,<br/>Khan Bhai S. Team</p>
    `;
    await sendEmail({
      to: booking.guestEmail,
      subject: `[Khan Bhai] Payment failed — ${booking.bookingRef}`,
      html,
    });
  } catch (err) {
    console.error("[emailService] sendPaymentFailedNotification failed", err);
  }
}

/**
 * Admin email: a new payment was received.
 */
export async function sendAdminPaymentNotification(
  booking: BookingLite,
  payment: PaymentLite
) {
  try {
    const amount = toNumber(payment.amount);
    const html = `
      <h2>New payment received</h2>
      <ul>
        <li>Booking: <strong>${booking.bookingRef}</strong> (${booking.type})</li>
        <li>Customer: ${booking.guestName} — ${booking.guestEmail} — ${booking.guestPhone}</li>
        <li>Amount: <strong>${formatCurrency(amount)}</strong></li>
        <li>Payment ID: ${payment.razorpayPaymentId ?? "—"}</li>
        <li>Order ID: ${payment.razorpayOrderId ?? "—"}</li>
        <li>Method: ${payment.method ?? "razorpay"}</li>
      </ul>
      <p><a href="${SITE_URL}/admin">Open Admin Dashboard</a></p>
    `;
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[Khan Bhai] Payment received ${booking.bookingRef} — ${formatCurrency(amount)}`,
      html,
    });
  } catch (err) {
    console.error("[emailService] sendAdminPaymentNotification failed", err);
  }
}

/**
 * Best-effort owner notification. If a WhatsApp Business API integration is configured
 * via WHATSAPP_API_URL + WHATSAPP_API_TOKEN, posts a message; otherwise logs.
 */
export async function sendOwnerWhatsAppNotice(
  booking: BookingLite,
  payment: PaymentLite
) {
  try {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const to = OWNER_WHATSAPP;
    const amount = toNumber(payment.amount);
    const text = `New booking ${booking.bookingRef} (${booking.type}) — ${booking.guestName} — ${formatCurrency(amount)} paid. Payment: ${payment.razorpayPaymentId ?? "?"}`;

    if (!apiUrl || !apiToken || !to) {
      console.log("[whatsapp:owner]", text);
      return;
    }

    await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ to, message: text }),
    });
  } catch (err) {
    console.error("[emailService] sendOwnerWhatsAppNotice failed", err);
  }
}

interface RefundLite {
  /** Refund amount in rupees (Prisma Decimal or number). */
  amount: { toString(): string } | number;
  razorpayRefundId: string;
}

/**
 * Customer email: a refund has been processed. Errors are logged, not thrown —
 * the caller fires this fire-and-forget after the refund webhook commits.
 */
export async function sendRefundProcessedEmail(
  booking: BookingLite,
  payment: PaymentLite,
  refund: RefundLite
) {
  try {
    const amount = toNumber(refund.amount);
    const html = `
      <h2>Your refund has been processed</h2>
      <p>Dear ${booking.guestName},</p>
      <p>We have processed a refund of <strong>${formatCurrency(amount)}</strong>
      for booking <strong>${booking.bookingRef}</strong>.</p>
      <ul>
        <li>Reference: <strong>${booking.bookingRef}</strong></li>
        <li>Refund amount: <strong>${formatCurrency(amount)}</strong></li>
        <li>Original payment: ${payment.razorpayPaymentId ?? "—"}</li>
      </ul>
      <p>The amount should reflect in your account within 5–7 business days,
      depending on your bank.</p>
      <p>Warm regards,<br/>Khan Bhai S. Team</p>
    `;
    await sendEmail({
      to: booking.guestEmail,
      subject: `[Khan Bhai] Refund processed — ${booking.bookingRef}`,
      html,
    });
  } catch (err) {
    console.error("[emailService] sendRefundProcessedEmail failed", err);
  }
}
