"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Scale,
  Check,
  Smartphone,
  Sparkles,
} from "lucide-react";
export const examples = [
  "بهترین گوشی تا ۲۰ میلیون برای استفاده روزمره",
  "برای بازی گوشی تا ۳۵ میلیون می‌خوام",
  "گوشی سامسونگ با باتری خوب تا ۳۰ میلیون",
  "برای پدرم گوشی ساده و بادوام می‌خوام",
  "حدود سی تومن؛ دوربین و شارژ سریع مهمه",
  "گوشی کوچیک میخوام، حداقل ۲۵۶ گیگ",
  "گوشی برای تولید محتوا میخوام",
];
export default function Home() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  return (
    <div className="home wrap">
      <div className="eyebrow">
        <Smartphone size={15} /> فقط گوشی موبایل؛ با دقت بیشتر
      </div>
      <h1>
        بگو چی <span>لازم داری،</span>
        <br />
        نه اینکه اسم محصول رو بدونی.
      </h1>
      <p className="hero-copy">
        نیازت رو به زبان خودت بگو؛ بین گزینه‌ها می‌گردیم، تفاوت‌ها رو می‌سنجیم
        <br className="desktop" /> و چند انتخاب مناسب رو با دلیل پیشنهاد
        می‌کنیم.
      </p>
      <form
        className="search-box"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim())
            router.push(`/search?q=${encodeURIComponent(query)}`);
        }}
      >
        <div className="search-label">
          <Sparkles size={19} />
          <label htmlFor="need">چه گوشی‌ای به زندگی تو می‌خوره؟</label>
        </div>
        <textarea
          id="need"
          maxLength={1000}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
          placeholder="مثلاً: برای خودم گوشی تا ۲۵ میلیون می‌خوام، باتری و صفحه‌نمایش مهمه و دوربین خیلی مهم نیست…"
        />
        <div className="search-bottom">
          <span>
            <span className="keycap">↵</span> با نیازت شروع کن، نه با مدل گوشی
          </span>
          <button className="primary" type="submit">
            پیشنهاد بده <ArrowLeft size={19} />
          </button>
        </div>
      </form>
      <div className="examples">
        <span className="muted">از این‌ها ایده بگیر</span>
        {examples.map((example, i) => (
          <button key={example} onClick={() => setQuery(example)}>
            <span>
              {["روزمره", "بازی", "باتری", "برای خانواده", "عکاسی"][i]}
            </span>
            {example}
            <ArrowLeft size={14} />
          </button>
        ))}
      </div>
      <section className="how">
        <div className="how-heading">
          <span className="eyebrow">کمتر بگرد، بهتر انتخاب کن</span>
          <h2>۳ انتخاب، نه ۳۰۰ محصول.</h2>
          <p className="muted">لیست بلندتر همیشه تصمیم بهتری نمی‌سازه.</p>
        </div>
        <div className="steps">
          {[
            [
              Search,
              "۰۱",
              "نیازت رو می‌فهمیم",
              "بودجه، استفاده و چیزهایی که برات مهمه.",
            ],
            [
              SlidersHorizontal,
              "۰۲",
              "گزینه‌ها رو می‌سنجیم",
              "اول محدودیت‌ها؛ بعد امتیاز هر گوشی برای تو.",
            ],
            [
              Scale,
              "۰۳",
              "با دلیل انتخاب می‌کنی",
              "مزیت‌ها، کوتاه‌آمدن‌ها و مقایسه کنار هم.",
            ],
          ].map(([Icon, n, title, copy]) => {
            const I = Icon as typeof Search;
            return (
              <article key={String(n)}>
                <div>
                  <I size={22} />
                  <span>{String(n)}</span>
                </div>
                <h3>{String(title)}</h3>
                <p>{String(copy)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <div className="trust">
        <Check size={16} /> دلیل هر پیشنهاد روشنه <span>·</span> اولویت‌ها همیشه
        قابل تغییرن <span>·</span> بدون نیاز به ثبت‌نام
      </div>
    </div>
  );
}
