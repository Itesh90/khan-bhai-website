"use client";

import Link from "next/link";
import { useState } from "react";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { BRAND } from "@/lib/design";
import { SCOOTER_MODELS, TAXI_ROUTES } from "@/lib/constants/travel";

const TOURS = [
  {
    id: "nainital",
    name: "Nainital",
    em: "& Bhimtal",
    img: "/images/travel/IMG_1774.jpg",
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
    img: "/images/travel/IMG_1768.jpg",
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
    name: "Char Dham",
    em: "& Kedarnath",
    img: "/images/travel/IMG_1770.jpg",
    days: 4,
    price: 12000,
    lede: "A measured pilgrimage. Vehicle to Gaurikund, ponies and porters arranged, two nights at altitude.",
    highlights: ["Gaurikund base", "Kedarnath darshan", "Badrinath & Mana", "Sonprayag camp"],
    itinerary: [
      { d: "Day 1", t: "Drive to Sonprayag", desc: "Long drive day, overnight at Sonprayag camp." },
      { d: "Day 2", t: "Gaurikund to Kedarnath", desc: "Vehicle to Gaurikund, ascent (pony/porter optional), overnight near temple." },
      { d: "Day 3", t: "Darshan & descent", desc: "Pre-dawn darshan, descent to Sonprayag by evening." },
      { d: "Day 4", t: "Badrinath & Mana", desc: "Onward to Badrinath darshan and the last Indian village at Mana, then drive back." },
    ],
  },
];

// Our own vehicles, photographed on the road over the years. Every car here is
// part of the working fleet — not stock imagery.
const FLEET = [
  { img: "/images/travel/IMG_1772.jpg", label: "The fleet · Haldwani" },
  { img: "/images/travel/IMG_1766.jpg", label: "Convoy · ready to roll" },
  { img: "/images/travel/IMG_1794.jpg", label: "Innova Crysta · 6+1 seats" },
  { img: "/images/travel/IMG_1792.jpg", label: "Innova Crysta · airport-ready" },
  { img: "/images/travel/IMG_1776.jpg", label: "Tempo Traveller · 12 seats" },
  { img: "/images/travel/IMG_1783.jpg", label: "Force Traveller · big groups" },
  { img: "/images/travel/IMG_1781.jpg", label: "Swift Dzire · airport runs" },
  { img: "/images/travel/IMG_1782.jpg", label: "Swift Dzire · city sedan" },
  { img: "/images/travel/IMG_1784.jpg", label: "Alto · light & nimble" },
  { img: "/images/travel/IMG_1803.JPG", label: "Maruti Gypsy · Corbett safari" },
  { img: "/images/travel/IMG_1785.jpg", label: "Tavera · 7 seats" },
  { img: "/images/travel/IMG_1767.jpg", label: "On tour · first snow" },
];

// Flower-decked cars on hire for weddings and baraats.
const WEDDINGS = [
  { img: "/images/travel/IMG_1791.jpg", label: "Fortuner · marigold doli" },
  { img: "/images/travel/IMG_1802.jpg", label: "Corolla Altis · rose baraat" },
  { img: "/images/travel/IMG_1800.jpg", label: "Etios · evening wedding" },
];

// Candid frames from real trips — proof in the people, not the brochure.
const MOMENTS = [
  { img: "/images/travel/IMG_1769.jpg", label: "Mana · the last Indian village" },
  { img: "/images/travel/IMG_1773.jpg", label: "Group departure · break of dawn" },
  { img: "/images/travel/IMG_1771.jpg", label: "Hot lunch on the road" },
  { img: "/images/travel/IMG_1765.jpg", label: "Twelve cars, one yatra" },
];

export default function TravelPage() {
  const [openId, setOpenId] = useState<string | null>(TOURS[0].id);

  return (
    <SiteShell>
      <section className="page-hero kb-grain">
        <div
          className="page-hero__bg"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(10,10,10,0.72) 0%, rgba(18,15,9,0.9) 100%), url(/images/travel/IMG_1763.png)",
          }}
        />
        <div className="kb-container" style={{ position: "relative", zIndex: 1 }}>
          <Reveal>
            <span className="kb-eyebrow">The Travel Desk</span>
            <h1>Routes through <em>the foothills</em>.</h1>
            <p>
              Driving Kumaon since 1998 — Char Dham, Corbett, Nainital and back.
              Our own vehicles, our own drivers, no rushed itineraries.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">Signature Journeys</span>
            <h2>Packages we&apos;ve <em>driven ourselves</em>.</h2>
          </Reveal>
          <div style={{ display: "grid", gap: 28, marginTop: 32 }}>
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
            <span className="kb-eyebrow">Our Fleet</span>
            <h2>The cars that <em>do the miles</em>.</h2>
            <p>
              Hatchbacks for a quick lake run, sedans for the airport, Innovas and
              Travellers for the family — all owned, maintained and driven by us.
            </p>
          </Reveal>
          <div className="gallery-grid">
            {FLEET.map((v, i) => (
              <Reveal key={v.img} delay={i * 0.04} as="article" className="gallery-tile">
                <div className="gallery-tile__img" style={{ backgroundImage: `url(${v.img})` }} />
                <div className="gallery-tile__cap">{v.label}</div>
              </Reveal>
            ))}
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

      <section className="sect">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">Weddings & Occasions</span>
            <h2>Flowers on the <em>bonnet</em>.</h2>
            <p>
              Decorated cars for the doli and baraat — Fortuner, Corolla, Etios and more,
              dressed in marigold and rose and driven to the muhurat on time.
            </p>
          </Reveal>
          <div className="gallery-grid">
            {WEDDINGS.map((w, i) => (
              <Reveal key={w.img} delay={i * 0.05} as="article" className="gallery-tile">
                <div className="gallery-tile__img" style={{ backgroundImage: `url(${w.img})` }} />
                <div className="gallery-tile__cap">{w.label}</div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="cta-band__ctas" style={{ marginTop: 32 }}>
              <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" showArrow>Enquire on WhatsApp</Button>
              </a>
              <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`}>
                <Button variant="ghost">Call {BRAND.phone}</Button>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HERITAGE — credibility, grounded in the old photographs */}
      <section className="sect why">
        <div className="kb-container">
          <div className="why__grid">
            <Reveal className="why__copy">
              <span className="kb-eyebrow">On the road since 1998</span>
              <h2 style={{ marginTop: 14 }}>Twenty-eight years of the <em>same roads</em>.</h2>
              <p className="lede">
                It started with one Maruti Omni running the plains to the hills, the
                family name hand-painted on the door. A Toyota Qualis came next, and with
                it the full Char Dham circuit. The number plates tell the story — Delhi,
                then UA, now UK — but the hands on the wheel never changed.
              </p>
              <div className="why__list">
                <div className="why__item">
                  <span className="num">1998</span>
                  <h4>The first van</h4>
                  <p>A single Maruti Omni, Delhi plates, ferrying pilgrims to the foothills.</p>
                </div>
                <div className="why__item">
                  <span className="num">c. 2003</span>
                  <h4>The Qualis years</h4>
                  <p>A Toyota Qualis and the first full Char Dham and Kedarnath runs.</p>
                </div>
                <div className="why__item">
                  <span className="num">Today</span>
                  <h4>A working fleet</h4>
                  <p>Hatchbacks, sedans, Innovas, Travellers and safari Gypsies — all our own.</p>
                </div>
                <div className="why__item">
                  <span className="num">28 yrs</span>
                  <h4>One family</h4>
                  <p>Same drivers, same name over the door, three generations on these roads.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="why__media">
                  <div className="why__media-img" style={{ backgroundImage: "url(/images/travel/IMG_1804.jpg)" }} />
                  <div className="why__media-cap">
                    <div className="num">1998</div>
                    <div className="lab">The first van · Maruti Omni</div>
                  </div>
                </div>
                <div className="why__media">
                  <div className="why__media-img" style={{ backgroundImage: "url(/images/travel/IMG_1787.jpg)" }} />
                  <div className="why__media-cap">
                    <div className="num">c. 2003</div>
                    <div className="lab">The Qualis years</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="gallery-grid gallery-grid--4">
              {MOMENTS.map((m) => (
                <article key={m.img} className="gallery-tile">
                  <div className="gallery-tile__img" style={{ backgroundImage: `url(${m.img})` }} />
                  <div className="gallery-tile__cap">{m.label}</div>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
