import Link from "next/link";
import { db, getProducts } from "@/lib/db";
import { evaluate } from "@/lib/evaluation/run";
import { number } from "@/lib/domain";
import {dataQuality} from "@/lib/data/quality";
import {factLabels} from "@/lib/specifications";
import { Debugger } from "@/components/debugger";
export const dynamic = "force-dynamic";
export default async function Page() {
  const [products, events, aiRuns] = await Promise.all([
    getProducts(),
    db.event.groupBy({ by: ["name", "value"], _count: { _all: true } }),
    db.aiRun.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const evaluation = evaluate(products);
 const quality=dataQuality(products);
  return (
    <div className="wrap lab">
      <div className="eyebrow">BUILD → MEASURE → LEARN</div>
      <div className="section-top">
        <div>
          <h1>آزمایشگاه ارزیابی</h1>
          <p className="muted">ارزیابی محلی واقعی، با نتایج قابل بررسی</p>
        </div>
        <Link className="button" href="/lab">
          اجرای دوباره
        </Link>
      </div>
      <p className="notice">
        {number(evaluation.count)} پرس‌وجو · {number(products.length)} نسخه مستند با قیمت نمونه · استخراج قاعده‌محور (mock) · زمان اجرا:{" "}
        <bdi>{evaluation.timestamp}</bdi>
        <br />
        کیفیت رتبه‌بندی فقط روی {number(evaluation.judgedCount)} پرس‌وجوی دارای
        برچسب دستی سنجیده شده؛ این نتایج بنچمارک بازار نیستند.
      </p>
      <div className="metric-grid">
        {[
          ["Intent Accuracy", `${number(evaluation.intentAccuracy * 100)}٪`],
          ["Retrieval Recall@5", `${number(evaluation.recall * 100)}٪`],
          ["Ranking NDCG@3", number(evaluation.ndcg)],
          ["P50 Latency", `${number(evaluation.p50)} ms`],
          ["P95 Latency", `${number(evaluation.p95)} ms`],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="detail-columns">
        <section className="panel">
          <h2>Intent extraction</h2>
          {Object.entries(evaluation.byField).map(([k, v]) => (
            <div className="metric-row" key={k}>
              <span>{k}</span>
              <meter min={0} max={1} value={v} />
              <strong>{number(v * 100)}٪</strong>
            </div>
          ))}
          <p>Top-3 relevance: {number(evaluation.relevance * 100)}٪</p>
          <p className="muted">
            زمان فقط اجرای درون‌پردازه‌ای استخراج و رتبه‌بندی است؛ شبکه، دیتابیس
            و رندر را شامل نمی‌شود.
          </p>
        </section>
        <section className="panel">
          <h2>کجاها خراب می‌کنیم؟</h2>
          {evaluation.rows
            .filter((r) => !r.pass || r.note)
            .map((r,index) => (
              <div className="failure" key={`${r.query}-${index}`}>
                <strong>«{r.query}»</strong>
                <p>
                  {r.note ??
                    r.fields
                      .filter((f) => !f.pass)
                      .map((f) => f.key)
                      .join("، ")}
                </p>
                <small>{r.pass ? "ابهام شناخته‌شده" : "آزمون ناموفق"}</small>
              </div>
            ))}
        </section>
      </div>
      <details className="panel"><summary>Data Quality · کیفیت و منابع داده</summary><p>{number(quality.models)} مدل · {number(quality.variants)} نسخه · {quality.brands.join('، ')}</p><p>پوشش {number(quality.coverage*100)}٪ · نامشخص {number(quality.missing)} · با اطمینان بالا {number(quality.highConfidence)} · بدون تأیید {number(quality.unverified)} · قیمت قدیمی‌تر از ۳۰ روز {number(quality.stalePrices)} · قیمت نمونه {number(quality.demoPrices)}</p><div className="table-scroll"><table><thead><tr><th>فیلد</th><th>پوشش</th><th>نامشخص</th><th>اطمینان بالا</th></tr></thead><tbody>{quality.byField.map(f=><tr key={f.key}><th>{factLabels[f.key]}</th><td>{number(f.coverage*100)}٪</td><td>{number(f.missing)}</td><td>{number(f.highConfidence)}</td></tr>)}</tbody></table></div></details>
      <section className="panel"><h2>ارزیابی به تفکیک دسته</h2><div className="event-grid">{Object.entries(evaluation.byCategory).map(([k,v])=><div key={k}><b>{k}</b><p>{number(v.passed)} / {number(v.count)}</p></div>)}</div><p>میانگین تنوع برند: {number(evaluation.diversity.brands)} · فاصله قیمت: {number(evaluation.diversity.priceSpread/1e6)} میلیون · فاصله شاخص‌ها: {number(evaluation.diversity.featureDistance)}</p></section>
      <Debugger products={products} />
      <section className="panel">
        <h2>عملکرد واقعی API</h2>
        <p>
          ۱۰۰ درخواست اخیر؛ شامل استخراج، دیتابیس و رتبه‌بندی، بدون زمان شبکه
          مرورگر.
        </p>
        <div className="event-grid">
          <div>
            <span>درخواست ثبت‌شده</span>
            <strong>{number(aiRuns.length)}</strong>
          </div>
          <div>
            <span>فراخوانی موفق مدل</span>
            <strong>
              {number(aiRuns.filter((r) => r.mode === "openai").length)}
            </strong>
          </div>
          <div>
            <span>بازگشت به mock</span>
            <strong>{number(aiRuns.filter((r) => r.fallback).length)}</strong>
          </div>
          <div>
            <span>میانگین تأخیر (ms)</span>
            <strong>
              {number(
                aiRuns.length
                  ? aiRuns.reduce((s, r) => s + r.latency, 0) / aiRuns.length
                  : 0,
              )}
            </strong>
          </div>
        </div>
        <p>
          هزینه تخمینی درخواست‌های آنلاین:{" "}
          {aiRuns.some((r) => r.mode === "openai")
            ? aiRuns
                .filter((r) => r.mode === "openai")
                .some((r) => r.estimatedCost === null)
              ? "تعرفه تنظیم نشده؛ هزینه نامشخص است."
              : `$${aiRuns.reduce((s, r) => s + (r.estimatedCost ?? 0), 0).toFixed(6)}`
            : "هنوز فراخوانی آنلاین ثبت نشده است."}
        </p>
      </section>
      <section className="panel">
        <div className="section-top">
          <h2>حلقه یادگیری محصول</h2>
          <Link href="/lab/events">رویدادها و بازخوردها ←</Link>
        </div>
        <p className="muted">
          فقط نوع رویداد، شناسه محصول و دسته بازخورد ذخیره می‌شود؛ متن نیاز
          کاربر ذخیره نمی‌شود.
        </p>
        <div className="event-grid">
          {events.length ? (
            events.map((e) => (
              <div key={`${e.name}:${e.value}`}>
                <bdi>{e.name}</bdi>
                <strong>{number(e._count._all)}</strong>
                <small>{e.name === "feedback" ? e.value : ""}</small>
              </div>
            ))
          ) : (
            <p>هنوز رویدادی ثبت نشده؛ اولین جست‌وجو را انجام بده.</p>
          )}
        </div>
      </section>
      <details className="panel">
        <summary>همه موارد ارزیابی و خروجی واقعی</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>پرس‌وجو</th>
                <th>وضعیت</th>
                <th>سه انتخاب</th>
                <th>NDCG@3</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.rows.map((r,index) => (
                <tr key={`${r.query}-${index}`}>
                  <td>{r.query}</td>
                  <td>{r.pass ? "قبول" : "ناموفق"}</td>
                  <td>{r.top.join(" / ")}</td>
                  <td>{r.ndcg === null ? "بدون برچسب" : number(r.ndcg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="notice">
        هزینه این ارزیابی: صفر (بدون فراخوانی AI). هزینه حالت آنلاین وابسته به
        توکن مصرفی و تعرفه پیکربندی‌شده است؛ این صفحه کیفیت مدل آنلاین را
        نمی‌سنجد.
      </p>
    </div>
  );
}
