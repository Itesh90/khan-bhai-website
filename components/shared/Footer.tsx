import Link from "next/link";
import Monogram from "@/components/ui/Monogram";
import { BRAND } from "@/lib/design";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="kb-container">
        <div className="foot__top">
          <div className="foot__brand">
            <Monogram />
            <h4>{BRAND.name}</h4>
            <p>
              A heritage hotel, a kitchen of two states, and a travel desk that knows the
              foothills by their first name. Hosted by the Khan family since 1998.
            </p>
          </div>
          <div className="foot__col">
            <h5>The House</h5>
            <ul>
              <li><Link href="/stay">Rooms &amp; Suites</Link></li>
              <li><Link href="/restaurant">The Restaurant</Link></li>
              <li><Link href="/travel">Travel Desk</Link></li>
              <li><Link href="#">Gallery</Link></li>
              <li><Link href="#">Press</Link></li>
            </ul>
          </div>
          <div className="foot__col">
            <h5>Plan</h5>
            <ul>
              <li><Link href="/checkout">Reservations</Link></li>
              <li><Link href="/banquet#inquire">Group Bookings</Link></li>
              <li><Link href="/banquet">Events &amp; Weddings</Link></li>
              <li><Link href="#">Cancellation Policy</Link></li>
              <li><Link href="#">Privacy</Link></li>
            </ul>
          </div>
          <div className="foot__col foot__contact">
            <h5>Find us</h5>
            <div className="row"><b>{BRAND.address.line1}</b></div>
            <div className="row">{BRAND.address.line2}</div>
            <div className="row">{BRAND.address.line3}</div>
            <div className="row" style={{ marginTop: 14 }}><b>{BRAND.phone}</b></div>
            <div className="row">{BRAND.email}</div>
          </div>
        </div>
        <div className="foot__bot">
          <span>© {new Date().getFullYear()} {BRAND.name} · All rights reserved</span>
          <span className="marks">
            <span>Razorpay secure</span>
            <span>Instagram</span>
            <span>Google Reviews</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
