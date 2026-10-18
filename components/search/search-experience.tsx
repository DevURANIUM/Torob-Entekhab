"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Search, ShieldCheck, X } from "lucide-react";
import { SearchIntent, number, price } from "@/lib/domain";
import { SearchResult, marginalValueAnalysis } from "@/lib/search/engine";
import { Ranked } from "@/lib/search/ranking";
import { encodeIntent, readIntent } from "@/lib/state";
import { track } from "@/lib/analytics";
import { ProductCard } from "./product-card";
import { IntentEditor } from "./intent-editor";
import { DecisionTools } from "./decision-tools";
import { ScorePanel } from "./score-panel";
import { UpgradeBanner, UpgradeResult } from "./upgrade-panel";
import { FeedbackBar } from "./feedback-bar";
import { CompareBar } from "./compare-bar";

type Upgrade = ReturnType<typeof marginalValueAnalysis>;
type Result = SearchResult & {
  mode?: string;
  fallback?: boolean;
  upgrade?: Upgrade;
};

const providerNames: Record<string, string> = {
  claude: "Claude",
  openai: "OpenAI",
  deepseek: "DeepSeek",
};
const confidenceLabel = {
  low: "پایین",
  medium: "متوسط",
  high: "بالا",
} as const;
const clarifyOptions = [
  "دوربین",
  "باتری",
  "بازی",
  "استفاده روزمره",
  "چند سال نگهش می‌دارم",
];

/** Follow-up suggestions; the budget one scales with the current cap. */
function followups(intent: SearchIntent) {
  const max = intent.budget?.max;
  const raised = max ? Math.ceil((max * 1.25) / 5e6) * 5 : null;
  return [
    "سامسونگ ترجیح میدم",
    raised ? `بودجه رو ببر تا ${number(raised)} میلیون` : "تا ۱۲۰ میلیون",
    "دوربین مهم‌تر شد",
    "گوشی سبک‌تر می‌خوام",
    "برای بازی هم مناسب باشه",
  ];
}

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
  const [upgrade, setUpgrade] = useState<Upgrade>(null);
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
      setSelected(
        data.intent.action === "compare_first_two"
          ? data.recommendations.slice(0, 2).map((r: Ranked) => r.product.id)
          : [],
      );
      setUpdated(Boolean(previous || edited));
      window.history.replaceState(
        null,
        "",
        `/search?q=${encodeURIComponent(q)}&state=${encodeIntent(data.intent)}`,
      );
    } catch (e) {
      if (id === requestId.current)
        setError(
          e instanceof Error && e.message ? e.message : "دوباره تلاش کن.",
        );
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
  const askUpgrade = () => {
    if (!result) return;
    track("budget_analysis_opened");
    void run(result.intent.query, undefined, result.intent, true);
  };
  const close = () => {
    dialog.current?.close();
    setWhy(null);
  };
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev,
    );
  const alternatives = result
    ? result.ranked
        .filter(
          (r) =>
            !result.recommendations.some((s) => s.product.id === r.product.id),
        )
        .slice(0, 6)
    : [];

  return (
    <div className="results wrap">
      <nav className="breadcrumb" aria-label="مسیر">
        <Link href="/">انتخاب گوشی</Link>
        <span aria-hidden="true">/</span>
        <span>پیشنهادهای تو</span>
      </nav>
      <form
        className="search-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          track("search_submitted");
          void run(text);
        }}
      >
        <Search size={19} aria-hidden="true" />
        <input
          aria-label="نیاز اولیه"
          required
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn--primary" disabled={busy}>
          جست‌وجو
        </button>
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
          <button
            type="button"
            className="btn btn--soft"
            onClick={() => void run(text)}
          >
            تلاش دوباره
          </button>
        </p>
      )}

      {busy && !result && (
        <div role="status" className="loading">
          <span>
            دارم نیازت رو می‌فهمم… گزینه‌های نامرتبط رو کنار می‌ذارم… تفاوت‌ها
            رو می‌سنجم…
          </span>
          <div className="cards">
            {[0, 1, 2].map((i) => (
              <div className="skeleton" key={i} />
            ))}
          </div>
        </div>
      )}

      {result && (
        <div aria-busy={busy} className={busy ? "is-pending" : undefined}>
          {busy && (
            <div
              className="progress"
              role="status"
              aria-label="در حال به‌روزرسانی"
            />
          )}
          <IntentEditor
            intent={result.intent}
            onChange={(i) => {
              track("intent_edited");
              void run(i.query, undefined, i);
            }}
          />
          {result.fallback &&
            (result.mode && providerNames[result.mode] ? (
              <p className="notice">
                سرویس AI اول در دسترس نبود؛ برداشت با{" "}
                {providerNames[result.mode]} انجام شد.
              </p>
            ) : (
              <p className="notice">
                سرویس AI در دسترس نیست؛ استخراج قاعده‌محور فعال است و پیشنهادها
                قابل استفاده‌اند.
              </p>
            ))}
          {result.clarification && (
            <section className="clarification">
              <div>
                <strong>یه سؤال کمک می‌کنه پیشنهاد بهتر بشه</strong>
                <p>{result.clarification}</p>
              </div>
              <div className="toggle-row">
                {clarifyOptions.map((x) => (
                  <button
                    type="button"
                    className="toggle"
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
              <p className="eyebrow">انتخاب‌های متناسب با تو</p>
              <h1>
                برای نیاز تو، این {number(result.recommendations.length)} تا
                منطقی‌ترن
              </h1>
              <p className="muted">
                از بین {number(result.candidateCount)} نسخه واجد شرایط ·{" "}
                {number(result.familyCount)} مدل متفاوت
              </p>
            </div>
            <details className="confidence">
              <summary>
                <ShieldCheck size={16} aria-hidden="true" />
                اطمینان پیشنهاد: {confidenceLabel[result.confidence]}
              </summary>
              <p className="confidence__more">این اطمینان از کجا آمده؟</p>
              <div className="confidence__body">
                <p>{result.confidenceDetails.explanation}</p>
                <dl>
                  <div>
                    <dt>فاصله امتیاز</dt>
                    <dd>{number(result.confidenceDetails.gap)}</dd>
                  </div>
                  <div>
                    <dt>پوشش داده</dt>
                    <dd>{number(result.confidenceDetails.coverage * 100)}٪</dd>
                  </div>
                  <div>
                    <dt>کامل بودن نیاز</dt>
                    <dd>
                      {number(result.confidenceDetails.completeness * 100)}٪
                    </dd>
                  </div>
                  <div>
                    <dt>مدل‌ها</dt>
                    <dd>{number(result.confidenceDetails.candidates)}</dd>
                  </div>
                </dl>
              </div>
            </details>
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
              {result.nearest ? (
                <p>
                  ارزان‌ترین گوشی نوی فهرست که با بقیه شرط‌هات جور است{" "}
                  {price(result.nearest.cheapest)} است. این‌ها نزدیک‌ترین
                  گزینه‌ها به بودجه تو هستند:
                </p>
              ) : (
                <p>
                  می‌تونیم محدودیت برند رو برداریم یا بودجه رو در بخش بالا تغییر
                  بدیم.
                </p>
              )}
              <div className="empty__actions">
                {result.nearest && result.intent.budget && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() =>
                      void run(result.intent.query, undefined, {
                        ...result.intent,
                        budget: {
                          ...result.intent.budget,
                          max: Math.ceil(result.nearest!.cheapest / 5e6) * 5e6,
                          target:
                            Math.ceil(result.nearest!.cheapest / 5e6) * 5e6,
                        },
                      })
                    }
                  >
                    بودجه رو بکن تا{" "}
                    {number(Math.ceil(result.nearest.cheapest / 5e6) * 5)}{" "}
                    میلیون
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--soft"
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
                <Link className="btn btn--ghost" href="/">
                  از اول شروع کن
                </Link>
              </div>
              {result.nearest && (
                <div className="cards empty__nearest">
                  {result.nearest.items.map((item, index) => (
                    <ProductCard
                      key={item.product.id}
                      item={item}
                      all={result.nearest!.items}
                      index={index}
                      state={state}
                      role={`${number(
                        Math.ceil(
                          (item.product.price -
                            (result.intent.budget?.max ?? 0)) /
                            1e6,
                        ),
                      )} میلیون بالاتر از بودجه`}
                      selected={selected.includes(item.product.id)}
                      toggle={() => toggle(item.product.id)}
                      onWhy={() => {
                        track("why_clicked", item.product.id);
                        setWhy(item);
                        dialog.current?.showModal();
                      }}
                    />
                  ))}
                </div>
              )}
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
                    toggle={() => toggle(item.product.id)}
                    onWhy={() => {
                      track("why_clicked", item.product.id);
                      setWhy(item);
                      dialog.current?.showModal();
                    }}
                  />
                ))}
              </div>

              {alternatives.length > 0 && (
                <details className="alternatives">
                  <summary>
                    گزینه‌های جایگزین (
                    {number(
                      result.ranked.length - result.recommendations.length,
                    )}
                    )
                  </summary>
                  <ul>
                    {alternatives.map((x) => (
                      <li key={x.product.id}>
                        <Link
                          href={`/product/${x.product.slug}?state=${state}`}
                        >
                          <bdi dir="ltr">{x.product.displayName}</bdi>
                          <span>{price(x.product.price)}</span>
                          <strong>{number(x.total)}</strong>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <UpgradeBanner onAsk={askUpgrade} busy={busy} />
              {upgrade && (
                <UpgradeResult
                  upgrade={upgrade}
                  onClose={() => setUpgrade(null)}
                />
              )}

              <section className="refine panel" aria-labelledby="refine-title">
                <h2 id="refine-title">نظرت عوض شد؟ بگو چی تغییر کنه.</h2>
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
                  <button className="btn btn--primary" disabled={busy}>
                    اعمال تغییر
                    <ArrowLeft size={17} aria-hidden="true" />
                  </button>
                </form>
                <div className="toggle-row">
                  {followups(result.intent).map((x) => (
                    <button
                      type="button"
                      className="toggle"
                      key={x}
                      onClick={() => refine(x)}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </section>

              <DecisionTools result={result} state={state} />
              <FeedbackBar onError={setError} />
            </>
          )}
          <Link href="/" className="reset">
            <RotateCcw size={15} aria-hidden="true" /> از اول شروع کن
          </Link>
        </div>
      )}

      <CompareBar
        ids={selected}
        state={state}
        onClear={() => setSelected([])}
      />

      <dialog
        ref={dialog}
        className="sheet"
        aria-labelledby="explanation-title"
        onCancel={() => setWhy(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="sheet__head">
          <h2 id="explanation-title">چرا اینو پیشنهاد دادیم؟</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="بستن توضیح"
            onClick={close}
          >
            <X size={20} />
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
