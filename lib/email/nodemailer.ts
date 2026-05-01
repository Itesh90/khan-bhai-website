import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email notification
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@khanbhaihotel.com",
      to,
      subject,
      html,
      text: text || "",
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent:", result.messageId);
    return result;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmationEmail(
  guestEmail: string,
  bookingDetails: {
    bookingRef: string;
    guestName: string;
    checkInDate?: string;
    checkOutDate?: string;
    totalPrice: number;
  }
) {
  const html = `
    <h2>Booking Confirmation</h2>
    <p>Dear ${bookingDetails.guestName},</p>
    <p>Thank you for your booking at Khan Bhai S.</p>
    <h3>Booking Details:</h3>
    <ul>
      <li>Booking Reference: ${bookingDetails.bookingRef}</li>
      <li>Check-in: ${bookingDetails.checkInDate || "N/A"}</li>
      <li>Check-out: ${bookingDetails.checkOutDate || "N/A"}</li>
      <li>Total Price: INR ${bookingDetails.totalPrice}</li>
    </ul>
    <p>We look forward to welcoming you!</p>
    <p>Best regards,<br>Khan Bhai S. Team</p>
  `;

  return sendEmail({
    to: guestEmail,
    subject: `Booking Confirmation - ${bookingDetails.bookingRef}`,
    html,
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  guestEmail: string,
  paymentDetails: {
    amount: number;
    paymentId: string;
    bookingRef: string;
  }
) {
  const html = `
    <h2>Payment Confirmation</h2>
    <p>Your payment has been successfully processed.</p>
    <h3>Payment Details:</h3>
    <ul>
      <li>Booking Reference: ${paymentDetails.bookingRef}</li>
      <li>Amount: INR ${paymentDetails.amount}</li>
      <li>Payment ID: ${paymentDetails.paymentId}</li>
    </ul>
    <p>Best regards,<br>Khan Bhai S. Team</p>
  `;

  return sendEmail({
    to: guestEmail,
    subject: `Payment Confirmation - ${paymentDetails.bookingRef}`,
    html,
  });
}
