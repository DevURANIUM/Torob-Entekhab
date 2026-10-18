import { ExternalLink, Store, Truck, BadgeCheck } from "lucide-react";
import { liveDetails, liveHistory } from "@/lib/torob/live";
import type { TorobListing } from "@/lib/torob/snapshot";
import type { TorobHistory } from "@/lib/torob/types";
import { number, price } from "@/lib/domain";

function Sparkline({ history }: { history: TorobHistory }) {
  const series = history.series?.find((s) => s.points.length > 1);
  if (!series) return null;
  const pts = series.points.slice(-12);
  const values = pts.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = pts
    .map((p, i) => `${(i / (pts.length - 1)) * 300},${70 - ((p.value - min) / span) * 60}`)
    .join(" ");
  return (
    <figure className="sparkline">
      <figcaption>
        {series.label} در {number(pts.length)} ماه اخیر
      </figcaption>
      <svg viewBox="-4 0 308 80" role="img" aria-label={history.reading ?? series.label}>
        <polyline points={path} fill="none" />
      </svg>
      <p className="muted">
        کمترین {price(min)}، بیشترین {price(max)}
      </p>
    </figure>
  );
}

export async function TorobOffers({ listing }: { listing: TorobListing }) {
  const [details, history] = await Promise.all([liveDetails(listing), liveHistory(listing)]);
  const offers = (details?.offers ?? []).filter((o) => o.available && o.price_toman);
  return (
    <section className="panel offers" aria-labelledby="offers-title">
      <div className="panel__head">
        <h2 id="offers-title">از کجا بخرم؟</h2>
        <a className="btn btn--soft" href={listing.url} target="_blank" rel="noreferrer">
          همه فروشنده‌ها در ترب
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
      {offers.length ? (
        <>
          <p className="muted">
            {number(details?.offer_count ?? offers.length)} فروشنده در ترب؛ این‌ها
            ارزان‌ترین پیشنهادهای موجود هستند. قیمت لحظه‌ای است و پیش از خرید
            شرایط فروشنده و گارانتی را ببین.
          </p>
          <ol className="offer-list">
            {offers.slice(0, 6).map((o, i) => (
              <li key={`${o.shop_name}-${i}`} className={i === 0 ? "is-cheapest" : undefined}>
                <div className="offer-list__shop">
                  <Store size={16} aria-hidden="true" />
                  <strong>{o.shop_name}</strong>
                  {o.shop_city && <span className="muted">{o.shop_city}</span>}
                </div>
                <div className="offer-list__meta">
                  {o.shop_score !== null && (
                    <span title="امتیاز فروشگاه در ترب">
                      <BadgeCheck size={14} aria-hidden="true" />
                      {number(o.shop_score)} از ۵
                    </span>
                  )}
                  {o.free_shipping && (
                    <span>
                      <Truck size={14} aria-hidden="true" />
                      ارسال رایگان
                    </span>
                  )}
                  {o.price_unreliable && <span className="warn">ترب این قیمت را نامطمئن می‌داند</span>}
                </div>
                <div className="offer-list__price">
                  <strong>{price(o.price_toman!)}</strong>
                  {o.url && (
                    <a href={o.url} target="_blank" rel="noreferrer">
                      مشاهده فروشگاه
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="notice">
          فهرست فروشنده‌ها الان از ترب دریافت نشد. کمترین قیمت ثبت‌شده{" "}
          {price(listing.priceToman)} در {number(listing.shops)} فروشگاه بود؛
          برای قیمت امروز صفحه این گوشی را در ترب ببین.
        </p>
      )}
      {history && <Sparkline history={history} />}
    </section>
  );
}

export function OffersSkeleton() {
  return (
    <section className="panel offers" aria-busy="true">
      <h2>از کجا بخرم؟</h2>
      <p className="muted">در حال گرفتن قیمت فروشنده‌ها از ترب…</p>
      <div className="skeleton skeleton--rows" />
    </section>
  );
}
