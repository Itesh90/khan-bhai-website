"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Button from "@/components/ui/Button";
import Monogram from "@/components/ui/Monogram";

const TABS = [
  { key: "bookings", label: "Bookings" },
  { key: "payments", label: "Payments" },
  { key: "inquiries", label: "Inquiries" },
  { key: "rooms", label: "Rooms & Tours" },
  { key: "reports", label: "Reports" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<
    "all" | "confirmed" | "pending" | "cancelled"
  >("all");
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "CREATED" | "CAPTURED" | "FAILED"
  >("all");
  const [payDetail, setPayDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!session) return;

    async function fetchData() {
      try {
        setLoading(true);
        const [bookingsRes, inquiriesRes, roomsRes, toursRes] =
          await Promise.all([
            fetch("/api/bookings?limit=100").then((r) => r.json()),
            fetch("/api/contact?limit=100").then((r) => r.json()),
            fetch("/api/rooms?limit=100").then((r) => r.json()),
            fetch("/api/tours?limit=100").then((r) => r.json()),
          ]);

        if (bookingsRes.success) setBookings(bookingsRes.data || []);
        if (inquiriesRes.success) setInquiries(inquiriesRes.data || []);
        if (roomsRes.success) setRooms(roomsRes.data || []);
        if (toursRes.success) setTours(toursRes.data || []);
      } catch (err) {
        console.error("Error loading admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--kb-black)",
          color: "var(--kb-gold)",
        }}
      >
        <p style={{ fontFamily: "var(--kb-mono)", fontSize: 14 }}>
          Loading session…
        </p>
      </div>
    );
  }

  if (!session) {
    return null; // let middleware redirect
  }

  const formatDate = (dateInput: string | Date | undefined | null) => {
    if (!dateInput) return "—";
    return new Date(dateInput).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getBookingItem = (b: any) => {
    if (b.type === "room") return b.room?.name || "Room";
    if (b.type === "tour") return b.tour?.name || "Tour";
    if (b.type === "restaurant")
      return `Restaurant (${b.diningArea || "Luxury Indoors"}) - ${
        b.timeSlot || ""
      }`;
    return "Unknown";
  };

  const getBookingDates = (b: any) => {
    if (b.type === "restaurant") return formatDate(b.checkInDate);
    return `${formatDate(b.checkInDate)} – ${formatDate(b.checkOutDate)}`;
  };

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
          );
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  const filteredBookings = bookings.filter(
    (b) => filter === "all" || b.status === filter
  );

  const paymentsList = bookings
    .filter((b) => b.payment !== null && b.payment !== undefined)
    .map((b) => ({
      orderId: b.payment.razorpayOrderId,
      paymentId: b.payment.razorpayPaymentId,
      booking: b.bookingRef,
      amount: Number(b.payment.amount.toString()),
      status: b.payment.status,
      method: b.payment.method,
      at: formatDate(b.payment.updatedAt || b.payment.createdAt),
      raw: b.payment,
    }));

  const filteredPayments = paymentsList.filter(
    (p) => paymentFilter === "all" || p.status === paymentFilter
  );

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <h2 style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Monogram />
          <span style={{ fontFamily: "var(--kb-serif)", fontSize: 18 }}>
            Admin
          </span>
        </h2>
        {TABS.map((t) => (
          <a
            key={t.key}
            className={tab === t.key ? "is-active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </a>
        ))}
        <a
          style={{ marginTop: 32, cursor: "pointer" }}
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
          Logout
        </a>
      </aside>

      <main className="admin-main">
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              color: "var(--kb-gold)",
            }}
          >
            <p style={{ fontFamily: "var(--kb-mono)", fontSize: 14 }}>
              Loading dashboard data…
            </p>
          </div>
        ) : (
          <>
            {tab === "bookings" && (
              <>
                <header
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 28,
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div>
                    <span className="kb-eyebrow">Reservations</span>
                    <h1
                      style={{
                        fontFamily: "var(--kb-serif)",
                        fontSize: 32,
                        fontWeight: 400,
                        marginTop: 8,
                      }}
                    >
                      All{" "}
                      <em
                        style={{
                          fontStyle: "italic",
                          color: "var(--kb-gold-light)",
                        }}
                      >
                        bookings
                      </em>
                    </h1>
                  </div>
                  <div className="filter-bar" style={{ marginBottom: 0 }}>
                    {(["all", "confirmed", "pending", "cancelled"] as const).map(
                      (f) => (
                        <button
                          key={f}
                          className={`filter-chip ${
                            filter === f ? "is-active" : ""
                          }`}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      )
                    )}
                  </div>
                </header>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Guest</th>
                      <th>Item</th>
                      <th>Dates</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ textAlign: "center", color: "var(--kb-gray)" }}
                        >
                          No bookings found
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id}>
                          <td
                            style={{
                              fontFamily: "var(--kb-mono)",
                              color: "var(--kb-gold)",
                            }}
                          >
                            {b.bookingRef}
                          </td>
                          <td>
                            <div>{b.guestName}</div>
                            <div
                              style={{ fontSize: 11, color: "var(--kb-gray)" }}
                            >
                              {b.guestEmail}
                            </div>
                            <div
                              style={{ fontSize: 11, color: "var(--kb-gray)" }}
                            >
                              {b.guestPhone}
                            </div>
                          </td>
                          <td>{getBookingItem(b)}</td>
                          <td>{getBookingDates(b)}</td>
                          <td>
                            ₹{Number(b.totalPrice).toLocaleString("en-IN")}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                b.payment?.status === "CAPTURED"
                                  ? "confirmed"
                                  : b.payment?.status === "FAILED"
                                  ? "cancelled"
                                  : "pending"
                              }`}
                            >
                              {b.payment?.status || "PENDING"}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            <select
                              value={b.status}
                              onChange={(e) =>
                                updateStatus(b.id, e.target.value)
                              }
                              className="kb-input"
                              style={{ padding: "6px 8px", fontSize: 12 }}
                            >
                              <option value="pending">pending</option>
                              <option value="confirmed">confirmed</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            )}

            {tab === "payments" && (
              <>
                <header
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 28,
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div>
                    <span className="kb-eyebrow">Razorpay transactions</span>
                    <h1
                      style={{
                        fontFamily: "var(--kb-serif)",
                        fontSize: 32,
                        fontWeight: 400,
                        marginTop: 8,
                      }}
                    >
                      All{" "}
                      <em
                        style={{
                          fontStyle: "italic",
                          color: "var(--kb-gold-light)",
                        }}
                      >
                        payments
                      </em>
                    </h1>
                  </div>
                  <div className="filter-bar" style={{ marginBottom: 0 }}>
                    {(["all", "CREATED", "CAPTURED", "FAILED"] as const).map(
                      (f) => (
                        <button
                          key={f}
                          className={`filter-chip ${
                            paymentFilter === f ? "is-active" : ""
                          }`}
                          onClick={() => setPaymentFilter(f)}
                        >
                          {f.toLowerCase()}
                        </button>
                      )
                    )}
                  </div>
                </header>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Payment ID</th>
                      <th>Booking</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ textAlign: "center", color: "var(--kb-gray)" }}
                        >
                          No payments found
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => (
                        <tr key={p.orderId}>
                          <td
                            style={{
                              fontFamily: "var(--kb-mono)",
                              color: "var(--kb-gold)",
                            }}
                          >
                            {p.orderId}
                          </td>
                          <td
                            style={{
                              fontFamily: "var(--kb-mono)",
                              fontSize: 12,
                            }}
                          >
                            {p.paymentId ?? "—"}
                          </td>
                          <td>{p.booking}</td>
                          <td>₹{p.amount.toLocaleString("en-IN")}</td>
                          <td>{p.method ?? "—"}</td>
                          <td>
                            <span
                              className={`status-pill ${
                                p.status === "CAPTURED"
                                  ? "confirmed"
                                  : p.status === "FAILED"
                                  ? "cancelled"
                                  : "pending"
                              }`}
                            >
                              {p.status.toLowerCase()}
                            </span>
                          </td>
                          <td>{p.at}</td>
                          <td>
                            <button
                              className="filter-chip"
                              onClick={() => setPayDetail(p)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {payDetail && (
                  <div
                    role="dialog"
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(0,0,0,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 24,
                      zIndex: 1000,
                    }}
                    onClick={() => setPayDetail(null)}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "var(--kb-black)",
                        border: "0.5px solid var(--kb-gold)",
                        padding: 32,
                        width: "100%",
                        maxWidth: 520,
                      }}
                    >
                      <span className="kb-eyebrow">Payment details</span>
                      <h2
                        style={{
                          fontFamily: "var(--kb-serif)",
                          fontSize: 24,
                          fontWeight: 400,
                          margin: "8px 0 20px",
                        }}
                      >
                        {payDetail.booking}
                      </h2>
                      <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                        <div>
                          <b>Order ID:</b>{" "}
                          <span style={{ fontFamily: "var(--kb-mono)" }}>
                            {payDetail.orderId}
                          </span>
                        </div>
                        <div>
                          <b>Payment ID:</b>{" "}
                          <span style={{ fontFamily: "var(--kb-mono)" }}>
                            {payDetail.paymentId ?? "—"}
                          </span>
                        </div>
                        <div>
                          <b>Amount:</b> ₹{payDetail.amount.toLocaleString("en-IN")}
                        </div>
                        <div>
                          <b>Method:</b> {payDetail.method ?? "—"}
                        </div>
                        <div>
                          <b>Status:</b> {payDetail.status}
                        </div>
                        <div>
                          <b>Timestamp:</b> {payDetail.at}
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 24,
                          display: "flex",
                          gap: 10,
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button variant="ghost" onClick={() => setPayDetail(null)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === "inquiries" && (
              <>
                <span className="kb-eyebrow">Contact form submissions</span>
                <h1
                  style={{
                    fontFamily: "var(--kb-serif)",
                    fontSize: 32,
                    fontWeight: 400,
                    margin: "8px 0 28px",
                  }}
                >
                  Recent{" "}
                  <em
                    style={{
                      fontStyle: "italic",
                      color: "var(--kb-gold-light)",
                    }}
                  >
                    inquiries
                  </em>
                </h1>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Subject</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ textAlign: "center", color: "var(--kb-gray)" }}
                        >
                          No inquiries found
                        </td>
                      </tr>
                    ) : (
                      inquiries.map((i) => (
                        <tr key={i.id}>
                          <td>{formatDate(i.createdAt)}</td>
                          <td>{i.name}</td>
                          <td>
                            <a
                              href={`mailto:${i.email}`}
                              style={{ color: "var(--kb-gold)" }}
                            >
                              {i.email}
                            </a>
                          </td>
                          <td>{i.phone || "—"}</td>
                          <td>
                            <b>{i.subject}</b>
                          </td>
                          <td>{i.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            )}

            {tab === "rooms" && (
              <>
                <span className="kb-eyebrow">Inventory</span>
                <h1
                  style={{
                    fontFamily: "var(--kb-serif)",
                    fontSize: 32,
                    fontWeight: 400,
                    margin: "8px 0 28px",
                  }}
                >
                  Rooms &{" "}
                  <em
                    style={{
                      fontStyle: "italic",
                      color: "var(--kb-gold-light)",
                    }}
                  >
                    tours
                  </em>
                </h1>

                <h2
                  style={{
                    fontFamily: "var(--kb-serif)",
                    fontSize: 20,
                    fontWeight: 400,
                    margin: "24px 0 14px",
                    color: "var(--kb-gold)",
                  }}
                >
                  Rooms
                </h2>
                <table className="admin-table" style={{ marginBottom: 40 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Capacity</th>
                      <th>Price (Night)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ textAlign: "center", color: "var(--kb-gray)" }}
                        >
                          No rooms found
                        </td>
                      </tr>
                    ) : (
                      rooms.map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td>{r.maxGuests} Guests</td>
                          <td>₹{Number(r.price).toLocaleString("en-IN")}</td>
                          <td>
                            <span
                              className={`status-pill ${
                                r.available ? "confirmed" : "cancelled"
                              }`}
                            >
                              {r.available ? "active" : "inactive"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <h2
                  style={{
                    fontFamily: "var(--kb-serif)",
                    fontSize: 20,
                    fontWeight: 400,
                    margin: "24px 0 14px",
                    color: "var(--kb-gold)",
                  }}
                >
                  Tours
                </h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Duration</th>
                      <th>Price (Guest)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tours.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ textAlign: "center", color: "var(--kb-gray)" }}
                        >
                          No tours found
                        </td>
                      </tr>
                    ) : (
                      tours.map((t) => (
                        <tr key={t.id}>
                          <td>{t.name}</td>
                          <td>{t.duration}</td>
                          <td>₹{Number(t.price).toLocaleString("en-IN")}</td>
                          <td>
                            <span
                              className={`status-pill ${
                                t.available ? "confirmed" : "cancelled"
                              }`}
                            >
                              {t.available ? "active" : "inactive"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </>
            )}

            {tab === "reports" && (
              <>
                <span className="kb-eyebrow">Exports</span>
                <h1
                  style={{
                    fontFamily: "var(--kb-serif)",
                    fontSize: 32,
                    fontWeight: 400,
                    margin: "8px 0 28px",
                  }}
                >
                  Download{" "}
                  <em
                    style={{
                      fontStyle: "italic",
                      color: "var(--kb-gold-light)",
                    }}
                  >
                    reports
                  </em>
                </h1>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <Button variant="primary" showArrow>
                    Bookings · CSV
                  </Button>
                  <Button variant="ghost">Revenue · Last 30 days</Button>
                  <Button variant="ghost">Guest list · PDF</Button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
