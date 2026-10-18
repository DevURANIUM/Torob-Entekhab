"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Scale,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { PhoneModel } from "@/lib/data/schema";
import { price } from "@/lib/domain";
import { PhoneImage } from "@/components/ui/phone-image";

export type HeroPhone = {
  name: string;
  price: number;
  model: Pick<PhoneModel, "image" | "brand">;
};

export const examples = [
  "بهترین گوشی تا ۲۰ میلیون برای استفاده روزمره",
  "برای بازی گوشی تا ۳۵ میلیون می‌خوام",
  "گوشی سامسونگ با باتری خوب تا ۳۰ میلیون",
  "برای پدرم گوشی ساده و بادوام می‌خوام",
  "حدود سی تومن؛ دوربین و شارژ سریع مهمه",
  "گوشی کوچیک میخوام، حداقل ۲۵۶ گیگ",
  "گوشی برای تولید محتوا میخوام",
];
const exampleTags = ["روزمره", "بازی", "باتری", "برای خانواده", "عکاسی"];

const steps = [
  [Search, "۰۱", "نیازت رو می‌فهمیم", "بودجه، استفاده و چیزهایی که برات مهمه."],
  [SlidersHorizontal, "۰۲", "گزینه‌ها رو می‌سنجیم", "اول محدودیت‌ها؛ بعد امتیاز هر گوشی برای تو."],
  [Scale, "۰۳", "با دلیل انتخاب می‌کنی", "مزیت‌ها، کوتاه‌آمدن‌ها و مقایسه کنار هم."],
] as const;

export default function Home({ phones }: { phones: HeroPhone[] }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const submit = (q: string) => {
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q)}`);
  };
  return (
    <div className="home">
      <section className="hero wrap">
        <div className="hero__copy">
          <p className="eyebrow">
            <Smartphone size={15} aria-hidden="true" /> فقط گوشی موبایل؛ با دقت بیشتر
          </p>
          <h1 className="hero__title">
            بگو چی <span>لازم داری،</span>
            <br />
            نه اینکه اسم محصول رو بدونی.
          </h1>
          <p className="hero__lede">
            نیازت رو به زبان خودت بگو؛ بین گزینه‌ها می‌گردیم، تفاوت‌ها رو می‌سنجیم
            <br className="desktop" /> و چند انتخاب مناسب رو با دلیل پیشنهاد
            می‌کنیم.
          </p>
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
          >
            <div className="composer__label">
              <Sparkles size={19} aria-hidden="true" />
              <label htmlFor="need">چه گوشی‌ای به زندگی تو می‌خوره؟</label>
            </div>
            <textarea
              id="need"
              maxLength={1000}
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(query);
                }
              }}
              required
              placeholder="مثلاً: برای خودم گوشی تا ۲۵ میلیون می‌خوام، باتری و صفحه‌نمایش مهمه و دوربین خیلی مهم نیست…"
            />
            <div className="composer__foot">
              <span className="composer__hint">
                <kbd>↵</kbd> با نیازت شروع کن، نه با مدل گوشی
              </span>
              <button className="btn btn--primary btn--lg" type="submit">
                پیشنهاد بده <ArrowLeft size={19} aria-hidden="true" />
              </button>
            </div>
          </form>
          <div className="examples">
            <span className="muted">از این‌ها ایده بگیر</span>
            {examples.map((example, i) => (
              <button
                key={example}
                type="button"
                className="example"
                onClick={() => setQuery(example)}
              >
                {exampleTags[i] && <span className="example__tag">{exampleTags[i]}</span>}
                {example}
              </button>
            ))}
          </div>
        </div>
        {phones.length > 0 && (
          <div className="hero__phones" aria-hidden="true">
            {phones.map((p, i) => (
              <figure key={p.name} className={`fan fan--${i}`}>
                <PhoneImage model={p.model} name={p.name} size="md" />
                <figcaption>
                  <bdi dir="ltr">{p.name}</bdi>
                  <span>{price(p.price)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="how wrap">
        <div className="how-heading">
          <span className="eyebrow">کمتر بگرد، بهتر انتخاب کن</span>
          <h2>۳ انتخاب، نه ۳۰۰ محصول.</h2>
          <p className="muted">لیست بلندتر همیشه تصمیم بهتری نمی‌سازه.</p>
        </div>
        <div className="steps">
          {steps.map(([Icon, n, title, copy]) => (
            <article key={n}>
              <div>
                <Icon size={22} aria-hidden="true" />
                <span>{n}</span>
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="trust wrap">
        <Check size={16} aria-hidden="true" /> دلیل هر پیشنهاد روشنه <span>·</span> اولویت‌ها
        همیشه قابل تغییرن <span>·</span> بدون نیاز به ثبت‌نام
      </div>
    </div>
  );
}
