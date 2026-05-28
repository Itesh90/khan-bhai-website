"use client";

import { useState } from "react";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Ornament from "@/components/ui/Ornament";
import Input from "@/components/ui/Input";

const SPACES = [
  {
    id: "lawn",
    name: "The Royal Garden Lawn",
    category: "Outdoor Space",
    img: "/images/banquet/lawn.jpg",
    capacity: "250 – 400 guests",
    description:
      "A stunning open-air lawn framed by the foothills, featuring premium canopy drapes, custom lighting, and golden banquet chairs. Perfect for grand weddings, receptions, and major celebrations under the mountain skies.",
    features: [
      "Open-air setting with scenic mountain backdrop",
      "Premium waterproof canopy drapes",
      "Dynamic ambiance lighting & staging",
      "Seating capacity up to 400 guests",
    ],
  },
  {
    id: "hall",
    name: "The Grand Indoor Hall",
    category: "Indoor Space",
    img: "/images/banquet/hall.jpg",
    capacity: "80 – 150 guests",
    description:
      "An elegantly styled indoor banquet hall featuring premium satin draped ceilings, custom crystal chandeliers, and luxury velvet sofa seating. Fully climate-controlled for year-round celebrations, corporate meets, and intimate functions.",
    features: [
      "Climate-controlled indoor space",
      "Plush lounge sofa arrangements",
      "High-end acoustic & sound system",
      "Customizable satin ceiling drapes",
    ],
  },
  {
    id: "stage",
    name: "Celebration Stage & Backdrop",
    category: "Design Highlight",
    img: "/images/banquet/stage.jpg",
    capacity: "Central Highlight",
    description:
      "A professionally designed wedding and function stage featuring a custom-carved luxury high-back sofa set, floral backdrop, and warm spot-lighting. Keeps the focus entirely on the hosts and couples.",
    features: [
      "Luxury high-back sofa set",
      "Intricate floral & fabric backdrop",
      "Dimmable spotlighting",
      "Elevated wooden platform construction",
    ],
  },
  {
    id: "arch",
    name: "The Welcome Archway",
    category: "Design Highlight",
    img: "/images/banquet/arch.jpg",
    capacity: "Entrance Pathway",
    description:
      "Make a grand entry through our signature floral welcome archway. Hand-curated with seasonal local blossoms and vibrant flower garlands, this pathway sets a festive and warm tone for arriving guests.",
    features: [
      "Customizable fresh flower setups",
      "Elegant welcome arch structure",
      "Festive pathway lighting",
      "Ideal photo spot for guests",
    ],
  },
  {
    id: "catering",
    name: "Signature Live Catering & Buffet",
    category: "Dining Experience",
    img: "/images/banquet/buffet.png",
    capacity: "Cuisine & Catering",
    description:
      "Our catering service is run directly by *The Kitchen* of Khan Bhai S. We set up stunning gold-paneled buffet counters serving signature live tandoors, slow-cooked Awadhi curries, and traditional Kumaoni mountain kitchen specialties.",
    features: [
      "Live tandoor and grill stations",
      "Premium gold-paneled presentation counters",
      "Customized menus (Veg & Non-Veg options)",
      "Vetted, professional hospitality staff",
    ],
  },
];

export default function BanquetPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    guests: "100",
    space: "lawn",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState(false);

  const set = (k: string, v: string) => {
    setFormData((prev) => ({ ...prev, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      setError(true);
      setStatusMsg("Please fill out your name, email, and phone number.");
      return;
    }

    setLoading(true);
    setError(false);
    setStatusMsg("Submitting your inquiry...");

    try {
      const selectedSpace = SPACES.find((s) => s.id === formData.space)?.name || "General";
      const subject = `Banquet Inquiry: ${selectedSpace} (${formData.guests} Guests)`;
      const messageBody = `
Event Date: ${formData.eventDate}
Preferred Space: ${selectedSpace}
Estimated Guest Count: ${formData.guests}

Additional Message:
${formData.message}
      `.trim();

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: subject,
          message: messageBody,
          type: "general",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send inquiry");
      }

      setError(false);
      setStatusMsg("Thank you! Our events manager will contact you within the hour.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        eventDate: "",
        guests: "100",
        space: "lawn",
        message: "",
      });
    } catch (err) {
      setError(true);
      setStatusMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      {/* HERO */}
      <section className="page-hero kb-grain">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">Events & Weddings</span>
            <h1>
              Grand spaces, <em>legendary hospitality</em>.
            </h1>
            <p>
              Host your weddings, receptions, and gatherings across our indoor luxury hall
              and mountain-framed garden lawns. Fully catered by *The Kitchen* since 1998.
            </p>
          </Reveal>
        </div>
      </section>

      {/* GALLERY / SPACES */}
      <section className="sect">
        <div className="kb-container">
          <Reveal className="sect__head">
            <span className="kb-eyebrow">Our Venues</span>
            <h2 style={{ marginTop: 14 }}>Spaces tailored to <em>your celebration</em>.</h2>
            <p>
              Explore our indoor and outdoor venues, wedding stage setups, and culinary experiences
              designed to wow your guests.
            </p>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: 80, marginTop: 40 }}>
            {SPACES.map((space, i) => (
              <Reveal key={space.id} delay={i * 0.05} as="article">
                <div
                  className="why__grid"
                  style={{
                    alignItems: "center",
                    flexDirection: i % 2 === 1 ? "row-reverse" : "row",
                  }}
                >
                  <div
                    className="why__media"
                    style={{
                      height: 400,
                      borderRadius: "var(--kb-radius-lg)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="why__media-img"
                      style={{
                        backgroundImage: `url(${space.img})`,
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                        height: "100%",
                      }}
                    />
                  </div>
                  <div className="why__copy">
                    <span className="kb-eyebrow">{space.category} · {space.capacity}</span>
                    <h3 style={{ marginTop: 14, fontFamily: "var(--kb-serif)", fontWeight: 400 }}>
                      {space.name}
                    </h3>
                    <p style={{ marginTop: 14, color: "var(--kb-text-muted)", fontSize: 15, lineHeight: 1.7 }}>
                      {space.description}
                    </p>
                    <ul
                      style={{
                        marginTop: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        paddingLeft: 0,
                        listStyle: "none",
                      }}
                    >
                      {space.features.map((feat) => (
                        <li
                          key={feat}
                          style={{
                            fontSize: 13,
                            color: "var(--kb-text)",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              backgroundColor: "var(--kb-gold)",
                              borderRadius: "50%",
                              display: "inline-block",
                            }}
                          />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CATERING CALLOUT */}
      <section className="cta-band kb-grain" style={{ margin: "40px 0" }}>
        <div className="cta-band__decor" />
        <div className="kb-container">
          <div className="cta-band__inner" style={{ maxWidth: 800 }}>
            <div className="ornament" style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <Ornament />
            </div>
            <span className="kb-eyebrow">Cuisine & Banquet Catering</span>
            <h2 style={{ marginTop: 18 }}>Feasts by <em>Khan Bhai Kitchen</em></h2>
            <p>
              Your menu is prepared by the same chefs behind our highly rated restaurant. We offer customizable Live Buffet services featuring our famous Awadhi Dum Biryanis, melt-in-the-mouth Kebabs, fresh wood-fired Tandoor breads, and local Kumaoni mountain kitchen specialties.
            </p>
          </div>
        </div>
      </section>

      {/* INQUIRY FORM */}
      <section className="sect" id="inquire">
        <div className="kb-container" style={{ maxWidth: 640 }}>
          <Reveal>
            <div
              style={{
                background: "var(--kb-black-soft, #141414)",
                border: "0.5px solid var(--kb-gold-dim, rgba(201, 168, 76, 0.25))",
                padding: "40px 32px",
                borderRadius: "var(--kb-radius-lg, 16px)",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--kb-serif)",
                  fontSize: 28,
                  fontWeight: 400,
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Inquire about <em>your event</em>
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--kb-text-muted)",
                  textAlign: "center",
                  marginBottom: 30,
                }}
              >
                Fill out the form below, and our events manager will contact you with package availability and pricing details.
              </p>

              <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Anjali Mehrotra"
                    required
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@email.com"
                    required
                  />
                </div>

                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                  <Input
                    label="Estimated Event Date"
                    name="eventDate"
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => set("eventDate", e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="kb-input-label" htmlFor="space" style={{ fontSize: 12, color: "var(--kb-text-muted)" }}>
                      Preferred Space
                    </label>
                    <select
                      id="space"
                      value={formData.space}
                      onChange={(e) => set("space", e.target.value)}
                      className="kb-input"
                      style={{
                        width: "100%",
                        height: 50,
                        background: "transparent",
                        color: "var(--kb-text)",
                        border: "0.5px solid var(--kb-gold-dim)",
                        padding: "0 16px",
                        borderRadius: "4px",
                        outline: "none",
                        fontFamily: "var(--kb-sans)",
                        fontSize: 14,
                      }}
                    >
                      <option value="lawn" style={{ background: "var(--kb-black)" }}>Royal Garden Lawn</option>
                      <option value="hall" style={{ background: "var(--kb-black)" }}>Grand Indoor Hall</option>
                      <option value="general" style={{ background: "var(--kb-black)" }}>Entire Property / Multiple Spaces</option>
                    </select>
                  </div>

                  <Input
                    label="Estimated Guests"
                    name="guests"
                    type="number"
                    min={20}
                    max={1000}
                    value={formData.guests}
                    onChange={(e) => set("guests", e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label className="kb-input-label" style={{ fontSize: 12, color: "var(--kb-text-muted)" }}>
                    Additional Requests / Event Details
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={(e) => set("message", e.target.value)}
                    className="kb-input"
                    rows={4}
                    placeholder="Tell us about the event type, catering preference, decoration requests..."
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: "var(--kb-text)",
                      border: "0.5px solid var(--kb-gold-dim)",
                      padding: "12px 16px",
                      borderRadius: "4px",
                      outline: "none",
                      fontFamily: "var(--kb-sans)",
                      fontSize: 14,
                      resize: "vertical",
                    }}
                  />
                </div>

                {statusMsg && (
                  <p
                    style={{
                      fontSize: 13,
                      fontFamily: "var(--kb-mono)",
                      color: error ? "#ff6b6b" : "var(--kb-text-muted)",
                      textAlign: "center",
                    }}
                  >
                    {statusMsg}
                  </p>
                )}

                <Button type="submit" variant="primary" showArrow disabled={loading} style={{ alignSelf: "center", marginTop: 10 }}>
                  {loading ? "Submitting..." : "Submit Inquiry"}
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
