"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  Scale,
  SlidersHorizontal,
  X,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { SearchIntent, labels, keys, number, price } from "@/lib/domain";
import { SearchResult, marginalValueAnalysis } from "@/lib/search/engine";
import { Ranked } from "@/lib/search/ranking";
import { encodeIntent, readIntent } from "@/lib/state";
import { track } from "@/lib/analytics";
import { ProductCard } from "./product-card";
import { IntentEditor } from "./intent-editor";
import { DecisionTools } from "./decision-tools";
import { ScorePanel } from "./score-panel";
type Result = SearchResult & {
  mode?: string;
  fallback?: boolean;
  upgrade?: ReturnType<typeof marginalValueAnalysis>;
};
export default function SearchExperience({
  query,
  initialState,
}: {
  query: string;
  initialState?: string;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [text, setText] = useState(query);
  const [followup, setFollowup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [why, setWhy] = useState<Ranked | null>(null);
  const [upgrade, setUpgrade] =
    useState<ReturnType<typeof marginalValueAnalysis>>(null);
  const [negative, setNegative] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [updated, setUpdated] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef(0);
  async function run(
    q: string,
    previous?: SearchIntent,
    edited?: SearchIntent,
    isUpgrade = false,
    target?: number,
  ) {
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          previous,
          edited,
          upgrade: isUpgrade,
          target,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (id !== requestId.current) return;
      if (isUpgrade) {
        setUpgrade(data.upgrade);
        return;
      }
      setResult(data);
      setUpgrade(null);
      setSelected(data.intent.action==='compare_first_two'?data.recommendations.slice(0,2).map((r:Ranked)=>r.product.id):[]);
      setUpdated(Boolean(previous || edited));
      setFeedback(false);
      window.history.replaceState(
        null,
        "",
        `/search?q=${encodeURIComponent(q)}&state=${encodeIntent(data.intent)}`,
      );
    } catch (e) {
      if (id === requestId.current)
        setError(e instanceof Error ? e.message : "دوباره تلاش کن.");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) {
        track("search_submitted");
        void run(
          query || "گوشی میخوام",
          undefined,
          initialState ? readIntent(initialState, query) : undefined,
        );
      }
    });
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      void run(
        p.get("q") ?? "گوشی",
        undefined,
        p.get("state") ? readIntent(p.get("state")!) : undefined,
      );
    };
    window.addEventListener("popstate", onPop);
    return () => {
      disposed = true;
      window.removeEventListener("popstate", onPop);
    };
  }, [query, initialState]);
  const state = result ? encodeIntent(result.intent) : "";
  const refine = (q: string, event = "followup_submitted") => {
    if (!result || !q.trim()) return;
    track(event);
    if (/بیشتر|واقعاً.*بهتر/.test(q) && /هزینه|میلیون|بودجه/.test(q)) {
      const m = q
        .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
        .match(/(\d+)\s*میلیون/);
      void run(
        result.intent.query,
        undefined,
        result.intent,
        true,
        m ? Number(m[1]) * 1e6 : undefined,
      );
    } else void run(q, result.intent);
    setFollowup("");
  };
  const close = () => {
    dialog.current?.close();
    setWhy(null);
  };
  return (
    <div className="wrap results">
      <div className="breadcrumb">
        <Link href="/">انتخاب گوشی</Link>
        <span>/</span>
        <span>پیشنهادهای تو</span>
      </div>
      <form
        className="compact-search"
        onSubmit={(e) => {
          e.preventDefault();
          track("search_submitted");
          void run(text);
        }}
      >
        <SlidersHorizontal size={20} />
        <input
          aria-label="نیاز اولیه"
          required
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="primary" disabled={busy}>
          جست‌وجو <ArrowLeft size={17} />
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error} <button onClick={() => void run(text)}>تلاش دوباره</button>
        </p>
      )}
      {busy && (
        <div role="status" className="loading">
          <div className="loading-line" />
          <span>
            دارم نیازت رو می‌فهمم… گزینه‌های نامرتبط رو کنار می‌ذارم… تفاوت‌ها
            رو می‌سنجم…
          </span>
          {!result && (
            <div className="cards">
              {[0, 1, 2].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          )}
        </div>
      )}
      {result && (
        <div aria-busy={busy} className={busy ? "pending" : ""}>
          <IntentEditor
            intent={result.intent}
            onChange={(i) => {
              track("intent_edited");
              void run(i.query, undefined, i);
            }}
          />
          {result.fallback && (
            <p className="notice">
              سرویس AI در دسترس نیست؛ استخراج قاعده‌محور فعال است و پیشنهادها
              قابل استفاده‌اند.
            </p>
          )}
          {result.clarification && (
            <section className="clarification">
              <div>
                <strong>یه سؤال کمک می‌کنه پیشنهاد بهتر بشه</strong>
                <p>{result.clarification}</p>
              </div>
              <div className="inline">
                {[
                  "دوربین",
                  "باتری",
                  "بازی",
                  "استفاده روزمره",
                  "چند سال نگهش می‌دارم",
                ].map((x) => (
                  <button
                    key={x}
                    onClick={() =>
                      refine(`${x} مهمه`, "clarification_answered")
                    }
                  >
                    {x}
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="results-heading">
            <div>
              <div className="eyebrow">انتخاب‌های متناسب با تو</div>
              <h1>
                برای نیاز تو، این {number(result.recommendations.length)} تا
                منطقی‌ترن
              </h1>
              <p className="muted">
                از بین {number(result.candidateCount)} نسخه واجد شرایط ·{" "}
                {number(result.familyCount)} مدل متفاوت
              </p>
            </div>
            <div className="confidence">
              <Check size={16} /> اطمینان پیشنهاد:{" "}
              {
                { low: "پایین", medium: "متوسط", high: "بالا" }[
                  result.confidence
                ]
              }
              <details><summary>این اطمینان از کجا آمده؟</summary><p>{result.confidenceDetails.explanation}</p><p>فاصله: {number(result.confidenceDetails.gap)} · پوشش داده: {number(result.confidenceDetails.coverage*100)}٪ · کامل بودن نیاز: {number(result.confidenceDetails.completeness*100)}٪ · مدل‌ها: {number(result.confidenceDetails.candidates)}</p></details>
            </div>
          </div>
          {updated && (
            <p role="status" className="updated">
              با این تغییر، پیشنهادها دوباره مرتب شدند.
            </p>
          )}
          {!result.ranked.length ? (
            <section className="empty">
              <h2>
                {result.understood
                  ? "با این بودجه و شرط‌ها گزینه‌ای پیدا نکردم."
                  : "نیاز به گوشی رو از این متن متوجه نشدم."}
              </h2>
              <p>
                می‌تونیم محدودیت برند رو برداریم یا بودجه رو در بخش بالا تغییر
                بدیم.
              </p>
              <button
                onClick={() =>
                  void run(result.intent.query, undefined, {
                    ...result.intent,
                    brands: [],
                    excludedBrands: [],
                  })
                }
              >
                برندهای دیگه رو ببینیم
              </button>
              <Link href="/">از اول شروع کن</Link>
            </section>
          ) : (
            <>
              <div className="cards">
                {result.recommendations.map((item, index) => (
                  <ProductCard
                    key={item.product.id}
                    item={item}
                    all={result.ranked}
                    index={index}
                    state={state}
                    selected={selected.includes(item.product.id)}
                    toggle={() =>
                      setSelected((prev) =>
                        prev.includes(item.product.id)
                          ? prev.filter((x) => x !== item.product.id)
                          : prev.length < 3
                            ? [...prev, item.product.id]
                            : prev,
                      )
                    }
                    onWhy={() => {
                      track("why_clicked", item.product.id);
                      setWhy(item);
                      dialog.current?.showModal();
                    }}
                  />
                ))}
              </div>
              <DecisionTools result={result} state={state} />
              <section className="upgrade-banner">
                <div className="upgrade-icon">
                  <TrendingUp size={25} />
                </div>
                <div>
                  <h2>بودجه بیشتر، انتخاب بهتر؟</h2>
                  <p>ببین هزینه بیشتر واقعاً کدوم اولویت تو رو بهتر می‌کنه.</p>
                </div>
                <button
                  onClick={() => {
                    track("budget_analysis_opened");
                    void run(
                      result.intent.query,
                      undefined,
                      result.intent,
                      true,
                    );
                  }}
                  disabled={busy}
                >
                  اگه بیشتر هزینه کنم چی گیرم میاد؟ <ArrowUpLeft size={18} />
                </button>
              </section>
              {upgrade && (
                <section className="panel upgrade-result">
                  <div className="section-top">
                    <h2>
                      با {price(upgrade.newBudget - upgrade.oldBudget)} بودجه
                      بیشتر
                    </h2>
                    <button
                      aria-label="بستن تحلیل"
                      onClick={() => setUpgrade(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p>
                    <bdi>{upgrade.current.product.displayName}</bdi> ←{" "}
                    <bdi>{upgrade.next.product.displayName}</bdi>
                  </p>
                  <div className="delta-grid">
                    {keys
                      .filter((k) => k !== "value")
                      .map((k) => (
                        <div key={k}>
                          <span>{labels[k]}</span>
                          <strong>
                            {upgrade.deltas[k] > 0 ? "+" : ""}
                            {number(upgrade.deltas[k])}
                          </strong>
                          <small>امتیاز از ۱۰۰</small>
                        </div>
                      ))}
                  </div>
                  <p>
                    تغییر پشتیبانی: {number(upgrade.supportDelta)} سال · اختلاف
                    قیمت نمونه دو انتخاب: {price(upgrade.extraCost)}
                  </p>
                  <p className="notice">{upgrade.conclusion}</p>
                </section>
              )}
              {result.ranked.length > 3 && (
                <details className="alternatives">
                  <summary>
                    گزینه‌های جایگزین ({number(result.ranked.length - 3)})
                  </summary>
                  {result.ranked.filter(r=>!result.recommendations.some(s=>s.product.id===r.product.id)).slice(0,6).map((x) => (
                    <Link
                      key={x.product.id}
                      href={`/product/${x.product.slug}?state=${state}`}
                    >
                      <bdi>{x.product.displayName}</bdi>
                      <span>{price(x.product.price)}</span>
                      <strong>{number(x.total)}٪</strong>
                    </Link>
                  ))}
                </details>
              )}
              <section className="refinement panel">
                <h2>نظرت عوض شد؟ بگو چی تغییر کنه.</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    refine(followup);
                  }}
                >
                  <input
                    aria-label="تغییر نیاز"
                    maxLength={1000}
                    required
                    placeholder="مثلاً: سامسونگ ترجیح میدم…"
                    value={followup}
                    onChange={(e) => setFollowup(e.target.value)}
                  />
                  <button className="primary" disabled={busy}>
                    اعمال تغییر <ArrowLeft size={18} />
                  </button>
                </form>
                <div className="inline">
                  {[
                    "سامسونگ ترجیح میدم",
                    "بودجه رو ببر تا ۳۰ میلیون",
                    "دوربین مهم‌تر شد",
                    "گوشی سبک‌تر می‌خوام",
                    "برای بازی هم مناسب باشه",
                  ].map((x) => (
                    <button key={x} onClick={() => refine(x)}>
                      {x}
                    </button>
                  ))}
                </div>
              </section>
              <section className="feedback">
                <span>
                  {feedback
                    ? "ممنون؛ بازخوردت ثبت شد."
                    : "این پیشنهاد به دردت خورد؟"}
                </span>
                {!feedback && (
                  <>
                    <button
                      onClick={async () => {
                        const ok = await track("feedback", "positive");
                        setFeedback(ok);
                        if (!ok)
                          setError("ثبت بازخورد ممکن نشد؛ دوباره تلاش کن.");
                      }}
                    >
                      آره
                    </button>
                    <button onClick={() => setNegative(true)}>نه خیلی</button>
                    {negative && (
                      <div className="inline">
                        <span>چی درست نبود؟</span>
                        {[
                          "قیمت",
                          "برند",
                          "مشخصات",
                          "اولویت‌بندی",
                          "پیشنهادها نامرتبط بودن",
                          "سایر",
                        ].map((x) => (
                          <button
                            key={x}
                            onClick={async () => {
                              const ok = await track("feedback", x);
                              setFeedback(ok);
                              if (!ok)
                                setError(
                                  "ثبت بازخورد ممکن نشد؛ دوباره تلاش کن.",
                                );
                            }}
                          >
                            {x}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}
          <Link href="/" className="reset">
            <RotateCcw size={15} /> از اول شروع کن
          </Link>
        </div>
      )}
      {selected.length > 0 && (
        <div className="compare-bar">
          <Scale size={21} />
          <span>{number(selected.length)} گوشی برای مقایسه</span>
          {selected.length >= 2 ? (
            <Link
              className="primary"
              href={`/compare?ids=${selected.join(",")}&state=${state}`}
              onClick={() => track("comparison_started")}
            >
              مقایسه انتخاب‌ها <ArrowLeft size={17} />
            </Link>
          ) : (
            <span className="muted">یک گوشی دیگر انتخاب کن</span>
          )}
          <button aria-label="پاک کردن مقایسه" onClick={() => setSelected([])}>
            <X size={18} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="explanation-title"
        onCancel={() => setWhy(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="dialog-head">
          <h2 id="explanation-title">چرا اینو پیشنهاد دادیم؟</h2>
          <button aria-label="بستن توضیح" onClick={close}>
            <X />
          </button>
        </div>
        {why && (
          <>
            <h3 dir="ltr">{why.product.displayName}</h3>
            <ScorePanel item={why} />
          </>
        )}
      </dialog>
    </div>
  );
}
