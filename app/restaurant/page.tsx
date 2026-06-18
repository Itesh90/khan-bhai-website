"use client";

import { useState } from "react";
import Link from "next/link";
import SiteShell from "@/components/shared/SiteShell";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

const CATEGORIES = [
  { key: "all", label: "All Items" },
  { key: "nonveg_mains", label: "Non-Veg Mains" },
  { key: "nonveg_grills", label: "Grill & Fry (Non-Veg)" },
  { key: "veg_mains", label: "Veg Mains" },
  { key: "veg_snacks", label: "Veg Snacks" },
  { key: "soups_rolls", label: "Soups & Rolls" },
  { key: "breads_rice", label: "Breads & Rice" },
  { key: "raitas_sides", label: "Raitas & Sides" },
];

const MENU_SECTIONS = [
  {
    id: "nonveg_mains",
    title: "Nemat - E - Khas",
    em: " (Non-Veg Mains)",
    items: [
      { name: "Chicken Korma", price: "₹260 / ₹520", desc: "Half / Full" },
      { name: "Chicken Bijnori", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Chicken Lababdar", price: "₹280 / ₹560", desc: "Half / Full" },
      { name: "Chicken Hussaini", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Cheese Chicken Duplex", price: "₹350 / ₹700", desc: "Half / Full" },
      { name: "Chicken Shahi Korma", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Chicken Punjabi", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Handi Chicken", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Handi Chicken Boneless", price: "₹320 / ₹640", desc: "Half / Full" },
      { name: "Butter Chicken", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Butter Chicken Boneless", price: "₹320 / ₹640", desc: "Half / Full" },
      { name: "Kadhai Chicken", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Kadhai Chicken Boneless", price: "₹320 / ₹640", desc: "Half / Full" },
      { name: "Butter Chicken Masala", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Butter Chicken Masala Boneless", price: "₹320 / ₹640", desc: "Half / Full" },
      { name: "Chicken Hyderabadi", price: "₹300 / ₹600", desc: "Half / Full" },
      { name: "Mutton Korma", price: "₹390 / ₹780", desc: "Half / Full" },
      { name: "Mutton Masala", price: "₹390 / ₹780", desc: "Half / Full" },
      { name: "Mutton Shahi Korma", price: "₹390 / ₹780", desc: "Half / Full" },
      { name: "Mutton Rogan Josh", price: "₹390 / ₹780", desc: "Half / Full" },
      { name: "Mutton Stue (Stew)", price: "₹390 / ₹780", desc: "Half / Full" },
      { name: "Bhuna Mutton", price: "₹390 / ₹780", desc: "Half / Full" },
      { name: "Egg Curry", price: "₹170 / ₹280", desc: "Half / Full" },
      { name: "Murg Mussallam", price: "₹1,250", desc: "Full house special chicken" },
    ],
  },
  {
    id: "nonveg_grills",
    title: "Grill & Fry",
    em: " (Non-Veg)",
    items: [
      { name: "Chicken Smoke", price: "₹250 / ₹460", desc: "Half / Full" },
      { name: "Mutton Barra", price: "₹350 / ₹650", desc: "Half / Full" },
      { name: "Chicken Roasted Malai", price: "₹330 / ₹550", desc: "Half / Full" },
      { name: "Chicken Afghani Malai", price: "₹350 / ₹600", desc: "Half / Full" },
      { name: "Chicken Tikka Zafrani", price: "₹350 / ₹600", desc: "6 Pcs / Full" },
      { name: "Chicken Fry", price: "₹250 / ₹460", desc: "Half / Full" },
      { name: "Chicken Seekh Kebab Malai", price: "₹170 / ₹290", desc: "Half / Full" },
      { name: "Chicken Barra Dry", price: "₹250 / ₹460", desc: "Half / Full" },
      { name: "Chicken Tikka Malai", price: "₹350 / ₹600", desc: "6 Pcs / Full" },
    ],
  },
  {
    id: "veg_mains",
    title: "Nemat - E - Khas",
    em: " (Veg Mains)",
    items: [
      { name: "Dal Makhni", price: "₹200", desc: "Slow-cooked black lentils" },
      { name: "Punjabi Dal Tadka", price: "₹210", desc: "Yellow lentils tempered with cumin & spices" },
      { name: "Mix Veg", price: "₹210", desc: "Seasonal garden vegetables" },
      { name: "Zeera Aalu", price: "₹170", desc: "Dry potato tempered with cumin seeds" },
      { name: "Shahi Paneer", price: "₹270", desc: "Cottage cheese in rich creamy gravy" },
      { name: "Kadhai Paneer", price: "₹270", desc: "Paneer cooked with bell peppers and ground spices" },
      { name: "Matar Paneer", price: "₹250", desc: "Cottage cheese and green peas curry" },
      { name: "Paneer Butter Masala", price: "₹270", desc: "Cottage cheese in buttery tomato gravy" },
      { name: "Handi Paneer", price: "₹290", desc: "Paneer cooked in a traditional clay pot" },
      { name: "Paneer Lababdar", price: "₹290", desc: "Rich cottage cheese cubes in spiced gravy" },
      { name: "Paneer Hussaini", price: "₹290", desc: "Paneer pockets stuffed and cooked in aromatic sauce" },
    ],
  },
  {
    id: "veg_snacks",
    title: "Snacks & Starters",
    em: " (Veg)",
    items: [
      { name: "Paneer Tikka", price: "₹260", desc: "Tandoori grilled cottage cheese" },
      { name: "Paneer Tikka Achari", price: "₹270", desc: "Tangy pickled paneer tikka" },
      { name: "Paneer Tikka Garlic", price: "₹300", desc: "Garlic flavored cottage cheese skewers" },
      { name: "Paneer Tikka Malai", price: "₹290", desc: "Creamy tandoori paneer skewers" },
      { name: "Paneer Tikka Papdi", price: "₹300", desc: "Crispy coated paneer tikka" },
      { name: "Soya Chaap Tandoori", price: "₹250", desc: "Grilled marinated soya skewers" },
      { name: "Soya Chaap Malai", price: "₹270", desc: "Creamy marinated soya chaap" },
      { name: "Chilly Paneer Dry", price: "₹260", desc: "Stir-fried cottage cheese, chillies, soy" },
      { name: "Chilly Paneer Gravy", price: "₹280", desc: "Cottage cheese in hot chilli sauce" },
      { name: "Honey Chilly Potato", price: "₹200", desc: "Sweet and spicy crispy potato fingers" },
    ],
  },
  {
    id: "soups_rolls",
    title: "Soups, Rolls",
    em: " & Eggs",
    items: [
      { name: "Manchow Soup / Hot & Sour (Veg)", price: "₹100", desc: "Spiced, hot, tangy with fried noodles" },
      { name: "Veg Cream Soup", price: "₹100", desc: "Rich creamy vegetable soup" },
      { name: "Chicken Hot & Sour", price: "₹120", desc: "Spicy & sour chicken soup" },
      { name: "Chicken Clear Soup", price: "₹100", desc: "Light chicken and vegetable broth" },
      { name: "Chicken Manchow Soup", price: "₹140", desc: "Chicken soup topped with crispy noodles" },
      { name: "Masala Omelette", price: "₹70", desc: "Spiced beaten eggs pan fried" },
      { name: "Egg Bhurji", price: "₹80", desc: "Indian-style scrambled eggs" },
      { name: "Chicken Kathi Roll", price: "₹130", desc: "Spiced chicken tikka wrapped in flatbread" },
      { name: "Egg Kathi Roll", price: "₹130", desc: "Scrambled egg wrap with onions & peppers" },
      { name: "Golawati Kebab Roll", price: "₹130", desc: "Soft lamb kebab wrapped in rumali roti" },
      { name: "Shami Kebab Roll", price: "₹130", desc: "Minced chicken patty roll" },
      { name: "Paneer Kathi Roll", price: "₹130", desc: "Spiced paneer cubes wrap" },
      { name: "Veg Burger with Cheese", price: "₹100", desc: "Classic vegetable patty with cheese slice" },
      { name: "Chicken Burger", price: "₹150", desc: "Chicken patty burger" },
    ],
  },
  {
    id: "breads_rice",
    title: "Breads & Chawal",
    em: " ki Mehak",
    items: [
      { name: "Tandoori Roti", price: "₹10", desc: "Whole wheat clay oven bread" },
      { name: "Tandoori Butter Roti", price: "₹15", desc: "Clay oven bread with butter" },
      { name: "Rumali Roti", price: "₹10", desc: "Thin handkerchief bread" },
      { name: "Plain Naan / Butter Naan", price: "₹50 / ₹60", desc: "Leavened refined flour flatbread" },
      { name: "Garlic Naan", price: "₹80", desc: "Garlic infused leavened bread" },
      { name: "Stuffed Naan / Stuffed with Gravy", price: "₹100", desc: "Potato / onion filled flatbread" },
      { name: "Lachcha Paratha", price: "₹60", desc: "Multi-layered whole wheat bread" },
      { name: "Aaloo Paratha / Onion Paratha", price: "₹70", desc: "Spiced flatbread with potato/onion" },
      { name: "Paneer Paratha / Mixed Paratha", price: "₹100", desc: "Stuffed paneer / mixed veg paratha" },
      { name: "Mughlai Paratha", price: "₹35", desc: "Crispy egg stuffed paratha" },
      { name: "Zeera Rice / Steam Rice", price: "₹110 / ₹90", desc: "Cumin tempered rice / Steamed white rice" },
      { name: "Matar Pulao / Pulao Rice", price: "₹150 / ₹130", desc: "Rice cooked with green peas / spiced rice" },
      { name: "Kashmiri Pulao", price: "₹150", desc: "Rice loaded with dry fruits and saffron" },
      { name: "Veg Biryani", price: "₹220", desc: "Rich aromatic dum-cooked veg biryani" },
      { name: "Veg Fried Rice / Schezwan Fried Rice", price: "₹170 / ₹190", desc: "Stir-fried rice with veggies & soy/schezwan sauce" },
    ],
  },
  {
    id: "raitas_sides",
    title: "Pakoras, Raita",
    em: " & Papad",
    items: [
      { name: "Paneer Pakora (8 Pcs)", price: "₹200", desc: "Deep fried paneer fritters" },
      { name: "Mix Veg Pakora (8 Pcs)", price: "₹150", desc: "Crispy vegetable fritters" },
      { name: "Boondi Raita / Plain Raita", price: "₹100 / ₹80", desc: "Gram flour pearls / plain yogurt" },
      { name: "Mix Raita / Pineapple Raita", price: "₹110 / ₹130", desc: "Vegetable mix / sweet pineapple chunks in yogurt" },
      { name: "Curd / Green Salad", price: "₹80", desc: "Plain yogurt / Fresh garden salad" },
      { name: "Roasted Papad / Masala Papad", price: "₹15 / ₹30", desc: "Lentil wafers plain / topped with onions & tomatoes" },
    ],
  },
];

// Signature picks drawn directly from MENU_SECTIONS above — keep names + prices
// in sync if the menu changes. NOT random food: each card maps to a real dish.
const FEATURED_DISHES = [
  { name: "Murg", em: "Mussallam", img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80", veg: "Non-veg · House Special", price: "₹1,250" },
  { name: "Mutton", em: "Rogan Josh", img: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80", veg: "Non-veg · Awadhi", price: "₹390 / ₹780" },
  { name: "Shahi", em: "Paneer", img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", veg: "Veg · Mughlai", price: "₹270" },
  { name: "Veg", em: "Biryani", img: "https://images.unsplash.com/photo-1633945274405-b6c8e4c43c5d?w=600&q=80", veg: "Veg · Awadhi", price: "₹220" },
];

// Real photographs of the restaurant from /public/images/restaurant — shown as a
// uniform, aligned grid so guests can see the actual space (indoors first, then
// the patio). heritage-wall.jpg is used in the Hours section below.
const AMBIANCE = [
  { img: "/images/restaurant/dining-overview.jpg", label: "The Main Hall" },
  { img: "/images/restaurant/dining-hall-1.jpg", label: "Dining Room" },
  { img: "/images/restaurant/dining-hall-2.jpg", label: "Evening Service" },
  { img: "/images/restaurant/booth-seating.jpg", label: "Booth Seating" },
  { img: "/images/restaurant/private-nook-1.jpg", label: "Private Nook" },
  { img: "/images/restaurant/private-nook-2.jpg", label: "Corner Table" },
  { img: "/images/restaurant/patio-pergola.jpg", label: "The Pergola Patio" },
  { img: "/images/restaurant/patio-vine.jpg", label: "Vine Courtyard" },
  { img: "/images/restaurant/patio-lounge.jpg", label: "Patio Lounge" },
];

export default function RestaurantPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredSections = MENU_SECTIONS.filter((sec) => {
    if (activeCategory === "all") return true;
    return sec.id === activeCategory;
  });

  return (
    <SiteShell>
      <section className="page-hero kb-grain">
        <div
          className="page-hero__bg"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(10,10,10,0.74) 0%, rgba(20,16,10,0.88) 100%), url(/images/restaurant/dining-wide.jpg)",
          }}
        />
        <div className="kb-container" style={{ position: "relative", zIndex: 1 }}>
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
              <Link href="/checkout?id=restaurant">
                <Button variant="primary" showArrow>Reserve a Table</Button>
              </Link>
              <a href="https://wa.me/919012922233" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost">WhatsApp the Chef</Button>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Ambiance gallery — how the restaurant actually looks */}
      <section className="sect" style={{ paddingBottom: 0 }}>
        <div className="kb-container">
          <Reveal className="sect__head">
            <span className="kb-eyebrow">The Room</span>
            <h2 style={{ marginTop: 14 }}>Inside <em>the dining room</em>.</h2>
            <p>
              From the heritage hall to the vine-shaded patio — the rooms where Awadhi and
              Kumaoni plates are served, evening after evening.
            </p>
          </Reveal>
          <div className="gallery-grid">
            {AMBIANCE.map((g, i) => (
              <Reveal key={g.img} delay={i * 0.04} as="article" className="gallery-tile">
                <div
                  className="gallery-tile__img"
                  style={{ backgroundImage: `url(${g.img})` }}
                />
                <div className="gallery-tile__cap">{g.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Sections with Filter */}
      <section className="sect">
        <div className="kb-container">
          <Reveal className="filter-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`filter-chip ${activeCategory === cat.key ? "is-active" : ""}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </Reveal>

          <div style={{ marginTop: 40 }}>
            {filteredSections.map((sec, i) => (
              <Reveal key={sec.id} delay={i * 0.05} className="menu-section">
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
                style={{ backgroundImage: "url(/images/restaurant/heritage-wall.jpg)" }}
              />
              <div className="why__media-cap">
                <div className="num">80+</div>
                <div className="lab">Plates on the menu</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Featured menu dishes */}
      <section className="sect dishes" style={{ paddingTop: 0 }}>
        <div className="kb-container">
          <Reveal className="sect__head">
            <span className="kb-eyebrow">From the pass</span>
            <h2 style={{ marginTop: 14 }}>Signatures from <em>our menu</em>.</h2>
            <p>Four picks from the list above — the ones our regulars order first.</p>
          </Reveal>
          <div className="dishes__grid">
            {FEATURED_DISHES.map((d) => (
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
    </SiteShell>
  );
}
