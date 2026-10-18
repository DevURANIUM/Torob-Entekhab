"use client";
import { TrendingUp, X } from "lucide-react";
import { keys, labels, number, price } from "@/lib/domain";
import type { marginalValueAnalysis } from "@/lib/search/engine";

type Upgrade = NonNullable<ReturnType<typeof marginalValueAnalysis>>;

export function UpgradeBanner({
  onAsk,
  busy,
}: {
  onAsk: () => void;
  busy: boolean;
}) {
  return (
    <section className="upgrade-banner">
      <TrendingUp size={26} aria-hidden="true" />
      <div>
        <h2>بودجه بیشتر، انتخاب بهتر؟</h2>
        <p>ببین هزینه بیشتر واقعاً کدوم اولویت تو رو بهتر می‌کنه.</p>
      </div>
      <button
        type="button"
        className="btn btn--ink"
        onClick={onAsk}
        disabled={busy}
      >
        اگه بیشتر هزینه کنم چی گیرم میاد؟
      </button>
    </section>
  );
}

export function UpgradeResult({
  upgrade,
  onClose,
}: {
  upgrade: Upgrade;
  onClose: () => void;
}) {
  return (
    <section className="panel upgrade-result" aria-labelledby="upgrade-title">
      <div className="panel__head">
        <h2 id="upgrade-title">
          با {price(upgrade.newBudget - upgrade.oldBudget)} بودجه بیشتر
        </h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="بستن تحلیل"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {upgrade.next ? (
        <p className="upgrade-result__swap">
          <bdi dir="ltr">{upgrade.current.product.displayName}</bdi>
          <span aria-hidden="true">←</span>
          <bdi dir="ltr">{upgrade.next.product.displayName}</bdi>
          <span className="muted">
            {price(upgrade.next.product.price)}، تناسب{" "}
            {number(upgrade.next.total)} در برابر{" "}
            {number(upgrade.current.total)}
          </span>
        </p>
      ) : null}
      {upgrade.next && (
        <div className="delta-grid">
          {keys
            .filter((k) => k !== "value")
            .map((k) => (
              <div
                key={k}
                className={
                  upgrade.deltas[k] > 0
                    ? "up"
                    : upgrade.deltas[k] < 0
                      ? "down"
                      : ""
                }
              >
                <span>{labels[k]}</span>
                <strong dir="ltr">
                  {upgrade.deltas[k] > 0 ? "+" : ""}
                  {number(upgrade.deltas[k])}
                </strong>
                <small>امتیاز از ۱۰۰</small>
              </div>
            ))}
        </div>
      )}
      {upgrade.next && (
        <p className="muted">
          تغییر پشتیبانی:{" "}
          {upgrade.supportDelta === null
            ? "نامشخص"
            : `${number(upgrade.supportDelta)} سال`}{" "}
          · اختلاف قیمت دو انتخاب: {price(upgrade.extraCost)}
        </p>
      )}
      <p className="notice">{upgrade.conclusion}</p>
    </section>
  );
}
