"use client";
import { SlidersHorizontal, X } from "lucide-react";
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
const levels = [0.25, 1, 3, 4, 6];
const levelLabels = ["اولویت پایین", "معمولی", "مهم", "خیلی مهم", "مهم‌ترین"];
const levelOf = (v: number) =>
  levelLabels[levels.indexOf(v)] ?? `وزن ${number(v)}`;
const recipients = { mother: "مادر", father: "پدر", self: "خودم" };

export function IntentEditor({
  intent,
  onChange,
}: {
  intent: SearchIntent;
  onChange: (i: SearchIntent) => void;
}) {
  const update = (patch: Partial<SearchIntent>) =>
    onChange({ ...intent, ...patch });
  const setPriority = (k: (typeof keys)[number], v: number | undefined) => {
    const priorities = { ...intent.priorities };
    if (v === undefined) delete priorities[k];
    else priorities[k] = v;
    update({ priorities });
  };
  const removeConstraint = (k: string) => {
    const c = { ...intent.constraints } as Record<string, unknown>;
    delete c[k];
    update({ constraints: c as SearchIntent["constraints"] });
  };
  const activePriorities = keys.filter(
    (k) => intent.priorities[k] !== undefined,
  );

  return (
    <section className="intent" aria-labelledby="intent-title">
      <div className="intent__head">
        <h2 id="intent-title">از حرفت این‌ها رو فهمیدم</h2>
        <p className="muted">هر کدوم رو خواستی تغییر بده</p>
      </div>
      {[...intent.warnings, ...intent.assumptions].map((w) => (
        <p className="notice" key={w}>
          {w}
        </p>
      ))}
      <div className="intent__main">
        <label className="field">
          <span>بودجه تا (میلیون)</span>
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
        <label className="field">
          <span>نوع بودجه</span>
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
        <label className="field">
          <span>برند</span>
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
      </div>

      <ul className="chips" aria-label="برداشت فعلی">
        {intent.recipient && (
          <li className="chip">
            برای {recipients[intent.recipient]}
            <button
              type="button"
              aria-label="حذف گیرنده"
              onClick={() => update({ recipient: undefined })}
            >
              <X size={13} />
            </button>
          </li>
        )}
        {intent.useCases.map((u) => (
          <li className="chip" key={u}>
            {useLabels[u]}
            <button
              type="button"
              aria-label={`حذف ${useLabels[u]}`}
              onClick={() =>
                update({ useCases: intent.useCases.filter((c) => c !== u) })
              }
            >
              <X size={13} />
            </button>
          </li>
        ))}
        {activePriorities.map((k) => (
          <li className="chip chip--priority" key={k}>
            {labels[k]}: {levelOf(intent.priorities[k]!)}
            <button
              type="button"
              aria-label={`حذف اولویت ${labels[k]}`}
              onClick={() => setPriority(k, undefined)}
            >
              <X size={13} />
            </button>
          </li>
        ))}
        {Object.entries(intent.constraints).map(([k, v]) => (
          <li className="chip" key={k}>
            {constraintLabels[k as keyof typeof constraintLabels]}:{" "}
            {typeof v === "boolean" ? (v ? "الزامی" : "آزاد") : number(v)}
            <button
              type="button"
              aria-label={`حذف ${constraintLabels[k as keyof typeof constraintLabels]}`}
              onClick={() => removeConstraint(k)}
            >
              <X size={13} />
            </button>
          </li>
        ))}
        {intent.brands.slice(1).map((b) => (
          <li className="chip" key={b}>
            {b}
            <button
              type="button"
              aria-label={`حذف ${b}`}
              onClick={() =>
                update({ brands: intent.brands.filter((x) => x !== b) })
              }
            >
              <X size={13} />
            </button>
          </li>
        ))}
        {intent.excludedBrands.map((b) => (
          <li className="chip chip--exclude" key={b}>
            به جز {b}
            <button
              type="button"
              aria-label={`حذف به جز ${b}`}
              onClick={() =>
                update({
                  excludedBrands: intent.excludedBrands.filter((x) => x !== b),
                })
              }
            >
              <X size={13} />
            </button>
          </li>
        ))}
        {!intent.recipient &&
          !intent.useCases.length &&
          !activePriorities.length &&
          !Object.keys(intent.constraints).length && (
            <li className="chip chip--empty">اولویتی مشخص نکردی</li>
          )}
      </ul>

      <details className="intent__more">
        <summary>
          <SlidersHorizontal size={16} aria-hidden="true" />
          سایر ترجیحات و محدودیت‌ها
        </summary>
        <h3>چقدر برات مهمه؟</h3>
        <div className="priority-grid">
          {keys.map((k) => (
            <label className="field" key={k}>
              <span>{labels[k]}</span>
              <select
                aria-label={labels[k]}
                value={intent.priorities[k] ?? ""}
                onChange={(e) =>
                  setPriority(
                    k,
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              >
                <option value="">مشخص نکردم</option>
                {levels.map((v, j) => (
                  <option key={v} value={v}>
                    {levelLabels[j]}
                  </option>
                ))}
                {intent.priorities[k] !== undefined &&
                  !levels.includes(intent.priorities[k]!) && (
                    <option value={intent.priorities[k]}>
                      وزن {number(intent.priorities[k]!)}
                    </option>
                  )}
              </select>
            </label>
          ))}
        </div>
        <h3>برای چه کاری؟</h3>
        <div className="toggle-row">
          {(Object.keys(useLabels) as SearchIntent["useCases"]).map((x) => (
            <button
              type="button"
              className="toggle"
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
              {useLabels[x]}
            </button>
          ))}
        </div>
        <h3>بودجه و گیرنده</h3>
        <div className="priority-grid">
          <label className="field">
            <span>حداقل بودجه (میلیون)</span>
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
          <label className="field">
            <span>برای</span>
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
              <label className="field" key={k}>
                <span>{constraintLabels[k]}</span>
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
                      update({ constraints: { ...intent.constraints, [k]: v } })
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
        <details className="raw">
          <summary>جزئیات برداشت AI</summary>
          <pre dir="ltr">{JSON.stringify(intent, null, 2)}</pre>
        </details>
      </details>
    </section>
  );
}
