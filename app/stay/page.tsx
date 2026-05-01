"use client";

import Link from "next/link";
import { useState } from "react";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

const ROOMS = [
  {
    id: "standard",
    label: "Category I",
    name: "Standard",
    em: "Room",
    img: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80",
    lede: "Twin or queen, garden view. Walnut floors, cotton linen, brass fixtures.",
    amenities: ["Queen bed", "Garden view", "AC", "Tea station", "WiFi"],
    price: 1200,
    capacity: 2,
  },
  {
    id: "deluxe",
    label: "Category II",
    name: "Deluxe",
    em: "Room",
    img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80",
    lede: "King bed, sit-out balcony, working desk. The room our regulars come back to.",
    amenities: ["King bed", "Balcony", "AC", "Coffee", "WiFi", "Workspace"],
    price: 2000,
    capacity: 2,
  },
  {
    id: "premium",
    label: "Category III",
    name: "Premium",
    em: "Suite",
    img: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900&q=80",
    lede: "Two-room suite, separate living area, soaking tub. Sleeps a small family.",
    amenities: ["King bed", "Living area", "Bathtub", "Mini bar", "WiFi"],
    price: 3500,
    capacity: 4,
  },
  {
    id: "walnut",
    label: "Category IV",
    name: "Walnut",
    em: "Suite",
    img: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900&q=80",
    lede: "Our largest suite. Four-poster bed in unfinished walnut. Sunrise balcony.",
    amenities: ["Four-poster", "Private balcony", "Lounge", "Tub", "Concierge"],
    price: 5500,
    capacity: 3,
  },
];

const FILTERS = [
  { key: "all", label: "All Rooms" },
  { key: "2", label: "2 Guests" },
  { key: "3", label: "3 Guests" },
  { key: "4", label: "4+ Guests" },
];

export default function StayPage() {
  const [filter, setFilter] = useState("all");
  const filtered = ROOMS.filter((r) => {
    if (filter === "all") return true;
    if (filter === "4") return r.capacity >= 4;
    return r.capacity === Number(filter);
  });

  return (
    <SiteShell>
      <section className="page-hero kb-grain">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">The Stay</span>
            <h1>
              Twenty-eight rooms, <em>four moods</em>.
            </h1>
            <p>
              Each finished in walnut, brass and hand-loomed Kumaoni textiles. Pick a
              room, pick your dates, and we&apos;ll do the rest.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <div className="filter-bar">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-chip ${filter === f.key ? "is-active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="cards-grid">
            {filtered.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.05} as="article">
                <div className="room-card">
                  <div className="room-card__img" style={{ backgroundImage: `url(${r.img})` }} />
                  <div className="room-card__body">
                    <div className="room-card__label">{r.label} · sleeps {r.capacity}</div>
                    <h3 className="room-card__name">{r.name} <em>{r.em}</em></h3>
                    <p className="room-card__lede">{r.lede}</p>
                    <ul className="room-card__amenities">
                      {r.amenities.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                    <div className="room-card__foot">
                      <div className="room-card__price">
                        ₹{r.price.toLocaleString("en-IN")}<small>/ night</small>
                      </div>
                      <Link href={`/checkout?type=room&id=${r.id}`}>
                        <Button variant="primary" showArrow>Reserve</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
