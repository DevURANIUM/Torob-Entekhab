"use client";
import { SearchIntent, brands, keys, labels, number } from "@/lib/domain";
import { NumericField } from "./numeric-field";
const constraintLabels = {
  minStorage: "حداقل حافظه (گیگ)",
  minRam: "حداقل رم (گیگ)",
  minBattery: "حداقل باتری (mAh)",
  minScreenSize: "حداقل صفحه (اینچ)",
  maxScreenSize: "حداکثر صفحه (اینچ)",
  minCharging: "حداقل شارژ (وات)",
  newOnly: "فقط نو",
  maxWeight: "حداکثر وزن (گرم)",
  minSupportYears: "حداقل سال پشتیبانی",
  requires5G: "نسل پنجم",
  requiresNfc: "NFC",
};
const limits: Record<string, number> = {
  minStorage: 2048,
  minRam: 64,
  minBattery: 20000,
  minScreenSize: 10,
  maxScreenSize: 10,
  minCharging: 300,
  maxWeight: 1000,
  minSupportYears: 10,
};
const useLabels = {
  everyday: "روزمره",
  gaming: "بازی",
  photography: "عکاسی",
  elderly: "خانواده",
  student: "دانشجو",
  business: "کاری",
  long_term_use: "بلندمدت",
  social_media: "شبکه اجتماعی",
  content_creator: "تولید محتوا",
  travel: "سفر",
  battery_first: "باتری‌محور",
  compact: "جمع‌وجور",
};
export function IntentEditor({
  intent,
  onChange,
}: {
  intent: SearchIntent;
  onChange: (i: SearchIntent) => void;
}) {
  const update = (patch: Partial<SearchIntent>) =>
    onChange({ ...intent, ...patch });
  return (
    <section className="intent-panel">
      <div className="section-top">
        <h2>از حرفت این‌ها رو فهمیدم</h2>
        <span className="muted">هر کدوم رو خواستی تغییر بده</span>
      </div>
      {intent.warnings.map((w) => (
        <p className="notice" key={w}>
          {w}
        </p>
      ))}
      {intent.assumptions.map((a) => (
        <p className="notice" key={a}>
          {a}
        </p>
      ))}
      <div className="intent-chips">
        <label>
          نوع بودجه
          <select
            value={intent.budget?.kind ?? "hard"}
            onChange={(e) =>
              update({
                budget: {
                  ...intent.budget,
                  kind: e.target.value as "hard" | "soft",
                  flexibility: e.target.value === "soft" ? 0.1 : 0,
                },
              })
            }
          >
            <option value="hard">سقف قطعی</option>
            <option value="soft">حدودی؛ بررسی تا ۱۰٪ بیشتر</option>
          </select>
        </label>
        <label>
          بودجه تا (میلیون)
          <NumericField
            key={`max-${intent.budget?.max}`}
            label="بودجه تا (میلیون)"
            value={
              intent.budget?.max === undefined
                ? undefined
                : intent.budget.max / 1e6
            }
            onCommit={(v) =>
              update({
                budget: {
                  ...intent.budget,
                  max: v === undefined ? undefined : v * 1e6,
                },
              })
            }
          />
        </label>
        <label>
          برند
          <select
            value={intent.brands[0] ?? ""}
            onChange={(e) =>
              update({
                brands: e.target.value
                  ? [e.target.value as (typeof brands)[number]]
                  : [],
              })
            }
          >
            <option value="">همه برندها</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        {keys.map((k) => (
          <label key={k}>
            {labels[k]}
            <select
              aria-label={labels[k]}
              value={intent.priorities[k] ?? ""}
              onChange={(e) => {
                const priorities = { ...intent.priorities };
                if (e.target.value === "") delete priorities[k];
                else priorities[k] = Number(e.target.value);
                update({ priorities });
              }}
            >
              <option value="">مشخص نکردم</option>
              {[0.25, 1, 3, 4, 6].map((v, j) => (
                <option key={v} value={v}>
                  {["اولویت پایین", "معمولی", "مهم", "خیلی مهم", "مهم‌ترین"][j]}
                </option>
              ))}
              {intent.priorities[k] !== undefined &&
                ![0.25, 1, 3, 4, 6].includes(intent.priorities[k]!) && (
                  <option value={intent.priorities[k]}>
                    وزن {number(intent.priorities[k]!)}
                  </option>
                )}
            </select>
          </label>
        ))}
      </div>
      <div className="active-summary">
        {intent.recipient && (
          <span>
            برای{" "}
            {{ mother: "مادر", father: "پدر", self: "خودم" }[intent.recipient]}
          </span>
        )}
        {intent.useCases.map((u) => (
          <span key={u}>{useLabels[u]}</span>
        ))}
        {Object.entries(intent.constraints).map(([k, v]) => (
          <span key={k}>
            {constraintLabels[k as keyof typeof constraintLabels]}:{" "}
            {typeof v === "boolean" ? (v ? "الزامی" : "آزاد") : number(v)}
          </span>
        ))}
        {intent.excludedBrands.map((b) => (
          <span key={b}>به جز {b}</span>
        ))}
      </div>
      <details>
        <summary>سایر ترجیحات و محدودیت‌ها</summary>
        <div className="advanced-fields">
          <label>
            حداقل بودجه (میلیون)
            <NumericField
              key={`min-${intent.budget?.min}`}
              label="حداقل بودجه (میلیون)"
              value={
                intent.budget?.min === undefined
                  ? undefined
                  : intent.budget.min / 1e6
              }
              onCommit={(v) =>
                update({
                  budget: {
                    ...intent.budget,
                    min: v === undefined ? undefined : v * 1e6,
                  },
                })
              }
            />
          </label>
          <label>
            برای
            <select
              value={intent.recipient ?? ""}
              onChange={(e) =>
                update({
                  recipient: e.target.value
                    ? (e.target.value as SearchIntent["recipient"])
                    : undefined,
                })
              }
            >
              <option value="">مشخص نشده</option>
              <option value="mother">مادر</option>
              <option value="father">پدر</option>
              <option value="self">خودم</option>
            </select>
          </label>
          {Object.entries(intent.constraints).map(([key, value]) => {
            const k = key as keyof typeof constraintLabels;
            return (
              <div className="constraint-field" key={k}>
                <label>
                  {constraintLabels[k]}
                  {typeof value === "boolean" ? (
                    <select
                      value={String(value)}
                      onChange={(e) =>
                        update({
                          constraints: {
                            ...intent.constraints,
                            [k]: e.target.value === "true",
                          },
                        })
                      }
                    >
                      <option value="true">الزامی</option>
                      <option value="false">مهم نیست</option>
                    </select>
                  ) : (
                    <NumericField
                      key={`${k}-${value}`}
                      label={constraintLabels[k]}
                      value={value}
                      max={limits[k]}
                      min={k === "maxWeight" ? 1 : 0}
                      onCommit={(v) =>
                        update({
                          constraints: { ...intent.constraints, [k]: v },
                        })
                      }
                    />
                  )}
                </label>
                <button
                  aria-label={`حذف ${constraintLabels[k]}`}
                  onClick={() => {
                    const c = { ...intent.constraints };
                    delete c[k];
                    update({ constraints: c });
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <div className="inline">
          {(Object.keys(useLabels) as SearchIntent["useCases"]).map((x) => (
            <button
              aria-pressed={intent.useCases.includes(x)}
              key={x}
              onClick={() =>
                update({
                  useCases: intent.useCases.includes(x)
                    ? intent.useCases.filter((c) => c !== x)
                    : [...intent.useCases, x],
                })
              }
            >
              {intent.useCases.includes(x) ? "✓ " : ""}
              {useLabels[x]}
            </button>
          ))}
        </div>
        <div className="inline">
          {intent.brands.slice(1).map((x) => (
            <button
              key={x}
              onClick={() =>
                update({ brands: intent.brands.filter((b) => b !== x) })
              }
            >
              {x} ×
            </button>
          ))}
          {intent.excludedBrands.map((x) => (
            <button
              key={x}
              onClick={() =>
                update({
                  excludedBrands: intent.excludedBrands.filter((b) => b !== x),
                })
              }
            >
              به جز {x} ×
            </button>
          ))}
        </div>
      </details>
      <details>
        <summary>جزئیات برداشت AI</summary>
        <pre dir="ltr">{JSON.stringify(intent, null, 2)}</pre>
      </details>
    </section>
  );
}
