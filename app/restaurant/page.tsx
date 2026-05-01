import Link from "next/link";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

const MENU = [
  {
    title: "Awadhi Kebabs",
    em: " & Tandoor",
    items: [
      { name: "Galouti Kebab", desc: "Slow-cooked minced lamb on saffron paratha", price: "₹420" },
      { name: "Kakori Kebab", desc: "Mughal-era smoked skewers, fennel and rose", price: "₹460" },
      { name: "Tandoori Murg", desc: "Charcoal-roasted half chicken, hung-curd marinade", price: "₹380" },
      { name: "Bharwa Aloo", desc: "Stuffed potato, fennel-pomegranate, vegetarian", price: "₹260" },
    ],
  },
  {
    title: "Kumaoni",
    em: " Mountain Kitchen",
    items: [
      { name: "Bhatt ki Churkani", desc: "Black soybean curry, jakhya tadka", price: "₹260" },
      { name: "Aloo ke Gutke", desc: "Hill-style potatoes, cumin, chillies, lemon", price: "₹220" },
      { name: "Madua Roti", desc: "Hand-pressed finger-millet bread, ghee", price: "₹80" },
      { name: "Kafuli", desc: "Spinach-fenugreek slow stew, cornflour finish", price: "₹240" },
    ],
  },
  {
    title: "Biryani",
    em: " & Rice",
    items: [
      { name: "Lucknowi Dum Biryani", desc: "Sealed pot, basmati, mutton or chicken", price: "₹480" },
      { name: "Vegetable Tehri", desc: "One-pot rice with hill vegetables", price: "₹320" },
      { name: "Yakhni Pulao", desc: "Bone-broth rice, toasted whole spices", price: "₹420" },
      { name: "Steamed Basmati", desc: "Plain, perfect", price: "₹120" },
    ],
  },
];

const GALLERY = [
  "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80",
  "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80",
  "https://images.unsplash.com/photo-1633945274405-b6c8e4c43c5d?w=600&q=80",
  "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80",
];

export default function RestaurantPage() {
  return (
    <SiteShell>
      <section className="page-hero kb-grain">
        <div className="kb-container">
          <Reveal>
            <span className="kb-eyebrow">The Kitchen</span>
            <h1>Two states, <em>one fire</em>.</h1>
            <p>
              Awadhi slow-cooking and Kumaoni mountain food, served from the same wood
              tandoor since 1998. Lunch noon to four. Dinner seven to eleven.
            </p>
          </Reveal>
          <Reveal className="mt-8" delay={0.1}>
            <div className="cta-band__ctas" style={{ marginTop: 36 }}>
              <Link href="/checkout?type=table">
                <Button variant="primary" showArrow>Reserve a Table</Button>
              </Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost">WhatsApp the Chef</Button>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sect">
        <div className="kb-container">
          {MENU.map((sec, i) => (
            <Reveal key={sec.title} delay={i * 0.1} className="menu-section">
              <h3>{sec.title}<em>{sec.em}</em></h3>
              <div className="menu-grid">
                {sec.items.map((item) => (
                  <div key={item.name} className="menu-item">
                    <div style={{ flex: 1 }}>
                      <div className="menu-item__name">{item.name}</div>
                      <div className="menu-item__desc">{item.desc}</div>
                    </div>
                    <span className="menu-item__price">{item.price}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Hours */}
      <section className="sect" style={{ paddingTop: 0 }}>
        <div className="kb-container">
          <div className="why__grid">
            <Reveal className="why__copy">
              <span className="kb-eyebrow">Hours of Operation</span>
              <h2 style={{ marginTop: 14 }}>When the <em>tandoor</em> is hot.</h2>
              <p className="lede">
                We open the kitchen seven days a week. Reservations recommended for
                Friday and Saturday evenings.
              </p>
              <div className="why__list">
                <div className="why__item">
                  <div className="num">i.</div>
                  <h4>Breakfast</h4>
                  <p>8:00 — 10:30 · in-house guests</p>
                </div>
                <div className="why__item">
                  <div className="num">ii.</div>
                  <h4>Lunch</h4>
                  <p>12:00 — 16:00 · all welcome</p>
                </div>
                <div className="why__item">
                  <div className="num">iii.</div>
                  <h4>Dinner</h4>
                  <p>19:00 — 23:00 · last orders 22:30</p>
                </div>
                <div className="why__item">
                  <div className="num">iv.</div>
                  <h4>Reservations</h4>
                  <p>WhatsApp · +91 98765 43210</p>
                </div>
              </div>
            </Reveal>
            <Reveal className="why__media" delay={0.1}>
              <div
                className="why__media-img"
                style={{ backgroundImage: "url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80)" }}
              />
              <div className="why__media-cap">
                <div className="num">80+</div>
                <div className="lab">Plates on the menu</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="sect dishes" style={{ paddingTop: 0 }}>
        <div className="kb-container">
          <Reveal className="sect__head">
            <span className="kb-eyebrow">From the pass</span>
            <h2 style={{ marginTop: 14 }}>A few from <em>the kitchen</em>.</h2>
          </Reveal>
          <div className="dishes__grid">
            {GALLERY.map((src, i) => (
              <article key={i} className="dish">
                <div className="dish__img" style={{ backgroundImage: `url(${src})` }} />
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
