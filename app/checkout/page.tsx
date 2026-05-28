"use client";

import { useState, useMemo, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: any;
  }
}
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Reveal from "@/components/ui/Reveal";

const ROOMS: Record<string, { name: string; img: string; price: number; type: "room" | "tour" | "table" }> = {
  deluxe:    { name: "Deluxe Room",            img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80", price: 2730, type: "room" },
  balcony:   { name: "Room with Balcony View", img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&q=80", price: 3360, type: "room" },
  suite:     { name: "Sweet Room",             img: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900&q=80", price: 7140, type: "room" },
  nainital:  { name: "Nainital & Bhimtal",     img: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80", price: 6500, type: "tour" },
  corbett:   { name: "Jim Corbett",            img: "https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=1200&q=80", price: 8000, type: "tour" },
  kedarnath: { name: "Kedarnath Yatra",        img: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80", price: 12000, type: "tour" },
  restaurant: { name: "Restaurant Table",       img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80", price: 200, type: "table" },
};

function CheckoutContent() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get("id") || "deluxe";
  const item = ROOMS[id] || ROOMS.deluxe;

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    checkIn: today.toISOString().slice(0, 10),
    checkOut: tomorrow.toISOString().slice(0, 10),
    guests: 2,
    terms: false,
  });
  const [diningArea, setDiningArea] = useState("Indoors");
  const [timeSlot, setTimeSlot] = useState("7:00 PM");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [razorpayReady, setRazorpayReady] = useState(false);
  // Persist booking across retries: if the user dismisses the Razorpay modal
  // we should not create a fresh Booking + Order on the next click — re-use
  // the existing one so we don't pollute the DB with duplicate pending rows.
  const [bookingState, setBookingState] = useState<{
    bookingId: string;
    bookingRef: string;
    amount: number;
  } | null>(null);

  // Load Razorpay checkout script once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => setRazorpayReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setRazorpayReady(true);
    s.onerror = () => setStatusMsg("Failed to load payment SDK. Please refresh.");
    document.body.appendChild(s);
  }, []);

  const nights = useMemo(() => {
    if (item.type !== "room") return 1;
    const a = new Date(form.checkIn).getTime();
    const b = new Date(form.checkOut).getTime();
    const n = Math.max(1, Math.round((b - a) / 86400000));
    return n;
  }, [form.checkIn, form.checkOut, item.type]);

  const rawSubtotal =
    (item.type === "tour" || item.type === "table")
      ? item.price * form.guests
      : item.price * nights;

  const total = item.type === "room" ? rawSubtotal : Math.round(rawSubtotal * 1.18);
  const subtotal = item.type === "room" ? Math.round(total / 1.18) : rawSubtotal;
  const gst = total - subtotal;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
    if (!/^[+\d\s-]{8,}$/.test(form.phone)) e.phone = "Valid phone required";
    if (!form.terms) e.terms = "Please accept the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    if (!razorpayReady || !window.Razorpay) {
      setStatusMsg("Payment SDK still loading — please wait a moment.");
      return;
    }
    setLoading(true);
    setStatusMsg("Creating your booking…");

    try {
      // 1. Create booking — but only if we don't already have one from a prior
      // attempt this session. This prevents duplicate "pending" rows when the
      // user dismisses the Razorpay modal and tries again.
      let bookingId: string;
      let bookingRef: string;
      let bookingAmount: number;
      if (bookingState) {
        bookingId = bookingState.bookingId;
        bookingRef = bookingState.bookingRef;
        bookingAmount = bookingState.amount;
      } else {
        const bookingPayload = {
          booking_type: item.type === "tour" ? "tour" : item.type === "table" ? "restaurant" : "room",
          room_id: item.type === "room" ? id : undefined,
          tour_id: item.type === "tour" ? id : undefined,
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          guests: form.guests,
          check_in: form.checkIn,
          check_out: item.type === "table" ? undefined : form.checkOut,
          diningArea: item.type === "table" ? diningArea : undefined,
          timeSlot: item.type === "table" ? timeSlot : undefined,
          special_requests: undefined,
        };

        const bookingRes = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayload),
        });
        const bookingJson = await bookingRes.json();
        if (!bookingRes.ok || !bookingJson?.success) {
          throw new Error(
            bookingJson?.error?.message || "Could not create booking"
          );
        }
        bookingId = bookingJson.data.booking_id;
        bookingRef = bookingJson.data.booking_ref;
        bookingAmount = Number(bookingJson.data.amount) || total;
        setBookingState({ bookingId, bookingRef, amount: bookingAmount });
      }

      // 2. Create Razorpay order
      setStatusMsg("Initiating payment…");
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: bookingAmount,
          currency: "INR",
          receipt: bookingRef,
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson?.success) {
        throw new Error(
          orderJson?.error?.message || "Could not initiate payment"
        );
      }
      const { orderId, amount: amountInPaise, currency, key } = orderJson.data;

      // 3. Open Razorpay modal
      setStatusMsg("Processing payment…");
      const options: any = {
        key,
        order_id: orderId,
        amount: amountInPaise,
        currency,
        name: "Khan Bhai S.",
        description:
          item.type === "tour"
            ? `Tour: ${item.name}`
            : item.type === "table"
            ? `Seat Reservation: ${item.name}`
            : `Stay: ${item.name}`,
        image: "/logo.png",
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: "#c8a861" },
        handler: async (response: any) => {
          try {
            setStatusMsg("Verifying payment…");
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: bookingId,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || !verifyJson?.success) {
              throw new Error(
                verifyJson?.error?.message || "Payment verification failed"
              );
            }
            // Clear so a future checkout (same tab) starts fresh.
            setBookingState(null);
            const params = new URLSearchParams({
              ref: bookingRef,
              name: form.name,
              item: item.name,
              total: String(total),
            });
            router.push("/confirmation?" + params.toString());
          } catch (err: any) {
            setStatusMsg(err?.message || "Payment verification failed");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setStatusMsg("Payment cancelled. You can retry when ready.");
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setStatusMsg(
          resp?.error?.description ||
            "Payment failed. Please try a different method."
        );
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setStatusMsg(err?.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <SiteShell>
      <section className="page-hero kb-grain">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">Checkout · Step 1 of 2</span>
            <h1>Reserve <em>your visit</em>.</h1>
            <p>Secure payment by Razorpay. Confirmation by email and WhatsApp within the hour.</p>
          </Reveal>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <div className="checkout-grid">
            <Reveal>
              <form className="checkout-form" onSubmit={onSubmit} noValidate>
                <h3 style={{ fontFamily: "var(--kb-serif)", fontSize: 24, fontWeight: 400 }}>
                  Guest <em style={{ color: "var(--kb-gold-light)", fontStyle: "italic" }}>details</em>
                </h3>
                <div className="form-row">
                  <Input
                    label="Full name"
                    name="name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    error={errors.name}
                    placeholder="Anjali Mehrotra"
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    error={errors.email}
                    placeholder="you@email.com"
                  />
                </div>
                <Input
                  label="Phone (WhatsApp preferred)"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  error={errors.phone}
                  placeholder="+91 98765 43210"
                />

                 <h3 style={{ fontFamily: "var(--kb-serif)", fontSize: 24, fontWeight: 400, marginTop: 24 }}>
                  {item.type === "tour" ? "Travel" : item.type === "table" ? "Dining" : "Stay"} <em style={{ color: "var(--kb-gold-light)", fontStyle: "italic" }}>details</em>
                </h3>
                <div className="form-row">
                  {item.type === "table" ? (
                    <>
                      <Input
                        label="Dining date"
                        name="checkIn"
                        type="date"
                        value={form.checkIn}
                        onChange={(e) => set("checkIn", e.target.value)}
                      />
                      <div className="input-group">
                        <label className="kb-input-label" htmlFor="timeSlot">Time slot</label>
                        <select
                          id="timeSlot"
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className="kb-input"
                          style={{
                            width: "100%",
                            height: 50,
                            background: "transparent",
                            color: "var(--kb-text)",
                            border: "0.5px solid var(--kb-gold-dim)",
                            padding: "0 16px",
                            outline: "none",
                            fontFamily: "var(--kb-sans)",
                            fontSize: 14,
                          }}
                        >
                          <option value="12:00 PM" style={{ background: "var(--kb-black)" }}>12:00 PM (Lunch)</option>
                          <option value="1:00 PM" style={{ background: "var(--kb-black)" }}>1:00 PM (Lunch)</option>
                          <option value="2:00 PM" style={{ background: "var(--kb-black)" }}>2:00 PM (Lunch)</option>
                          <option value="3:00 PM" style={{ background: "var(--kb-black)" }}>3:00 PM (Lunch)</option>
                          <option value="7:00 PM" style={{ background: "var(--kb-black)" }}>7:00 PM (Dinner)</option>
                          <option value="8:00 PM" style={{ background: "var(--kb-black)" }}>8:00 PM (Dinner)</option>
                          <option value="9:00 PM" style={{ background: "var(--kb-black)" }}>9:00 PM (Dinner)</option>
                          <option value="10:00 PM" style={{ background: "var(--kb-black)" }}>10:00 PM (Dinner)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <Input
                        label={item.type === "tour" ? "Travel start" : "Check in"}
                        name="checkIn"
                        type="date"
                        value={form.checkIn}
                        onChange={(e) => set("checkIn", e.target.value)}
                      />
                      {item.type !== "tour" && (
                        <Input
                          label="Check out"
                          name="checkOut"
                          type="date"
                          value={form.checkOut}
                          onChange={(e) => set("checkOut", e.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>

                {item.type === "table" && (
                  <div className="form-row" style={{ marginTop: 16 }}>
                    <div className="input-group" style={{ width: "100%" }}>
                      <label className="kb-input-label" htmlFor="diningArea">Dining Area</label>
                      <select
                        id="diningArea"
                        value={diningArea}
                        onChange={(e) => setDiningArea(e.target.value)}
                        className="kb-input"
                        style={{
                          width: "100%",
                          height: 50,
                          background: "transparent",
                          color: "var(--kb-text)",
                          border: "0.5px solid var(--kb-gold-dim)",
                          padding: "0 16px",
                          outline: "none",
                          fontFamily: "var(--kb-sans)",
                          fontSize: 14,
                        }}
                      >
                        <option value="Indoors" style={{ background: "var(--kb-black)" }}>Luxury Indoors</option>
                        <option value="Garden Lawn" style={{ background: "var(--kb-black)" }}>Garden Lawn Seating</option>
                        <option value="Rooftop" style={{ background: "var(--kb-black)" }}>Star-lit Rooftop</option>
                      </select>
                    </div>
                  </div>
                )}

                <Input
                  label={item.type === "tour" ? "Persons" : item.type === "table" ? "Seats (Guests)" : "Guests"}
                  name="guests"
                  type="number"
                  min={1}
                  max={10}
                  value={form.guests}
                  onChange={(e) => set("guests", Number(e.target.value))}
                />

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    cursor: "pointer",
                    marginTop: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.terms}
                    onChange={(e) => set("terms", e.target.checked)}
                    style={{ marginTop: 4, accentColor: "var(--kb-gold)" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--kb-text-muted)", lineHeight: 1.6 }}>
                    I&apos;ve read the cancellation policy and agree to the terms. GST is included
                    in totals.
                  </span>
                </label>
                {errors.terms && (
                  <p style={{ color: "#ff6b6b", fontSize: 12, fontFamily: "var(--kb-mono)" }}>
                    {errors.terms}
                  </p>
                )}

                {statusMsg && (
                  <p
                    style={{
                      fontSize: 13,
                      fontFamily: "var(--kb-mono)",
                      color: "var(--kb-text-muted)",
                      marginTop: 8,
                    }}
                  >
                    {statusMsg}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  showArrow
                  disabled={loading || !razorpayReady}
                >
                  {loading
                    ? "Processing…"
                    : !razorpayReady
                    ? "Loading payment…"
                    : `Pay ₹${total.toLocaleString("en-IN")}`}
                </Button>
              </form>
            </Reveal>

            <Reveal delay={0.1}>
              <aside className="summary-card">
                <span className="kb-eyebrow">Your reservation</span>
                <h3 style={{ marginTop: 8 }}>{item.name}</h3>
                <div className="item-img" style={{ backgroundImage: `url(${item.img})` }} />
                <div className="summary-line">
                  <span>{item.type === "tour" ? "Per person" : item.type === "table" ? "Per seat cover" : "Per night"}</span>
                  <b>₹{item.price.toLocaleString("en-IN")}</b>
                </div>
                <div className="summary-line">
                  <span>{item.type === "tour" ? "Persons" : item.type === "table" ? "Seats" : "Nights"}</span>
                  <b>{item.type === "tour" || item.type === "table" ? form.guests : nights}</b>
                </div>
                <div className="summary-line">
                  <span>Subtotal</span>
                  <b>₹{subtotal.toLocaleString("en-IN")}</b>
                </div>
                <div className="summary-line">
                  <span>GST · 18%</span>
                  <b>₹{gst.toLocaleString("en-IN")}</b>
                </div>
                <div className="summary-line total">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--kb-text-faint)", marginTop: 18, lineHeight: 1.6 }}>
                  Free cancellation up to 48h before arrival. Secured by Razorpay.
                </p>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
