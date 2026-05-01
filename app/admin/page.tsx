"use client";

import { useState, FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Monogram from "@/components/ui/Monogram";

const TABS = [
  { key: "bookings", label: "Bookings" },
  { key: "payments", label: "Payments" },
  { key: "inquiries", label: "Inquiries" },
  { key: "rooms", label: "Rooms & Tours" },
  { key: "reports", label: "Reports" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const SAMPLE_BOOKINGS = [
  { id: "KB-A1B2", guest: "Anjali Mehrotra", item: "Walnut Suite", dates: "May 12 – 15", total: 19470, status: "confirmed", payment: "CAPTURED" },
  { id: "KB-C3D4", guest: "Rohan Iyer",      item: "Corbett Tour",  dates: "May 18 – 21", total: 18880, status: "pending",   payment: "CREATED" },
  { id: "KB-E5F6", guest: "Faisal Khan",     item: "Deluxe Room",   dates: "May 22 – 24", total: 4720,  status: "confirmed", payment: "CAPTURED" },
  { id: "KB-G7H8", guest: "Meera Pillai",    item: "Nainital Tour", dates: "May 25 – 27", total: 15340, status: "cancelled", payment: "FAILED" },
];

const SAMPLE_PAYMENTS = [
  { orderId: "order_NyJk1A2B3", paymentId: "pay_NyJk9X8Y7", booking: "KB-A1B2", amount: 19470, status: "CAPTURED", method: "card",       at: "May 1, 11:42" },
  { orderId: "order_NyJk5C6D7", paymentId: null,             booking: "KB-C3D4", amount: 18880, status: "CREATED",  method: null,         at: "May 1, 12:08" },
  { orderId: "order_NyJk9E8F1", paymentId: "pay_NyJkA1B2C3", booking: "KB-E5F6", amount: 4720,  status: "CAPTURED", method: "upi",        at: "Apr 30, 18:21" },
  { orderId: "order_NyJk2G3H4", paymentId: "pay_NyJkD5E6F7", booking: "KB-G7H8", amount: 15340, status: "FAILED",   method: "netbanking", at: "Apr 30, 09:15" },
];

const SAMPLE_INQUIRIES = [
  { id: 1, name: "Vivek Rao",     email: "vivek@example.com",  msg: "Group booking for 12 people in June?" },
  { id: 2, name: "Sneha Kapoor",  email: "sneha@example.com",  msg: "Do you cater weddings on the lawn?" },
  { id: 3, name: "Hardik Shah",   email: "hardik@example.com", msg: "Pet friendly rooms available?" },
];

const SAMPLE_ROOMS = [
  { name: "Standard Room", inv: 8, price: 1200, status: "active" },
  { name: "Deluxe Room",   inv: 12, price: 2000, status: "active" },
  { name: "Premium Suite", inv: 6, price: 3500, status: "active" },
  { name: "Walnut Suite",  inv: 2, price: 5500, status: "active" },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState(SAMPLE_BOOKINGS);
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "CREATED" | "CAPTURED" | "FAILED">("all");
  const [payDetail, setPayDetail] = useState<(typeof SAMPLE_PAYMENTS)[number] | null>(null);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const filtered = bookings.filter((b) => filter === "all" || b.status === filter);

  function updateStatus(id: string, status: string) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <h2 style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Monogram />
          <span style={{ fontFamily: "var(--kb-serif)", fontSize: 18 }}>Admin</span>
        </h2>
        {TABS.map((t) => (
          <a key={t.key} className={tab === t.key ? "is-active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </a>
        ))}
        <a style={{ marginTop: 32 }} onClick={() => setAuthed(false)}>
          Logout
        </a>
      </aside>

      <main className="admin-main">
        {tab === "bookings" && (
          <>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
              <div>
                <span className="kb-eyebrow">Reservations</span>
                <h1 style={{ fontFamily: "var(--kb-serif)", fontSize: 32, fontWeight: 400, marginTop: 8 }}>
                  All <em style={{ fontStyle: "italic", color: "var(--kb-gold-light)" }}>bookings</em>
                </h1>
              </div>
              <div className="filter-bar" style={{ marginBottom: 0 }}>
                {(["all", "confirmed", "pending", "cancelled"] as const).map((f) => (
                  <button key={f} className={`filter-chip ${filter === f ? "is-active" : ""}`} onClick={() => setFilter(f)}>
                    {f}
                  </button>
                ))}
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
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: "var(--kb-mono)", color: "var(--kb-gold)" }}>{b.id}</td>
                    <td>{b.guest}</td>
                    <td>{b.item}</td>
                    <td>{b.dates}</td>
                    <td>₹{b.total.toLocaleString("en-IN")}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          b.payment === "CAPTURED"
                            ? "confirmed"
                            : b.payment === "FAILED"
                            ? "cancelled"
                            : "pending"
                        }`}
                      >
                        {b.payment}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${b.status}`}>{b.status}</span>
                    </td>
                    <td>
                      <select
                        value={b.status}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                        className="kb-input"
                        style={{ padding: "6px 8px", fontSize: 12 }}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === "payments" && (
          <>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
              <div>
                <span className="kb-eyebrow">Razorpay transactions</span>
                <h1 style={{ fontFamily: "var(--kb-serif)", fontSize: 32, fontWeight: 400, marginTop: 8 }}>
                  All <em style={{ fontStyle: "italic", color: "var(--kb-gold-light)" }}>payments</em>
                </h1>
              </div>
              <div className="filter-bar" style={{ marginBottom: 0 }}>
                {(["all", "CREATED", "CAPTURED", "FAILED"] as const).map((f) => (
                  <button key={f} className={`filter-chip ${paymentFilter === f ? "is-active" : ""}`} onClick={() => setPaymentFilter(f)}>
                    {f.toLowerCase()}
                  </button>
                ))}
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
                {SAMPLE_PAYMENTS.filter((p) => paymentFilter === "all" || p.status === paymentFilter).map((p) => (
                  <tr key={p.orderId}>
                    <td style={{ fontFamily: "var(--kb-mono)", color: "var(--kb-gold)" }}>{p.orderId}</td>
                    <td style={{ fontFamily: "var(--kb-mono)", fontSize: 12 }}>{p.paymentId ?? "—"}</td>
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
                      <button className="filter-chip" onClick={() => setPayDetail(p)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
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
                  <h2 style={{ fontFamily: "var(--kb-serif)", fontSize: 24, fontWeight: 400, margin: "8px 0 20px" }}>
                    {payDetail.booking}
                  </h2>
                  <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                    <div><b>Order ID:</b> <span style={{ fontFamily: "var(--kb-mono)" }}>{payDetail.orderId}</span></div>
                    <div><b>Payment ID:</b> <span style={{ fontFamily: "var(--kb-mono)" }}>{payDetail.paymentId ?? "—"}</span></div>
                    <div><b>Amount:</b> ₹{payDetail.amount.toLocaleString("en-IN")}</div>
                    <div><b>Method:</b> {payDetail.method ?? "—"}</div>
                    <div><b>Status:</b> {payDetail.status}</div>
                    <div><b>Timestamp:</b> {payDetail.at}</div>
                  </div>
                  <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <Button variant="ghost" onClick={() => setPayDetail(null)}>Close</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "inquiries" && (
          <>
            <span className="kb-eyebrow">Contact form submissions</span>
            <h1 style={{ fontFamily: "var(--kb-serif)", fontSize: 32, fontWeight: 400, margin: "8px 0 28px" }}>
              Recent <em style={{ fontStyle: "italic", color: "var(--kb-gold-light)" }}>inquiries</em>
            </h1>
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Email</th><th>Message</th></tr></thead>
              <tbody>
                {SAMPLE_INQUIRIES.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td><a href={`mailto:${i.email}`} style={{ color: "var(--kb-gold)" }}>{i.email}</a></td>
                    <td>{i.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === "rooms" && (
          <>
            <span className="kb-eyebrow">Inventory</span>
            <h1 style={{ fontFamily: "var(--kb-serif)", fontSize: 32, fontWeight: 400, margin: "8px 0 28px" }}>
              Rooms & <em style={{ fontStyle: "italic", color: "var(--kb-gold-light)" }}>tours</em>
            </h1>
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Inventory</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {SAMPLE_ROOMS.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.inv}</td>
                    <td>₹{r.price.toLocaleString("en-IN")}</td>
                    <td><span className="status-pill confirmed">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === "reports" && (
          <>
            <span className="kb-eyebrow">Exports</span>
            <h1 style={{ fontFamily: "var(--kb-serif)", fontSize: 32, fontWeight: 400, margin: "8px 0 28px" }}>
              Download <em style={{ fontStyle: "italic", color: "var(--kb-gold-light)" }}>reports</em>
            </h1>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Button variant="primary" showArrow>Bookings · CSV</Button>
              <Button variant="ghost">Revenue · Last 30 days</Button>
              <Button variant="ghost">Guest list · PDF</Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (email && password.length >= 4) {
      onLogin();
    } else {
      setErr("Invalid credentials");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 420,
          border: "0.5px solid var(--kb-gold)",
          padding: 44,
          background: "var(--kb-black)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <Monogram />
        </div>
        <span className="kb-eyebrow" style={{ display: "block", textAlign: "center", marginBottom: 14 }}>
          Admin Console
        </span>
        <h2 style={{ fontFamily: "var(--kb-serif)", fontSize: 28, textAlign: "center", marginBottom: 32, fontWeight: 400 }}>
          Welcome <em style={{ fontStyle: "italic", color: "var(--kb-gold-light)" }}>back</em>.
        </h2>
        <div style={{ display: "grid", gap: 18 }}>
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@khanbhais.in"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err && <p style={{ color: "#ff6b6b", fontSize: 12 }}>{err}</p>}
          <Button type="submit" variant="primary" showArrow>
            Sign in
          </Button>
        </div>
      </form>
    </div>
  );
}
