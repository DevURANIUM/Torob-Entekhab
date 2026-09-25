"use client";
import { useState } from "react";
import { Phone, number, keys, labels } from "@/lib/domain";
import { extractIntent } from "@/lib/ai/extract-intent";
import { search, whyNotSelected } from "@/lib/search/engine";
import { score } from "@/lib/search/ranking";
export function Debugger({ products }: { products: Phone[] }) {
  const [query, setQuery] = useState("برای پابجی گوشی تا ۳۰ میلیون");
  const [output, setOutput] = useState<ReturnType<typeof search> | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  return (
    <section className="panel debugger">
      <h2>Search Debugger</h2>
      <p>استخراج محلی → شرط‌ها → نسخه منتخب → سهم معیارها → رتبه → حساسیت</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const r = search(products, extractIntent(query));
          setOutput(r);
          setIds(r.recommendations.slice(0, 2).map((x) => x.product.id));
        }}
      >
        <input
          aria-label="پرس‌وجوی آزمایش"
          required
          maxLength={1000}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="primary">اجرای مسیر جست‌وجو</button>
      </form>
      {output && (
        <>
          <p>
            پایداری مدل اول:{" "}
            {number((output.sensitivity?.stableRatio ?? 0) * 100)}٪ · اولین وزن
            حساس: {output.sensitivity?.dominantCause ?? "هیچ‌کدام در ±۲۰٪"}
          </p>
          <div className="debug-columns">
            {[0, 1].map((index) => {
              const p = products.find((p) => p.id === ids[index]);
              const r = p ? score(p, output.intent) : null;
              return (
                <div key={index}>
                  <label>
                    محصول {index + 1}
                    <select
                      value={ids[index] ?? ""}
                      onChange={(e) =>
                        setIds((previous) => {
                          const next = [...previous];
                          next[index] = e.target.value;
                          return next;
                        })
                      }
                    >
                      <option value="">انتخاب</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName} {p.ram ?? "?"} / {p.storage}
                        </option>
                      ))}
                    </select>
                  </label>
                  {r && (
                    <>
                      <p>
                        {
                          whyNotSelected(
                            r.product,
                            output.intent,
                            output.ranked,
                            output.recommendations,
                          ).status
                        }{" "}
                        · رتبه مدل:{" "}
                        {number(
                          output.ranked.findIndex(
                            (x) => x.product.id === r.product.id,
                          ) + 1,
                        ) || "—"}{" "}
                        · نهایی {number(r.total)}
                      </p>
                      <p>
                        {whyNotSelected(
                          r.product,
                          output.intent,
                          output.ranked,
                          output.recommendations,
                        ).reasons.join("؛ ")}
                      </p>
                      <p>
                        جریمه بودجه {number(r.budgetPenalty)} · عدم قطعیت{" "}
                        {number(r.uncertaintyPenalty)}
                      </p>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>معیار</th>
                              <th>شاخص</th>
                              <th>وزن</th>
                              <th>سهم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keys.map((k) => (
                              <tr key={k}>
                                <td>{labels[k]}</td>
                                <td>{r.breakdown[k]}</td>
                                <td>{number(r.weights[k])}</td>
                                <td>{number(r.contributions[k])}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <details>
                        <summary>داده خام، فرمول‌ها و منابع</summary>
                        <pre dir="ltr">
                          {JSON.stringify(
                            {
                              variant: r.product.variant,
                              facts: r.product.modelData.facts,
                              provenance: r.product.modelData.provenance,
                              derived: r.product.intelligence,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <details>
            <summary>تمام نامزدها و علت وضعیت</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>نامزد</th>
                    <th>وضعیت</th>
                    <th>دلیل</th>
                  </tr>
                </thead>
                <tbody>
                  {output.alternatives.map((x) => (
                    <tr key={x.id}>
                      <td>{x.name}</td>
                      <td>{x.status}</td>
                      <td>{x.reasons.join("؛ ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details>
            <summary>Intent و سناریوهای حساسیت</summary>
            <pre dir="ltr">
              {JSON.stringify(
                {
                  intent: output.intent,
                  sensitivity: output.sensitivity,
                  counterfactuals: output.counterfactuals,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}
