import { BRAND } from "@/lib/design";

export default function PromoBar() {
  return (
    <div className="promo">
      <div className="kb-container">
        <div className="promo__inner">
          <span>
            <b>{BRAND.phone}</b> &nbsp; · &nbsp; Reservations open daily, 8 AM – 11 PM
          </span>
          <span className="sep" aria-hidden />
          <span>Golapar, Haldwani &nbsp; · &nbsp; Uttarakhand</span>
        </div>
      </div>
    </div>
  );
}
