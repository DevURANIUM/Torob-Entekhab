import { Ranked } from "@/lib/search/ranking";
import { keys, labels, number } from "@/lib/domain";

export function ScorePanel({ item }: { item: Ranked }) {
  const ordered = [...keys].sort((a, b) => item.weights[b] - item.weights[a]);
  return (
    <div className="score-panel">
      <p className="score-panel__total">
        امتیاز برای نیاز تو <strong>{number(item.total)}</strong> از ۱۰۰
      </p>
      {ordered.map((k) => (
        <div className="score-row" key={k}>
          <div className="score-row__head">
            <span>{labels[k]}</span>
            <strong>{number(item.breakdown[k])}</strong>
          </div>
          <div
            className="bar"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.breakdown[k]}
            aria-label={labels[k]}
          >
            <span
              style={{
                inlineSize: `${Math.max(0, Math.min(100, item.breakdown[k]))}%`,
              }}
            />
          </div>
          <p className="score-row__meta">
            <span>وزن: {number(item.weights[k] * 100)}٪</span>
            <span>سهم: {number(item.contributions[k])}</span>
            <span>
              پوشش داده:{" "}
              {number(item.product.intelligence.features[k].coverage * 100)}٪
            </span>
          </p>
          <details>
            <summary>روش محاسبه</summary>
            <p>{item.product.intelligence.features[k].basis}</p>
          </details>
        </div>
      ))}
      <p className="notice">
        جمع سهم معیارها {number(item.utility)} منهای جریمه عدم قطعیت{" "}
        {number(item.uncertaintyPenalty)} منهای جریمه بودجه{" "}
        {number(item.budgetPenalty)} برابر {number(item.total)} است. وزن
        کاربردها پیش از محاسبه اعمال شده؛ این عدد احتمال موفقیت خرید نیست.
      </p>
    </div>
  );
}
