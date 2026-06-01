"use client";

import Link from "next/link";
import { useState } from "react";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { SCOOTER_MODELS, TAXI_ROUTES } from "@/lib/constants/travel";

const TOURS = [
  {
    id: "nainital",
    name: "Nainital",
    em: "& Bhimtal",
    img: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80",
    days: 3,
    price: 6500,
    lede: "Lake walks at first light, sunrise from Tiffin Top, an evening on the boats. Two hill stations in three considered days.",
    highlights: ["Naina Devi temple", "Tiffin Top", "Bhimtal boat ride", "Mall Road"],
    itinerary: [
      { d: "Day 1", t: "Drive in & lake evening", desc: "Pickup Haldwani, drive 1.5h to Nainital. Boat ride at golden hour, dinner at the property." },
      { d: "Day 2", t: "Tiffin Top sunrise & Mall Road", desc: "Early start to Tiffin Top, breakfast on return, free afternoon, evening walk on Mall Road." },
      { d: "Day 3", t: "Bhimtal & return", desc: "Drive to Bhimtal lake, lunch by water, return to Haldwani by evening." },
    ],
  },
  {
    id: "corbett",
    name: "Jim",
    em: "Corbett",
    img: "https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=1200&q=80",
    days: 3,
    price: 8000,
    lede: "Two safaris, one bird-watching morning. Forest stay, packed lunches, vetted naturalist guide.",
    highlights: ["Dhikala zone safari", "Bijrani drive", "Corbett museum", "Riverside breakfast"],
    itinerary: [
      { d: "Day 1", t: "Arrival & evening safari", desc: "Drive to Corbett, lunch at riverside, evening jeep safari (Bijrani)." },
      { d: "Day 2", t: "Full-day Dhikala", desc: "Pre-dawn entry to Dhikala zone, breakfast in the forest, return for siesta, evening bird walk." },
      { d: "Day 3", t: "Museum & return", desc: "Visit Corbett museum, lazy brunch, drive back by afternoon." },
    ],
  },
  {
    id: "kedarnath",
    name: "Kedarnath",
    em: "Yatra",
    img: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80",
    days: 4,
    price: 12000,
    lede: "A measured pilgrimage. Vehicle to Gaurikund, ponies and porters arranged, two nights at altitude.",
    highlights: ["Gaurikund base", "Kedarnath darshan", "Triyuginarayan", "Sonprayag camp"],
    itinerary: [
      { d: "Day 1", t: "Drive to Sonprayag", desc: "Long drive day, overnight at Sonprayag camp." },
      { d: "Day 2", t: "Gaurikund to Kedarnath", desc: "Vehicle to Gaurikund, ascent (pony/porter optional), overnight near temple." },
      { d: "Day 3", t: "Darshan & descent", desc: "Pre-dawn darshan, descent to Sonprayag by evening." },
      { d: "Day 4", t: "Triyuginarayan & return", desc: "Side trip to Triyuginarayan temple, drive back to Haldwani." },
    ],
  },
];

export default function TravelPage() {
  const [openId, setOpenId] = useState<string | null>(TOURS[0].id);

  return (
    <SiteShell>
      <section className="page-hero kb-grain">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">The Travel Desk</span>
            <h1>Routes through <em>the foothills</em>.</h1>
            <p>
              Every package built around our own family&apos;s travel notes. Private vehicles,
              vetted homestays, no rushed itineraries.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <div style={{ display: "grid", gap: 28 }}>
            {TOURS.map((t, i) => {
              const open = openId === t.id;
              return (
                <Reveal key={t.id} delay={i * 0.06}>
                  <article className="room-card" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr" }}>
                    <div className="room-card__img" style={{ backgroundImage: `url(${t.img})`, aspectRatio: "auto" }} />
                    <div className="room-card__body">
                      <div className="room-card__label">{t.days} days · per person</div>
                      <h3 className="room-card__name">{t.name} <em>{t.em}</em></h3>
                      <p className="room-card__lede">{t.lede}</p>
                      <ul className="room-card__amenities">
                        {t.highlights.map((h) => <li key={h}>{h}</li>)}
                      </ul>
                      <button
                        className="filter-chip"
                        onClick={() => setOpenId(open ? null : t.id)}
                        style={{ alignSelf: "flex-start", marginBottom: 18 }}
                      >
                        {open ? "Hide Itinerary" : "View Itinerary"}
                      </button>
                      {open && (
                        <div className="itinerary">
                          {t.itinerary.map((d) => (
                            <div key={d.d} className="itin-day">
                              <div className="itin-day__num">{d.d}</div>
                              <div>
                                <div className="itin-day__title">{d.t}</div>
                                <div className="itin-day__desc">{d.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="room-card__foot">
                        <div className="room-card__price">
                          ₹{t.price.toLocaleString("en-IN")}<small>/ person</small>
                        </div>
                        <Link href={`/checkout?type=tour&id=${t.id}`}>
                          <Button variant="primary" showArrow>Book Tour</Button>
                        </Link>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">On Two Wheels</span>
            <h2>Scooter <em>rentals</em>.</h2>
            <p>
              Self-ride the foothills at your own pace. Helmet and a full tank to start —
              book and pay online, collect the keys at reception.
            </p>
          </Reveal>
          <div className="cards-grid" style={{ marginTop: 32 }}>
            {SCOOTER_MODELS.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.06} as="article">
                <div className="room-card">
                  <div className="room-card__img" style={{ backgroundImage: `url(${s.img})` }} />
                  <div className="room-card__body">
                    <div className="room-card__label">Per day · helmet included</div>
                    <h3 className="room-card__name">{s.name}</h3>
                    <p className="room-card__lede">{s.blurb}</p>
                    <div className="room-card__foot">
                      <div className="room-card__price">
                        ₹{s.dailyRate.toLocaleString("en-IN")}<small>/ day</small>
                      </div>
                      <Link href={`/checkout?type=scooter&id=${s.id}`}>
                        <Button variant="primary" showArrow>Rent Now</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">Cabs & Transfers</span>
            <h2>Taxi <em>&amp; cabs</em>.</h2>
            <p>
              Vetted local drivers on fixed, transparent fares. Pick a route, choose your
              pickup time, and pay online — no haggling at the gate.
            </p>
          </Reveal>
          <div className="cards-grid" style={{ marginTop: 32 }}>
            {TAXI_ROUTES.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.06} as="article">
                <div className="room-card">
                  <div className="room-card__img" style={{ backgroundImage: `url(${r.img})` }} />
                  <div className="room-card__body">
                    <div className="room-card__label">Fixed fare · private cab</div>
                    <h3 className="room-card__name">{r.name}</h3>
                    <p className="room-card__lede">{r.blurb}</p>
                    <div className="room-card__foot">
                      <div className="room-card__price">
                        ₹{r.price.toLocaleString("en-IN")}<small>/ trip</small>
                      </div>
                      <Link href={`/checkout?type=taxi&id=${r.id}`}>
                        <Button variant="primary" showArrow>Book Cab</Button>
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
