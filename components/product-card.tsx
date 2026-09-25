"use client";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  TriangleAlert,
  Battery,
  Monitor,
  Layers,
} from "lucide-react";
import { Ranked, explain, tradeoffs } from "@/lib/search/ranking";
import { price, number, keys, labels } from "@/lib/domain";
import { PhoneArt } from "./phone-art";
import { track } from "@/lib/analytics";
export function ProductCard({
  item,
  index,
  all,
  selected,
  toggle,
  onWhy,
  state,
}: {
  item: Ranked;
  index: number;
  all: Ranked[];
  selected: boolean;
  toggle: () => void;
  onWhy: () => void;
  state: string;
}) {
  const p = item.product;
  const trade = tradeoffs(item, all);
  const advantage = [...keys].sort(
    (a, b) =>
      p.scores[b] -
      all[0].product.scores[b] -
      (p.scores[a] - all[0].product.scores[a]),
  )[0];
  const role =
    index === 0
      ? "بهترین انتخاب برای تو"
      : index === 1 && p.scores.value > all[0].product.scores.value
        ? "ارزش خرید بیشتر"
        : p.scores[advantage] > all[0].product.scores[advantage]
          ? `اگر ${labels[advantage]} مهم‌تره`
          : p.price < all[0].product.price
            ? "با هزینه کمتر"
            : "انتخاب متعادل دیگر";
  return (
    <article className={`product-card ${index === 0 ? "best" : ""}`}>
      <div className="card-role">
        <span>{role}</span>
        <span>{number(index + 1).padStart(2, "۰")}</span>
      </div>
      <div className="product-visual">
        <PhoneArt brand={p.brand} image={p.modelData.image} />
        <div className="match">
          <strong>
            {number(item.total)}
            <small>٪</small>
          </strong>
          <span>تناسب با نیاز تو</span>
        </div>
      </div>
      <div className="card-body">
        <p className="product-brand">
          {p.brand} <span> / {number(p.storage)} گیگابایت</span>
        </p>
        <h3 dir="ltr">{p.model}</h3><small>نسخه پیشنهادی: {number(p.ram)} / {number(p.storage)}</small>
        <div className="product-price">
          {price(p.price)} <small>قیمت نمونه برای دمو</small>
        </div>
        <div className="spec-pills">
          <span>
            <Battery size={14} />
            {number(p.battery)}
          </span>
          <span>
            <Monitor size={14} />
            {number(p.screenSize)} اینچ
          </span>
          <span>
            <Layers size={14} />
            {number(p.ram)} رم
          </span>
        </div>
        <h4>چرا به نیازت می‌خوره؟</h4>
        <ul className="reasons">
          {explain(item).map(x=>x.split("؛")[0]).map((x) => (
            <li key={x}>
              <Check size={15} />
              {x}
            </li>
          ))}
        </ul>
        <details className="tradeoffs">
          <summary>با انتخاب این، از چی می‌گذری؟</summary>
          <ul>
            {(trade.length ? trade : p.cons).map((x) => (
              <li key={x}>
                <TriangleAlert size={14} />
                {x}
              </li>
            ))}
          </ul>
        </details>
        <button className="why-button" onClick={onWhy}>
          چرا اینو پیشنهاد دادی؟ <ArrowLeft size={15} />
        </button>
        <div className="card-actions">
          <label>
            <input type="checkbox" checked={selected} onChange={toggle} />{" "}
            مقایسه
          </label>
          <Link
            href={`/product/${p.slug}?state=${state}`}
            onClick={() => track("recommendation_opened", p.id)}
          >
            جزئیات گوشی <ArrowLeft size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
