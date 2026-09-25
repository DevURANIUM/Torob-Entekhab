import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/db";
import { readIntent, encodeIntent } from "@/lib/state";
import { score, rank, explain, tradeoffs } from "@/lib/search/ranking";
import { keys, labels, number, price } from "@/lib/domain";
import { PhoneArt } from "@/components/phone-art";
import { ScorePanel } from "@/components/score-panel";
import { Specifications } from "@/components/specifications";
import { SelectProduct } from "@/components/select-product";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const [{ slug }, p, products] = await Promise.all([
    params,
    searchParams,
    getProducts(),
  ]);
  const product = products.find((x) => x.slug === slug);
  if (!product) notFound();
  const intent = readIntent(p.state);
  const item = score(product, intent);
  const ranked = rank(products, intent);
  const best = ranked[0];
  const cheaper = ranked.find(
    (x) => x.product.price < product.price && x.product.model !== product.model,
  );
  const higher = rank(products, {
    ...intent,
    budget: { max: product.price * 1.3 },
  }).find(
    (x) => x.product.price > product.price && x.product.model !== product.model,
  );
  const state = encodeIntent(intent);
  return (
    <div className="wrap detail-page">
      <Link
        href={`/search?state=${state}&q=${encodeURIComponent(intent.query)}`}
      >
        ← بازگشت به پیشنهادها
      </Link>
      <section className="detail-hero panel">
        <PhoneArt brand={product.brand} image={product.modelData.image} />
        <div>
          <div className="eyebrow">یک انتخاب، با همه تفاوت‌ها</div>
          <h1 dir="ltr">{product.displayName}</h1>
          <p>
            {number(product.storage)} گیگابایت · {number(product.ram)} گیگابایت
            رم
          </p>
          <h2>{price(product.price)}</h2><p className="muted">قیمت نمونه برای دمو · {product.priceSnapshot.observedAt.slice(0,10)}</p>
          <p>امتیاز برای نیاز تو: {number(item.total)} از ۱۰۰</p>
          <SelectProduct id={product.id} />
        </div>
      </section>
      <div className="detail-columns">
        <section className="panel">
          <h2>چرا این گوشی؟</h2>
          {explain(item).map((x) => (
            <p key={x}>✓ {x}</p>
          ))}
          <h3>با انتخاب این، از چی می‌گذری؟</h3>
          {[...product.cons, ...tradeoffs(item, ranked)].map((x) => (
            <p key={x}>△ {x}</p>
          ))}
          <h3>مناسب‌تر برای</h3>
          <p>
            {keys
              .filter((k) => product.scores[k] >= 85)
              .map((k) => labels[k])
              .join("، ") || "استفاده معمول روزانه"}
          </p>
          <h3>کمتر مناسب برای</h3>
          <p>
            {keys
              .filter((k) => product.scores[k] < 75)
              .map((k) => labels[k])
              .join("، ") || "ضعف برجسته‌ای در امتیازهای نمونه ثبت نشده"}
          </p>
          {best && (
            <>
              <h3>در مقایسه با پیشنهاد اول</h3>
              <p>
                <bdi>{best.product.displayName}</bdi> امتیاز{" "}
                {number(best.total)} دارد؛ اختلاف این گوشی{" "}
                {number(item.total - best.total)} امتیاز است.
              </p>
            </>
          )}
        </section>
        <section className="panel">
          <h2>امتیازها، با وزن نیاز تو</h2>
          <ScorePanel item={item} />
        </section>
      </div>
      <section className="panel"><h2>نسخه‌های موجود در کاتالوگ</h2><div className="variant-options">{products.filter(x=>x.variant.modelId===product.variant.modelId).map(x=><Link key={x.id} aria-current={x.id===product.id?'page':undefined} href={`/product/${x.slug}?state=${state}`}>{number(x.ram)} / {number(x.storage)} · {price(x.price)}</Link>)}</div><p className="muted">این‌ها پیکربندی مستندند؛ موجودی فروشگاه یا رجیستری تضمین نشده.</p></section>
      <Specifications product={product}/>
      <div className="detail-columns">
        {[
          [cheaper, "جایگزین ارزان‌تر"],
          [higher, "با کمی هزینه بیشتر"],
        ].map(([r, title]) => {
          const rec = r as typeof cheaper;
          return (
            <section className="panel" key={title as string}>
              <h3>{title as string}</h3>
              {rec ? (
                <Link href={`/product/${rec.product.slug}?state=${state}`}>
                  <bdi>{rec.product.displayName}</bdi>
                  <p>{price(rec.product.price)}</p>
                </Link>
              ) : (
                <p>گزینه‌ای با شرط‌های فعلی پیدا نشد.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
