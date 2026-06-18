"use client";

import Link from "next/link";
import { useState } from "react";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

const ROOMS = [
  {
    id: "deluxe",
    label: "Category I",
    name: "Deluxe",
    em: "Room",
    images: [
      "/images/stay/deluxe-room.jpg",
      "/images/stay/deluxe-room-2.jpg",
      "/images/stay/deluxe-room-3.jpg",
    ],
    lede: "King bed with an extra single, sit-out balcony and a working desk. Comfortable and well-lit.",
    amenities: ["King bed", "Balcony", "AC", "Coffee", "WiFi", "Workspace"],
    price: 2400,
    capacity: 2,
  },
  {
    id: "balcony",
    label: "Category II",
    name: "Room with Balcony View",
    em: "",
    images: [
      "/images/stay/balcony-room.jpg",
      "/images/stay/balcony-room-2.jpg",
      "/images/stay/balcony-room-3.jpg",
      "/images/stay/balcony-room-4.jpg",
    ],
    lede: "Premium room with a vaulted ceiling and a beautiful sit-out balcony offering views of the valley.",
    amenities: ["King bed", "Valley View Balcony", "AC", "Bathtub", "Mini bar", "WiFi"],
    price: 3000,
    capacity: 2,
  },
  {
    id: "suite",
    label: "Category III",
    name: "Sweet",
    em: "Room",
    images: [
      "/images/stay/loft-suite.jpg",
      "/images/stay/loft-suite-2.jpg",
    ],
    lede: "Spacious split-level loft with a private wooden staircase, four beds and a sit-out balcony — ideal for families.",
    amenities: ["4 beds", "Duplex loft", "Private balcony", "AC", "Lounge sofa", "WiFi"],
    price: 7500,
    capacity: 4,
  },
];

const FILTERS = [
  { key: "all", label: "All Rooms" },
  { key: "2", label: "2 Guests" },
  { key: "3", label: "3 Guests" },
  { key: "4", label: "4+ Guests" },
];

function RoomGallery({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const go = (d: number) =>
    setIdx((p) => (p + d + images.length) % images.length);

  return (
    <div className="room-card__gallery">
      {images.map((src, i) => (
        <div
          key={src}
          className="room-card__img"
          style={{ backgroundImage: `url(${src})`, opacity: i === idx ? 1 : 0 }}
          aria-hidden={i !== idx}
        />
      ))}
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="room-gallery-nav room-gallery-nav--prev"
            onClick={() => go(-1)}
            aria-label={`Previous photo of ${name}`}
          >
            ‹
          </button>
          <button
            type="button"
            className="room-gallery-nav room-gallery-nav--next"
            onClick={() => go(1)}
            aria-label={`Next photo of ${name}`}
          >
            ›
          </button>
          <div className="room-gallery-dots">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                className={`room-gallery-dot ${i === idx ? "is-active" : ""}`}
                onClick={() => setIdx(i)}
                aria-label={`Show photo ${i + 1} of ${name}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
              Twenty-eight rooms, <em>three categories</em>.
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
                  <RoomGallery images={r.images} name={r.name} />
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
