"use client";

import Link from "next/link";
import { useState } from "react";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { BRAND } from "@/lib/design";
import { SCOOTER_MODELS, TAXI_ROUTES } from "@/lib/constants/travel";

// Trip-type tags drive the filter below. A tour can belong to more than one.
type TripType = "couple" | "family" | "group" | "solo" | "adventure" | "pilgrimage";

const TRIP_TYPES: { key: "all" | TripType; label: string }[] = [
  { key: "all", label: "All Journeys" },
  { key: "couple", label: "Couple" },
  { key: "family", label: "Family" },
  { key: "group", label: "Group" },
  { key: "solo", label: "Solo" },
  { key: "adventure", label: "Adventure" },
  { key: "pilgrimage", label: "Pilgrimage" },
];

const TYPE_LABEL: Record<TripType, string> = {
  couple: "Couple",
  family: "Family",
  group: "Group",
  solo: "Solo",
  adventure: "Adventure",
  pilgrimage: "Pilgrimage",
};

interface Tour {
  id: string;
  name: string;
  em: string;
  img: string;
  days: number;
  price: number;
  types: TripType[];
  lede: string;
  highlights: string[];
  itinerary: { d: string; t: string; desc: string }[];
}

const TOURS: Tour[] = [
  {
    id: "nainital",
    name: "Nainital",
    em: "& Bhimtal",
    img: "/images/travel/IMG_1774.jpg",
    days: 3,
    price: 6500,
    types: ["couple", "family"],
    lede: "Lake walks at first light, the cable car to Snow View, an evening on the boats. Two hill stations in three considered days.",
    highlights: ["Naina Devi temple", "Snow View cable car", "Bhimtal boat ride", "Mall Road"],
    itinerary: [
      { d: "Day 1", t: "Drive in & Naini Lake", desc: "Pickup Haldwani, drive 1.5h to Nainital. Boat ride at golden hour, Naina Devi temple and the Tibetan market." },
      { d: "Day 2", t: "Snow View & sightseeing", desc: "Cable car to Snow View, Cave Garden, Lovers Point and the local round, free evening on Mall Road." },
      { d: "Day 3", t: "Bhimtal & return", desc: "Bhowali, tea gardens and the Bhimtal lake circuit, return to Haldwani by evening." },
    ],
  },
  {
    id: "family-bliss",
    name: "Family",
    em: "Bliss",
    img: "/images/travel/IMG_1771.jpg",
    days: 3,
    price: 6000,
    types: ["family"],
    lede: "Nainital without the noise, at a pace that suits children and grandparents alike. Lakeside cottage, gentle days, one easy trip to Bhimtal.",
    highlights: ["Lake-view cottage", "Pony rides", "Echo Point walk", "Bhimtal picnic"],
    itinerary: [
      { d: "Day 1", t: "Soft arrival", desc: "Check in to a lakeside cottage with a lake-view balcony, evening boat ride, and a Mall Road stroll with an ice-cream stop." },
      { d: "Day 2", t: "Gentle mix", desc: "Morning cable car to Snow View, short pony rides for the children, lunch at the cottage, easy garden walk to Echo Point." },
      { d: "Day 3", t: "Calm exit", desc: "Cab to Bhimtal, feeding the fish at the dock, a packed picnic lunch, and back to Nainital by noon for checkout." },
    ],
  },
  {
    id: "solo-serenity",
    name: "Solo",
    em: "Serenity",
    img: "/images/travel/IMG_1763.png",
    days: 3,
    price: 7500,
    types: ["solo"],
    lede: "No guide, no group, nothing forced. A private cottage by the lake, an unhurried lake walk, and as much or as little as you feel like doing.",
    highlights: ["Private AC cottage", "Solo sunset boat", "2 km lake circuit", "Zero forced plans"],
    itinerary: [
      { d: "Day 1", t: "Arrival & anchor", desc: "Settle in to a private cottage with lake views, a solo sunset boat ride, and herbal chai on the Mallital promenade." },
      { d: "Day 2", t: "Breathe easy", desc: "An easy 2 km lake-circuit walk, fresh apple cider at a roadside stall, and an afternoon entirely your own." },
      { d: "Day 3", t: "Bhimtal drift", desc: "A short cab to Bhimtal, leisure by the dock, back to Nainital by noon, unhurried checkout." },
    ],
  },
  {
    id: "gangbaaz",
    name: "Gangbaaz",
    em: "Adventure",
    img: "/images/travel/IMG_1767.jpg",
    days: 3,
    price: 8500,
    types: ["adventure", "group"],
    lede: "For the ones who came to do, not just to look. Tandem paragliding, a Tiffin Top trek, ridge cycling and a barbecue night — three days at full tilt.",
    highlights: ["Tandem paragliding", "Tiffin Top trek", "Ridge cycling", "BBQ + zip-line"],
    itinerary: [
      { d: "Day 1", t: "Crash & launch", desc: "Check in to a lakeside guesthouse, tandem paragliding over Naini Lake, then an evening out on Mall Road." },
      { d: "Day 2", t: "Grind light", desc: "A 40-min trek to Tiffin Top, ropeway descent, afternoon ridge cycling, and a self-grilled BBQ dinner at the lodge." },
      { d: "Day 3", t: "Bhimtal blitz", desc: "Motor-boating at Bhimtal, optional zip-lining over the water, an apple-orchard photo stop, checkout by 1 PM." },
    ],
  },
  {
    id: "corbett",
    name: "Jim",
    em: "Corbett",
    img: "/images/travel/IMG_1768.jpg",
    days: 3,
    price: 8000,
    types: ["family", "group"],
    lede: "Two safaris, one bird-watching morning. Forest stay, packed lunches, a vetted naturalist guide.",
    highlights: ["Dhikala zone safari", "Bijrani drive", "Corbett museum", "Riverside breakfast"],
    itinerary: [
      { d: "Day 1", t: "Arrival & evening safari", desc: "Drive to Corbett, lunch at riverside, evening jeep safari (Bijrani)." },
      { d: "Day 2", t: "Full-day Dhikala", desc: "Pre-dawn entry to Dhikala zone, breakfast in the forest, return for siesta, evening bird walk." },
      { d: "Day 3", t: "Museum & return", desc: "Visit Corbett museum, lazy brunch, drive back by afternoon." },
    ],
  },
  {
    id: "kumaon-grand",
    name: "Nainital · Ranikhet",
    em: "· Corbett",
    img: "/images/travel/IMG_1773.jpg",
    days: 7,
    price: 18000,
    types: ["group"],
    lede: "The grand Kumaon loop in seven unhurried days — the lakes of Nainital, the vintage-cantonment calm of Ranikhet, and the wild edges of Jim Corbett.",
    highlights: ["Himalaya Darshan", "Chaubatia Gardens", "Ranikhet Golf Course", "Corbett Falls"],
    itinerary: [
      { d: "Day 1", t: "Arrival at Nainital", desc: "Pickup at Kathgodam or Nainital, hotel check-in, easy first evening on Mall Road and the Tibetan market." },
      { d: "Day 2", t: "Nainital sightseeing", desc: "Himalaya Darshan, Kilbury forest, tea at Pangot, Cave Garden, cable car to Snow View, boating and Hanuman Garhi." },
      { d: "Day 3", t: "On to Ranikhet", desc: "Drive to Ranikhet and settle into its old-world, vintage-military calm and wide Himalayan views." },
      { d: "Day 4", t: "Ranikhet day", desc: "War Memorial Museum, Chaubatia Gardens and the famous Golf Course, ending with sunset over the snow peaks." },
      { d: "Day 5", t: "Ranikhet to Corbett", desc: "Scenic drive to Jim Corbett, check in to a jungle resort, evening riverside walk along the Kosi." },
      { d: "Day 6", t: "Corbett day", desc: "Optional early-morning jungle safari, Corbett Falls and the Sitabani forest, free evening." },
      { d: "Day 7", t: "Departure", desc: "Breakfast and the return drive, drop to your station or onward route." },
    ],
  },
  {
    id: "kumaon-darshan",
    name: "Kumaon",
    em: "Darshan",
    img: "/images/travel/IMG_1765.jpg",
    days: 8,
    price: 22000,
    types: ["group", "pilgrimage"],
    lede: "The deep eight-day Kumaon circuit — Kausani, Chaukori, Munsiyari, the caves of Patal Bhuvaneshwar, and the ancient temples of Jageshwar and Almora.",
    highlights: ["Kainchi Dham", "Birthi Falls", "Patal Bhuvaneshwar", "Jageshwar Dham"],
    itinerary: [
      { d: "Day 1", t: "Nainital to Kausani", desc: "Via Bhowali, Kainchi Dham and Ranikhet — Himalaya viewpoint, Kalika temple, shawl factory. Night at Kausani." },
      { d: "Day 2", t: "Kausani to Chaukori", desc: "Tea gardens, the ancient Baijnath temple and Bageshwar en route to Chaukori." },
      { d: "Day 3", t: "Chaukori to Munsiyari", desc: "Through Thal and the high Birthi Falls to the trekking town of Munsiyari." },
      { d: "Day 4", t: "Munsiyari", desc: "Nanda Devi temple and the tribal heritage museum, the Panchachuli peaks in view." },
      { d: "Day 5", t: "Patal Bhuvaneshwar", desc: "Drive to the limestone cave-temple of Patal Bhuvaneshwar." },
      { d: "Day 6", t: "To Jageshwar", desc: "The Jageshwar Dham complex — over a hundred ancient stone temples in deodar forest." },
      { d: "Day 7", t: "Jageshwar to Almora", desc: "Lakhudiyar's prehistoric cave paintings and the Chitai Golu Devta temple." },
      { d: "Day 8", t: "Almora to Kathgodam", desc: "Via Ghorakhal, Bhimtal and Sattal for the drive back, drop at Kathgodam." },
    ],
  },
  {
    id: "kedarnath",
    name: "Char Dham",
    em: "& Kedarnath",
    img: "/images/travel/IMG_1770.jpg",
    days: 4,
    price: 12000,
    types: ["pilgrimage"],
    lede: "A measured pilgrimage. Vehicle to Gaurikund, ponies and porters arranged, two nights at altitude, and a turn to Badrinath and Mana.",
    highlights: ["Gaurikund base", "Kedarnath darshan", "Badrinath & Mana", "Sonprayag camp"],
    itinerary: [
      { d: "Day 1", t: "Drive to Sonprayag", desc: "Long drive day, overnight at Sonprayag camp." },
      { d: "Day 2", t: "Gaurikund to Kedarnath", desc: "Vehicle to Gaurikund, ascent (pony/porter optional), overnight near temple." },
      { d: "Day 3", t: "Darshan & descent", desc: "Pre-dawn darshan, descent to Sonprayag by evening." },
      { d: "Day 4", t: "Badrinath & Mana", desc: "Onward to Badrinath darshan and the last Indian village at Mana, then drive back." },
    ],
  },
];

// Add-on experiences we arrange on any trip — borrowed from how the region's
// operators package adventure, but bookable through our own desk.
const EXPERIENCES = [
  { k: "Air", name: "Paragliding", desc: "Tandem flights over Naini Lake — no experience needed, just nerve." },
  { k: "Trail", name: "Trekking", desc: "Tiffin Top, Land's End and the Pangot ridges, at a pace that suits you." },
  { k: "Wild", name: "Jungle Safari", desc: "Jeep safaris into Corbett's Dhikala and Bijrani zones with a naturalist." },
  { k: "Water", name: "Boating", desc: "Paddle and motor boats on Naini, Bhimtal and Sattal lakes." },
  { k: "Night", name: "Camping & BBQ", desc: "Riverside and ridge camps with a self-grilled barbecue evening." },
  { k: "Ride", name: "Ropeway & Cable Car", desc: "The Snow View aerial ropeway and lakeside cable cars." },
  { k: "Wheels", name: "Cycling", desc: "Easy ridge rides around the lake for the restless." },
  { k: "Rush", name: "Zip-lining", desc: "Optional zips strung over the water at Bhimtal." },
];

// The map we actually cover, from the lakes out to the high border villages.
const DESTINATIONS = [
  "Nainital", "Bhimtal", "Sattal", "Kainchi Dham", "Ranikhet", "Almora",
  "Kausani", "Chaukori", "Munsiyari", "Jageshwar", "Patal Bhuvaneshwar",
  "Jim Corbett", "Kedarnath & Badrinath", "Mana Village",
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
  const [activeType, setActiveType] = useState<"all" | TripType>("all");

  const filteredTours =
    activeType === "all" ? TOURS : TOURS.filter((t) => t.types.includes(activeType));

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
              Driving Kumaon since 1998 — couple escapes, family trips, group tours,
              solo retreats and the Char Dham road. Our own vehicles, our own drivers,
              no rushed itineraries.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">Signature Journeys</span>
            <h2>Pick the trip that&apos;s <em>yours</em>.</h2>
            <p>
              Packages we&apos;ve driven ourselves, sorted by who&apos;s travelling.
              Every price below is the final, GST-inclusive fare per person.
            </p>
          </Reveal>

          <Reveal className="filter-bar" delay={0.05}>
            {TRIP_TYPES.map((tt) => (
              <button
                key={tt.key}
                className={`filter-chip ${activeType === tt.key ? "is-active" : ""}`}
                onClick={() => setActiveType(tt.key)}
              >
                {tt.label}
              </button>
            ))}
          </Reveal>

          <div style={{ display: "grid", gap: 28, marginTop: 36 }}>
            {filteredTours.map((t, i) => {
              const open = openId === t.id;
              return (
                <Reveal key={t.id} delay={i * 0.06}>
                  <article className="room-card" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr" }}>
                    <div className="room-card__img" style={{ backgroundImage: `url(${t.img})`, aspectRatio: "auto" }} />
                    <div className="room-card__body">
                      <div className="room-card__label">
                        {t.days} days · {t.types.map((ty) => TYPE_LABEL[ty]).join(" · ")}
                      </div>
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
            <span className="kb-eyebrow">Things To Do</span>
            <h2>Experiences we <em>arrange</em>.</h2>
            <p>
              Add any of these to a package, or build a day around them. We book the
              slots, sort the gear, and put a driver on it.
            </p>
          </Reveal>
          <div className="exp-grid">
            {EXPERIENCES.map((e, i) => (
              <Reveal key={e.name} delay={i * 0.04} as="article" className="exp-item">
                <div className="k">{e.k}</div>
                <h4>{e.name}</h4>
                <p>{e.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">Where We Go</span>
            <h2>The map we <em>know by heart</em>.</h2>
            <p>
              From the lakes around Nainital out to the high border villages — name a
              corner of Kumaon and chances are we&apos;ve parked there.
            </p>
          </Reveal>
          <Reveal className="dest-tags" delay={0.05}>
            {DESTINATIONS.map((d) => (
              <span key={d} className="dest-tag">{d}</span>
            ))}
          </Reveal>
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
