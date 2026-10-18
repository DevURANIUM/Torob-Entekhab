import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ExternalLink, TriangleAlert } from "lucide-react";
import { getProducts } from "@/lib/db";
import { readIntent, encodeIntent } from "@/lib/state";
import { score, rank, explain, tradeoffs } from "@/lib/search/ranking";
import { keys, labels, number, price, year } from "@/lib/domain";
import { PhoneImage } from "@/components/ui/phone-image";
import { ScorePanel } from "@/components/search/score-panel";
import { Specifications } from "@/components/product/specifications";
import { SelectProduct } from "@/components/product/select-product";
import { OffersSkeleton, TorobOffers } from "@/components/product/torob-offers";

export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(iso));

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const [{ slug }, p, products] = await Promise.all([params, searchParams, getProducts()]);
  const product = products.find((x) => x.slug === slug);
  if (!product) notFound();
  const intent = readIntent(p.state);
  const item = score(product, intent);
  const ranked = rank(products, intent);
  const best = ranked[0];
  const cheaper = ranked.find(
    (x) => x.product.price < product.price && x.product.model !== product.model,
  );
  const higher = rank(products, { ...intent, budget: { max: product.price * 1.3 } }).find(
    (x) => x.product.price > product.price && x.product.model !== product.model,
  );
  const state = encodeIntent(intent);
  const goodAt = keys.filter((k) => product.scores[k] >= 85).map((k) => labels[k]);
  const weakAt = keys.filter((k) => product.scores[k] < 75).map((k) => labels[k]);
  const variants = products.filter((x) => x.variant.modelId === product.variant.modelId);

  return (
    <div className="detail wrap">
      <Link className="back-link" href={`/search?state=${state}&q=${encodeURIComponent(intent.query)}`}>
        <ArrowRight size={16} aria-hidden="true" />
        بازگشت به پیشنهادها
      </Link>

      <section className="detail-hero">
        <div className="detail-hero__media">
          <PhoneImage model={product.modelData} name={product.displayName} size="lg" />
        </div>
        <div className="detail-hero__info">
          <p className="eyebrow">یک انتخاب، با همه تفاوت‌ها</p>
          <p className="product-brand">{product.brand}</p>
          <h1 dir="ltr">{product.model}</h1>
          <p className="detail-hero__config">
            {number(product.storage)} گیگابایت · {number(product.ram)} گیگابایت رم
            {product.releaseYear ? ` · ${year(product.releaseYear)}` : ""}
          </p>
          <div className="price-block">
            <strong>{price(product.price)}</strong>
            <span className="muted">
              {product.torob
                ? `کمترین قیمت در ${number(product.torob.shops)} فروشگاه ترب، ${day(product.priceSnapshot.observedAt)}`
                : product.available
                  ? `قیمت نمونه برای دمو، ${day(product.priceSnapshot.observedAt)}`
                  : "نسخه نوی این مدل الان در ترب پیدا نشد؛ قیمت نمونه است."}
            </span>
          </div>
          <div className="detail-hero__score">
            <strong>{number(item.total)}</strong>
            <span>
              امتیاز برای نیاز تو
              <small>از ۱۰۰</small>
            </span>
          </div>
          <div className="detail-hero__actions">
            {product.torob && (
              <a className="btn btn--primary btn--lg" href={product.torob.url} target="_blank" rel="noreferrer">
                خرید از ترب
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            )}
            <SelectProduct id={product.id} />
          </div>
          <div className="variant-block">
            <h2>نسخه‌های موجود در کاتالوگ</h2>
            <div className="variant-options">
              {variants.map((x) => (
                <Link
                  key={x.id}
                  aria-current={x.id === product.id ? "page" : undefined}
                  className={x.available ? undefined : "is-unavailable"}
                  href={`/product/${x.slug}?state=${state}`}
                >
                  <span>
                    {x.ram ? `${number(x.ram)}/` : ""}
                    {number(x.storage)} گیگ
                  </span>
                  <small>{x.available ? price(x.price) : "ناموجود در ترب"}</small>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {product.torob && (
        <Suspense fallback={<OffersSkeleton />}>
          <TorobOffers listing={product.torob} />
        </Suspense>
      )}

      <div className="detail-columns">
        <section className="panel">
          <h2>چرا این گوشی؟</h2>
          <ul className="reasons">
            {explain(item).map((x) => (
              <li key={x}>
                <Check size={15} aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
          <h3>با انتخاب این، از چی می‌گذری؟</h3>
          <ul className="reasons reasons--warn">
            {[...new Set([...product.cons, ...tradeoffs(item, ranked)])].map((x) => (
              <li key={x}>
                <TriangleAlert size={15} aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
          <dl className="fit-list">
            <div>
              <dt>مناسب‌تر برای</dt>
              <dd>{goodAt.join("، ") || "استفاده معمول روزانه"}</dd>
            </div>
            <div>
              <dt>کمتر مناسب برای</dt>
              <dd>{weakAt.join("، ") || "ضعف برجسته‌ای در امتیازها ثبت نشده"}</dd>
            </div>
          </dl>
          {best && best.product.id !== product.id && (
            <p className="notice">
              پیشنهاد اول برای نیاز تو <bdi dir="ltr">{best.product.displayName}</bdi> با
              امتیاز {number(best.total)} است؛ این گوشی {number(Math.abs(item.total - best.total))}{" "}
              امتیاز {item.total >= best.total ? "بیشتر" : "کمتر"} دارد.
            </p>
          )}
        </section>
        <section className="panel">
          <h2>امتیازها، با وزن نیاز تو</h2>
          <ScorePanel item={item} />
        </section>
      </div>

      <Specifications product={product} />

      <div className="detail-columns">
        {(
          [
            [cheaper, "جایگزین ارزان‌تر"],
            [higher, "با کمی هزینه بیشتر"],
          ] as const
        ).map(([rec, title]) => (
          <section className="panel related" key={title}>
            <h3>{title}</h3>
            {rec ? (
              <Link href={`/product/${rec.product.slug}?state=${state}`} className="related__link">
                <PhoneImage model={rec.product.modelData} name={rec.product.displayName} size="sm" />
                <span>
                  <bdi dir="ltr">{rec.product.displayName}</bdi>
                  <small>{price(rec.product.price)}</small>
                </span>
              </Link>
            ) : (
              <p className="muted">گزینه‌ای با شرط‌های فعلی پیدا نشد.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
