import Link from "next/link";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Ornament from "@/components/ui/Ornament";

const PILLARS = [
  {
    num: "No. 01",
    img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
    name: "Stay",
    lede:
      "Twenty-eight rooms across four categories — each finished in walnut, brass and hand-loomed Kumaoni textiles.",
    list: [
      ["Standard", "₹1,200"],
      ["Deluxe", "₹2,000"],
      ["Premium Suite", "₹3,500"],
    ] as [string, string][],
    cta: "Browse Rooms",
    href: "/stay",
  },
  {
    num: "No. 02",
    img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
    name: "Kitchen",
    lede:
      "Awadhi slow-cooking and Kumaoni mountain kitchen. Tandoor breads from a clay oven seasoned by three decades of fire.",
    list: [
      ["Lunch", "12 – 4"],
      ["Dinner", "7 – 11"],
      ["Reservations", "WhatsApp"],
    ] as [string, string][],
    cta: "View the Menu",
    href: "/restaurant",
  },
  {
    num: "No. 03",
    img: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80",
    name: "Journey",
    lede:
      "Curated routes through Nainital, Jim Corbett, Bhimtal and Kedarnath — private vehicles, vetted guides, considered hotels.",
    list: [
      ["Nainital · 2D", "₹4,500"],
      ["Corbett · 3D", "₹8,000"],
      ["Kedarnath · 4D", "₹12,000"],
    ] as [string, string][],
    cta: "See Tours",
    href: "/travel",
  },
];

const DISHES = [
  { name: "Galouti", em: "Kebab", img: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80", veg: "Non-veg · Awadhi", price: "₹420" },
  { name: "Bhatt ki", em: "Churkani", img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80", veg: "Veg · Kumaoni", price: "₹260" },
  { name: "Dum", em: "Biryani", img: "https://images.unsplash.com/photo-1633945274405-b6c8e4c43c5d?w=600&q=80", veg: "Non-veg · Awadhi", price: "₹480" },
  { name: "Aloo ke", em: "Gutke", img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", veg: "Veg · Kumaoni", price: "₹220" },
];

const DESTS = [
  {
    href: "/travel?id=nainital",
    title: "Nainital & Bhimtal",
    meta: "3 days · from ₹6,500",
    img: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80",
  },
  {
    href: "/travel?id=corbett",
    title: "Jim Corbett",
    meta: "3 days · from ₹8,000",
    img: "https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=900&q=80",
  },
  {
    href: "/travel?id=kedarnath",
    title: "Kedarnath Yatra",
    meta: "4 days · from ₹12,000",
    img: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=900&q=80",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "The kind of place where the staff remembers your tea by the second morning. We came for one night and stayed four.",
    name: "Anjali Mehrotra",
    place: "Delhi · stayed Mar 2026",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
  },
  {
    quote:
      "The Corbett trip was organised down to the last spice in the packed lunch. Our driver Kishan-ji has been doing this twenty years and it shows.",
    name: "Rohan & Priya Iyer",
    place: "Bengaluru · travelled Feb 2026",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
  },
  {
    quote:
      "The galouti is what you'd write home about. The walnut suite is what you'd come back for. The price is what you'd recommend.",
    name: "Faisal Khan",
    place: "Lucknow · dined Apr 2026",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80",
  },
];

export default function HomePage() {
  return (
    <SiteShell>
      {/* HERO */}
      <section className="hero kb-grain">
        <div className="hero__bg">
          <div className="arches">
            <svg viewBox="0 0 1440 720" preserveAspectRatio="xMidYMax slice" aria-hidden>
              <defs>
                <linearGradient id="archStroke" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g fill="none" stroke="url(#archStroke)" strokeWidth="0.8">
                <path d="M120 720 V 360 Q 220 220 320 360 V 720 Z" />
                <path d="M360 720 V 320 Q 480 160 600 320 V 720 Z" />
                <path d="M640 720 V 280 Q 780 100 920 280 V 720 Z" />
                <path d="M960 720 V 320 Q 1080 160 1200 320 V 720 Z" />
                <path d="M1240 720 V 360 Q 1320 240 1400 360 V 720 Z" />
              </g>
            </svg>
          </div>
        </div>
        <div className="hero__corner tl" />
        <div className="hero__corner tr" />
        <div className="hero__corner bl" />
        <div className="hero__corner br" />
        <div className="hero__ph-tag">Khan Bhai S. · Est. 1998</div>
        <div className="hero__cue" aria-hidden>
          <span>Scroll</span>
          <span className="vbar" />
        </div>

        <div className="kb-container">
          <div className="hero__inner">
            <Reveal className="hero__eyebrow-wrap">
              <span className="line" />
              <span className="hero__eyebrow">Est. 1998 · Golapar, Haldwani</span>
            </Reveal>
            <Reveal>
              <h1 className="hero__title">
                A House of <em>hospitality</em>, in the foothills.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="hero__sub">
                Three traditions under one roof — a heritage hotel of restful rooms, a
                kitchen where Awadhi recipes meet the Kumaoni hills, and a travel desk
                that quietly arranges your days through Nainital, Corbett and beyond.
              </p>
            </Reveal>
            <Reveal delay={0.2} className="hero__ctas">
              <Link href="/checkout">
                <Button variant="primary" showArrow>Reserve a Stay</Button>
              </Link>
              <Link href="/restaurant">
                <Button variant="ghost">Explore the House</Button>
              </Link>
            </Reveal>
            <Reveal delay={0.3} className="hero__sig">
              <span className="stars">
                {Array.from({ length: 5 }).map((_, i) => <span key={i} />)}
              </span>
              <span>4.8 · 1,200+ guests</span>
              <span className="vline" />
              <span>Featured in <i>Outlook Traveller</i></span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* BOOKING STRIP */}
      <section className="book-strip" aria-label="Quick availability check">
        <div className="kb-container">
          <div className="book-strip__inner">
            <div className="bs-cell">
              <label>Looking for</label>
              <div className="val">Stay <small>Rooms · Suites</small></div>
            </div>
            <div className="bs-cell">
              <label>Check in</label>
              <div className="val">12 May <small>Tue · 2 PM</small></div>
            </div>
            <div className="bs-cell">
              <label>Check out</label>
              <div className="val">15 May <small>Fri · 11 AM</small></div>
            </div>
            <div className="bs-cell">
              <label>Guests</label>
              <div className="val">2 Adults <small>1 Room</small></div>
            </div>
            <div className="bs-cell">
              <label>Promo code</label>
              <div className="val" style={{ color: "var(--kb-text-muted)" }}>Optional</div>
            </div>
            <div className="book-strip__cta">
              <Link href="/checkout">
                <Button variant="primary" showArrow>Check Availability</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="sect pillars-band">
        <div className="kb-container">
          <Reveal className="sect__head">
            <div className="ornament"><Ornament /></div>
            <span className="kb-eyebrow">Our three houses</span>
            <h2 style={{ marginTop: 14 }}>One address, <em>three traditions</em>.</h2>
            <p>Stay, dine, and travel. Each is its own discipline, each held to the same standard of quiet hospitality.</p>
          </Reveal>
        </div>
        <div className="kb-container" style={{ padding: 0 }}>
          <div className="pillars">
            {PILLARS.map((p) => (
              <article key={p.num} className="pillar">
                <div className="pillar__num">{p.num}</div>
                <div className="pillar__img" style={{ backgroundImage: `url(${p.img})` }} />
                <h3 className="pillar__name">The <em>{p.name}</em></h3>
                <p className="pillar__lede">{p.lede}</p>
                <ul className="pillar__list">
                  {p.list.map(([label, val]) => (
                    <li key={label}><span>{label}</span><b>{val}</b></li>
                  ))}
                </ul>
                <Link className="pillar__cta" href={p.href}>
                  {p.cta}{" "}
                  <span style={{ fontFamily: "var(--kb-serif)", fontStyle: "italic" }}>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="sect why">
        <div className="kb-container">
          <div className="why__grid">
            <Reveal className="why__media">
              <div className="why__media-img" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=900&q=80)" }} />
              <div className="why__media-cap">
                <div className="num">28</div>
                <div className="lab">Years of hosting</div>
              </div>
            </Reveal>
            <Reveal className="why__copy" delay={0.1}>
              <span className="kb-eyebrow">A house, not a hotel</span>
              <h2 style={{ marginTop: 14 }}>Hospitality, kept by <em>one family</em>.</h2>
              <p className="lede">
                Khan Bhai S. has been opened, swept, and shut by the same family since 1998. We don&apos;t run a chain. We run a house — one with rooms enough to share — and we&apos;d rather you remember the chai than the lobby.
              </p>
              <div className="why__list">
                <div className="why__item">
                  <div className="num">i.</div>
                  <h4>Tehsil to terrace</h4>
                  <p>Vegetables and dairy arrive each morning from farms within a 12 km radius of the kitchen.</p>
                </div>
                <div className="why__item">
                  <div className="num">ii.</div>
                  <h4>Routes we know</h4>
                  <p>Our travel desk only sells journeys our own family has taken. No outsourced mystery itineraries.</p>
                </div>
                <div className="why__item">
                  <div className="num">iii.</div>
                  <h4>Honest pricing</h4>
                  <p>One rate, all year. No &quot;peak season&quot; surprises. GST shown clearly at checkout.</p>
                </div>
                <div className="why__item">
                  <div className="num">iv.</div>
                  <h4>Always reachable</h4>
                  <p>A real human on WhatsApp from 8 AM to 11 PM, every day of the year.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* DISHES */}
      <section className="sect dishes" style={{ paddingTop: 0 }}>
        <div className="kb-container">
          <Reveal className="sect__head">
            <span className="kb-eyebrow">From the kitchen</span>
            <h2 style={{ marginTop: 14 }}>Five dishes worth <em>the drive</em>.</h2>
            <p>A short list of what our regulars come back for. The full menu — eighty-some plates strong — lives on the restaurant page.</p>
          </Reveal>
          <div className="dishes__grid">
            {DISHES.map((d) => (
              <article key={d.name + d.em} className="dish">
                <div className="dish__img" style={{ backgroundImage: `url(${d.img})` }} />
                <div className="dish__cap">
                  <div className="name">{d.name} <em>{d.em}</em></div>
                  <div className="meta">
                    <span className="veg">{d.veg}</span>
                    <span className="price">{d.price}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE SPOTLIGHT — Walnut Suite */}
      <section className="sect feature" style={{ paddingTop: 0 }}>
        <div className="kb-container">
          <Reveal className="sect__head" >
            <span className="kb-eyebrow">This season&apos;s invitation</span>
            <h2 style={{ marginTop: 14 }}>The <em>Walnut Suite</em></h2>
          </Reveal>
          <Reveal>
            <div className="feature__grid">
              <div
                className="feature__media"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80)",
                }}
              />
              <div className="feature__copy">
                <span className="label">Suite · 02 of 04</span>
                <h3>Walnut, brass <em>&amp; first light.</em></h3>
                <p>
                  Our largest suite — a sitting room, a four-poster bed in unfinished
                  walnut, and a private balcony that catches sunrise over the Shivalik
                  foothills. Hand-loomed throws from Almora; books, never a TV.
                </p>
                <div className="feature__price">
                  <span className="from">From</span>
                  <span className="num">₹3,500</span>
                  <span className="unit">/ night · taxes incl.</span>
                </div>
                <div className="feature__ctas">
                  <Link href="/checkout?type=room&id=premium">
                    <Button variant="primary" showArrow>Reserve Suite</Button>
                  </Link>
                  <Link href="/stay">
                    <Button variant="ghost">All Rooms</Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DESTINATIONS */}
      <section className="sect dests" style={{ paddingTop: 0 }}>
        <div className="kb-container">
          <Reveal className="sect__head" >
            <span className="kb-eyebrow">The travel desk</span>
            <h2 style={{ marginTop: 14 }}>Routes through the <em>foothills</em>.</h2>
            <p>
              Every package built around our own family&apos;s travel notes. Private
              vehicles, vetted homestays, no rushed itineraries.
            </p>
          </Reveal>
          <Reveal>
            <div className="dests__grid">
              {DESTS.map((d) => (
                <Link key={d.title} className="dest" href={d.href}>
                  <div className="dest__img" style={{ backgroundImage: `url(${d.img})` }} />
                  <div className="dest__cap">
                    <div>
                      <h4>{d.title}</h4>
                      <div className="meta">{d.meta}</div>
                    </div>
                    <span className="arrow" aria-hidden>
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1}>
                        <path d="M2 6h8M6 2l4 4-4 4" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="sect guest">
        <div className="kb-container">
          <Reveal className="sect__head">
            <span className="kb-eyebrow">In their own words</span>
            <h2 style={{ marginTop: 14 }}>Letters from our <em>guests</em>.</h2>
          </Reveal>
          <div className="guest__grid">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1} className="guest__card">
                <div className="stars">
                  {Array.from({ length: 5 }).map((_, j) => <span key={j} />)}
                </div>
                <blockquote>{t.quote}</blockquote>
                <div className="guest__author">
                  <div className="avatar" style={{ backgroundImage: `url(${t.avatar})` }} />
                  <div>
                    <div className="name">{t.name}</div>
                    <div className="place">{t.place}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-band kb-grain">
        <div className="cta-band__decor" />
        <div className="kb-container">
          <div className="cta-band__inner">
            <div className="ornament" style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <Ornament />
            </div>
            <span className="kb-eyebrow">Ready when you are</span>
            <h2 style={{ marginTop: 18 }}>A room kept warm, <em>your seat at the table</em>.</h2>
            <p>Reserve in under two minutes. Secure payment by Razorpay. Confirmation by email and WhatsApp, both within the hour.</p>
            <div className="cta-band__ctas">
              <Link href="/checkout"><Button variant="primary" showArrow>Reserve Now</Button></Link>
              <Link href="/restaurant"><Button variant="ghost">Speak to Concierge</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
