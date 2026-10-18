"use client";
import Link from "next/link";
import {
  Battery,
  Check,
  ExternalLink,
  Layers,
  Monitor,
  TriangleAlert,
} from "lucide-react";
import { Ranked, explain, tradeoffs } from "@/lib/search/ranking";
import { price, number, keys, labels } from "@/lib/domain";
import { PhoneImage } from "@/components/ui/phone-image";
import { track } from "@/lib/analytics";

function roleOf(item: Ranked, index: number, all: Ranked[]) {
  const p = item.product;
  const top = all[0].product;
  const advantage = [...keys].sort(
    (a, b) => p.scores[b] - top.scores[b] - (p.scores[a] - top.scores[a]),
  )[0];
  if (index === 0) return "بهترین انتخاب برای تو";
  if (index === 1 && p.scores.value > top.scores.value)
    return "ارزش خرید بیشتر";
  if (p.scores[advantage] > top.scores[advantage])
    return `اگر ${labels[advantage]} مهم‌تره`;
  if (p.price < top.price) return "با هزینه کمتر";
  return "انتخاب متعادل دیگر";
}

export function ProductCard({
  item,
  index,
  all,
  selected,
  toggle,
  onWhy,
  state,
  role,
}: {
  item: Ranked;
  index: number;
  all: Ranked[];
  selected: boolean;
  toggle: () => void;
  onWhy: () => void;
  state: string;
  /** Replaces the computed role, e.g. for options above the budget. */
  role?: string;
}) {
  const p = item.product;
  const trade = tradeoffs(item, all);
  const reasons = explain(item).map((x) => x.split("؛")[0]);
  const best = index === 0 && !role;
  return (
    <article className={`product-card${best ? " is-best" : ""}`}>
      <p className="product-card__role">
        <span>{role ?? roleOf(item, index, all)}</span>
        <span
          className="product-card__rank"
          aria-label={`رتبه ${number(index + 1)}`}
        >
          {number(index + 1)}
        </span>
      </p>
      <div className="product-card__media">
        <PhoneImage model={p.modelData} name={p.displayName} size="md" />
        <div
          className="match"
          aria-label={`تناسب ${number(item.total)} از ۱۰۰`}
        >
          <strong>{number(item.total)}</strong>
          <span>تناسب با نیاز تو</span>
        </div>
      </div>
      <div className="product-card__body">
        <p className="product-brand">
          {p.brand} <span> / {number(p.storage)} گیگابایت</span>
        </p>
        <h3 className="product-card__name" dir="ltr">
          {p.model}
        </h3>
        <p className="product-card__config">
          نسخه پیشنهادی: {number(p.ram)} / {number(p.storage)}
        </p>
        <div className="product-card__price">
          <strong>{price(p.price)}</strong>
          {p.torob ? (
            <a
              href={p.torob.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("torob_opened", p.id)}
            >
              کمترین قیمت در {number(p.torob.shops)} فروشگاه ترب
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : (
            <span>قیمت نمونه برای دمو</span>
          )}
        </div>
        <ul className="spec-pills" aria-label="مشخصات کلیدی">
          <li>
            <Battery size={15} aria-hidden="true" />
            {number(p.battery)}
          </li>
          <li>
            <Monitor size={15} aria-hidden="true" />
            {number(p.screenSize)} اینچ
          </li>
          <li>
            <Layers size={15} aria-hidden="true" />
            {number(p.ram)} رم
          </li>
        </ul>
        <h4 className="product-card__subhead">چرا به نیازت می‌خوره؟</h4>
        <ul className="reasons">
          {reasons.map((x) => (
            <li key={x}>
              <Check size={15} aria-hidden="true" />
              {x}
            </li>
          ))}
        </ul>
        <details className="tradeoffs">
          <summary>با انتخاب این، از چی می‌گذری؟</summary>
          <ul>
            {(trade.length ? trade : p.cons).map((x) => (
              <li key={x}>
                <TriangleAlert size={14} aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
        </details>
        <button type="button" className="why-button" onClick={onWhy}>
          چرا اینو پیشنهاد دادی؟
        </button>
        <div className="card-actions">
          <Link
            className="btn btn--soft"
            href={`/product/${p.slug}?state=${state}`}
            onClick={() => track("recommendation_opened", p.id)}
          >
            جزئیات گوشی
          </Link>
          <label className="compare-toggle">
            <input type="checkbox" checked={selected} onChange={toggle} />
            مقایسه
          </label>
        </div>
      </div>
    </article>
  );
}
