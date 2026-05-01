"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Monogram from "@/components/ui/Monogram";
import Button from "@/components/ui/Button";
import { NAV_LINKS, BRAND } from "@/lib/design";

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="kb-container">
        <div className="nav__inner">
          <Link className="nav__brand" href="/">
            <Monogram />
            <span className="nav__brand-text">
              <span className="name">{BRAND.name}</span>
              <span className="sub">{BRAND.tagline}</span>
            </span>
          </Link>
          <div className="nav__links">
            {NAV_LINKS.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              return (
                <Link key={l.href} href={l.href} className={active ? "is-active" : ""}>
                  {l.label}
                </Link>
              );
            })}
          </div>
          <div className="nav__cta">
            <span className="nav__phone">
              Reserve · <b>{BRAND.phone}</b>
            </span>
            <Link href="/checkout">
              <Button variant="primary" showArrow>
                Book Now
              </Button>
            </Link>
            <button
              type="button"
              className="nav__hamb"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="kb-mobile-nav"
              onClick={() => setMobileOpen((v) => !v)}
            />
          </div>
        </div>
        <div id="kb-mobile-nav" className={`nav__mobile ${mobileOpen ? "is-open" : ""}`}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/checkout" onClick={() => setMobileOpen(false)}>
            Book Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
