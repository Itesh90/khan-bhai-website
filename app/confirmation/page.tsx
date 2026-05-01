"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Ornament from "@/components/ui/Ornament";
import { BRAND } from "@/lib/design";

function ConfirmationContent() {
  const search = useSearchParams();
  const ref = search.get("ref") || "KB-XXXXXX";
  const name = search.get("name") || "Guest";
  const item = search.get("item") || "Your reservation";
  const total = search.get("total") || "0";

  return (
    <section className="confirm">
      <div className="kb-container">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Ornament />
        </div>
        <span className="kb-eyebrow">Reservation Confirmed</span>
        <span className="confirm__icon" aria-hidden />
        <h1>
          Thank you, {name.split(" ")[0]} <em>—</em> we&apos;ve saved your seat.
        </h1>
        <p style={{ color: "var(--kb-text-muted)", maxWidth: "52ch", margin: "18px auto 0", lineHeight: 1.8 }}>
          A confirmation has been sent to your email and WhatsApp. Our team will be in
          touch within the hour with check-in details.
        </p>

        <div className="confirm__num">Booking · {ref}</div>

        <div className="confirm__details">
          <div className="row"><span>Item</span><b>{item}</b></div>
          <div className="row"><span>Reference</span><b>{ref}</b></div>
          <div className="row"><span>Status</span><b>Confirmed · paid</b></div>
          <div className="row"><span>Total paid</span><b>₹{Number(total).toLocaleString("en-IN")}</b></div>
          <div className="row"><span>Reach us</span><b>{BRAND.phone}</b></div>
        </div>

        <div style={{ marginTop: 48, display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <Link href="/"><Button variant="primary">Back to Home</Button></Link>
          <a href={`https://wa.me/919876543210?text=${encodeURIComponent("Hi, my booking ref is " + ref)}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost">WhatsApp the Concierge</Button>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function ConfirmationPage() {
  return (
    <SiteShell>
      <Suspense fallback={<div className="confirm"><div className="kb-container">Loading…</div></div>}>
        <ConfirmationContent />
      </Suspense>
    </SiteShell>
  );
}
