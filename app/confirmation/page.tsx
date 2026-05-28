import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Ornament from "@/components/ui/Ornament";
import { BRAND } from "@/lib/design";

export const dynamic = "force-dynamic";

interface PublicBooking {
  bookingRef: string;
  guestFirstName: string;
  itemName: string;
  itemType: string;
  status: string;
  totalPrice: number;
  currency: string;
  paymentMethod?: string;
}

type FetchResult =
  | { kind: "ok"; data: PublicBooking }
  | { kind: "notfound" }
  | { kind: "error" };

async function fetchBooking(ref: string): Promise<FetchResult> {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return { kind: "error" };
  try {
    const res = await fetch(
      `${proto}://${host}/api/bookings/by-ref/${encodeURIComponent(ref)}`,
      { cache: "no-store" }
    );
    if (res.status === 404) return { kind: "notfound" };
    if (!res.ok) return { kind: "error" };
    const json = (await res.json()) as { data?: PublicBooking };
    if (!json?.data) return { kind: "error" };
    return { kind: "ok", data: json.data };
  } catch {
    return { kind: "error" };
  }
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <SiteShell>
      <section className="confirm">
        <div className="kb-container">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Ornament />
          </div>
          {children}
        </div>
      </section>
    </SiteShell>
  );
}

function MessageState({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Shell>
      <span className="kb-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p
        style={{
          color: "var(--kb-text-muted)",
          maxWidth: "52ch",
          margin: "18px auto 0",
          lineHeight: 1.8,
        }}
      >
        {body}
      </p>
      <div style={{ marginTop: 48, display: "flex", justifyContent: "center" }}>
        <Link href="/">
          <Button variant="primary">Back to Home</Button>
        </Link>
      </div>
    </Shell>
  );
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const ref = searchParams?.ref;

  if (!ref) {
    return (
      <MessageState
        eyebrow="Reservation"
        title="Booking reference required"
        body="We couldn't find a booking reference in this link. Please use the link from your confirmation email."
      />
    );
  }

  const result = await fetchBooking(ref);

  if (result.kind === "notfound") {
    return (
      <MessageState
        eyebrow="Reservation"
        title="Booking not found"
        body="We couldn't find a booking with that reference. Please double-check the link from your confirmation email."
      />
    );
  }

  if (result.kind === "error") {
    return (
      <MessageState
        eyebrow="Reservation"
        title="Unable to load your booking"
        body="Something went wrong while loading your booking. Please refresh in a moment or contact our team."
      />
    );
  }

  const b = result.data;

  if (b.status === "cancelled") {
    return (
      <MessageState
        eyebrow="Reservation"
        title="This booking was cancelled"
        body={`Booking ${b.bookingRef} has been cancelled. If this is unexpected, please reach out to our team.`}
      />
    );
  }

  if (b.status !== "paid" && b.status !== "confirmed") {
    // pending (or any non-final status)
    return (
      <MessageState
        eyebrow="Reservation"
        title="Awaiting payment confirmation"
        body={`We're still confirming payment for booking ${b.bookingRef}. This page will update once it's confirmed — please refresh in a moment.`}
      />
    );
  }

  // paid | confirmed → the trustworthy "confirmed" state
  return (
    <Shell>
      <span className="kb-eyebrow">Reservation Confirmed</span>
      <span className="confirm__icon" aria-hidden />
      <h1>
        Thank you, {b.guestFirstName || "Guest"} <em>—</em> we&apos;ve saved
        your seat.
      </h1>
      <p
        style={{
          color: "var(--kb-text-muted)",
          maxWidth: "52ch",
          margin: "18px auto 0",
          lineHeight: 1.8,
        }}
      >
        A confirmation has been sent to your email and WhatsApp. Our team will be
        in touch shortly with the details.
      </p>

      <div className="confirm__num">Booking · {b.bookingRef}</div>

      <div className="confirm__details">
        <div className="row">
          <span>Item</span>
          <b>{b.itemName}</b>
        </div>
        <div className="row">
          <span>Reference</span>
          <b>{b.bookingRef}</b>
        </div>
        <div className="row">
          <span>Status</span>
          <b>Confirmed · paid</b>
        </div>
        <div className="row">
          <span>Total paid</span>
          <b>₹{Number(b.totalPrice).toLocaleString("en-IN")}</b>
        </div>
        {b.paymentMethod ? (
          <div className="row">
            <span>Method</span>
            <b>{b.paymentMethod}</b>
          </div>
        ) : null}
        <div className="row">
          <span>Reach us</span>
          <b>{BRAND.phone}</b>
        </div>
      </div>

      <div
        style={{
          marginTop: 48,
          display: "flex",
          justifyContent: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Link href="/">
          <Button variant="primary">Back to Home</Button>
        </Link>
        <a
          href={`https://wa.me/919876543210?text=${encodeURIComponent(
            "Hi, my booking ref is " + b.bookingRef
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost">WhatsApp the Concierge</Button>
        </a>
      </div>
    </Shell>
  );
}
