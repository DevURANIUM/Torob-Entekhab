"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  KeyRound,
  Play,
  RotateCcw,
  Save,
} from "lucide-react";
import type { providerStatus } from "@/lib/ai/provider";
import type { ProviderId } from "@/lib/ai/providers/types";
import { claudeEfforts, type AiSettings } from "@/lib/ai/settings";
import { number } from "@/lib/domain";

type Status = ReturnType<typeof providerStatus>;
type ModelList = {
  models: { id: string; label?: string }[];
  live: boolean;
  error?: string;
};
type TestResult = {
  ok: boolean;
  model?: string;
  latency?: number;
  error?: string;
  cost?: number | null;
  usage?: { input: number; output: number };
  intent?: {
    budget: number | null;
    brands: string[];
    recipient: string | null;
  };
};

const effortLabels: Record<AiSettings["claudeEffort"], string> = {
  low: "کم (سریع و ارزان، پیشنهادی)",
  medium: "متوسط",
  high: "زیاد",
  xhigh: "خیلی زیاد",
  max: "حداکثر",
};

export function AiSettingsForm({
  initial,
  source,
  providers: initialProviders,
  locked,
  tokenRequired,
}: {
  initial: AiSettings;
  source: "saved" | "env";
  providers: Status;
  locked: boolean;
  tokenRequired: boolean;
}) {
  const [settings, setSettings] = useState<AiSettings>(initial);
  const [providers, setProviders] = useState(initialProviders);
  const [saved, setSaved] = useState(source);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [lists, setLists] = useState<Partial<Record<ProviderId, ModelList>>>(
    {},
  );
  const [tests, setTests] = useState<
    Partial<Record<ProviderId, TestResult | "running">>
  >({});

  const byId = Object.fromEntries(providers.map((p) => [p.id, p])) as Record<
    ProviderId,
    Status[number]
  >;
  // Every service appears in the list; the saved order comes first.
  const order: ProviderId[] = [
    ...new Set([...settings.order, ...providers.map((p) => p.id)]),
  ];

  useEffect(() => {
    // Without a key the API answers with built-in suggestions.
    for (const p of initialProviders)
      fetch(`/api/ai/models?provider=${p.id}`)
        .then((r) => r.json())
        .then((list: ModelList) => setLists((l) => ({ ...l, [p.id]: list })))
        .catch(() => undefined);
  }, [initialProviders]);

  const headers = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(token ? { "x-settings-token": token } : {}),
  });
  const update = (patch: Partial<AiSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setDirty(true);
    setMessage("");
  };
  const move = (id: ProviderId, delta: number) => {
    const next = [...order];
    const i = next.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update({ order: next });
  };

  async function send(method: "PUT" | "DELETE") {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/ai/settings", {
        method,
        headers: headers(),
        body:
          method === "PUT" ? JSON.stringify({ ...settings, order }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings(data.settings);
      setProviders(data.providers);
      setSaved(data.source);
      setDirty(false);
      setMessage(
        method === "PUT" ? "تنظیمات ذخیره شد." : "به تنظیمات فایل .env برگشت.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error && e.message ? e.message : "ذخیره ممکن نشد.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function test(id: ProviderId) {
    setTests((t) => ({ ...t, [id]: "running" }));
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          provider: id,
          model: settings.models[id] ?? "",
          claudeEffort: settings.claudeEffort,
        }),
      });
      const data = await res.json();
      setTests((t) => ({
        ...t,
        [id]: res.ok ? data : { ok: false, error: data.error },
      }));
    } catch {
      setTests((t) => ({
        ...t,
        [id]: { ok: false, error: "اتصال به سرور ممکن نشد." },
      }));
    }
  }

  const modes: { value: AiSettings["mode"]; label: string; note: string }[] = [
    { value: "auto", label: "خودکار", note: "به ترتیب فهرست پایین" },
    ...order.map((id) => ({
      value: id,
      label: byId[id].label,
      note: byId[id].configured ? byId[id].model : "کلید API تنظیم نشده",
    })),
    { value: "mock", label: "بدون هوش مصنوعی", note: "فقط استخراج قاعده‌محور" },
  ];

  return (
    <form
      className="ai-settings"
      onSubmit={(e) => {
        e.preventDefault();
        void send("PUT");
      }}
    >
      {locked && (
        <p className="notice">
          این سرور در حالت production است و AI_SETTINGS_TOKEN تنظیم نشده؛
          تنظیمات فقط خواندنی‌اند.
        </p>
      )}
      {tokenRequired && (
        <label className="field ai-settings__token">
          <span>رمز تنظیمات (AI_SETTINGS_TOKEN)</span>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
      )}

      <section className="panel" aria-labelledby="mode-title">
        <h2 id="mode-title">سرویس اصلی</h2>
        <p className="muted">
          {saved === "saved"
            ? "تنظیمات ذخیره‌شده در برنامه فعال است."
            : "هنوز چیزی ذخیره نشده؛ مقادیر از فایل .env خوانده می‌شوند."}
        </p>
        <div
          className="mode-grid"
          role="radiogroup"
          aria-labelledby="mode-title"
        >
          {modes.map((m) => (
            <label
              key={m.value}
              className={`mode-option${settings.mode === m.value ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="mode"
                value={m.value}
                checked={settings.mode === m.value}
                onChange={() => update({ mode: m.value })}
                disabled={locked}
              />
              <span className="mode-option__label">{m.label}</span>
              <bdi className="mode-option__note" dir="auto">
                {m.note}
              </bdi>
            </label>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="models-title">
        <h2 id="models-title">مدل هر سرویس و ترتیب جایگزینی</h2>
        <p className="muted">
          ترتیب این فهرست همان ترتیبی است که اگر سرویس اصلی جواب ندهد امتحان
          می‌شود. «امتحان» یک درخواست واقعی می‌فرستد و هزینه دارد.
        </p>
        <ol className="provider-list">
          {order.map((id, i) => {
            const p = byId[id];
            const list = lists[id];
            const result = tests[id];
            return (
              <li key={id} className="provider-card">
                <div className="provider-card__head">
                  <span className="provider-card__rank">{number(i + 1)}</span>
                  <h3>{p.label}</h3>
                  <span className={`badge${p.configured ? " badge--ok" : ""}`}>
                    <KeyRound size={13} aria-hidden="true" />
                    {p.configured ? "کلید تنظیم شده" : "بدون کلید"}
                  </span>
                  <div className="provider-card__order">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`بالا بردن ${p.label}`}
                      disabled={i === 0 || locked}
                      onClick={() => move(id, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`پایین بردن ${p.label}`}
                      disabled={i === order.length - 1 || locked}
                      onClick={() => move(id, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </div>
                {!p.configured && (
                  <p className="muted provider-card__key">
                    برای فعال شدن، <bdi dir="ltr">{p.keyEnv}</bdi> را در فایل{" "}
                    <bdi dir="ltr">.env</bdi> بگذار و سرور را دوباره اجرا کن.{" "}
                    <a href={p.keyUrl} target="_blank" rel="noreferrer">
                      گرفتن کلید
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </p>
                )}
                <div className="provider-card__fields">
                  <label className="field">
                    <span>مدل</span>
                    <input
                      dir="ltr"
                      list={`models-${id}`}
                      aria-label={`مدل ${p.label}`}
                      value={settings.models[id] ?? ""}
                      placeholder={p.defaultModel}
                      disabled={locked}
                      onChange={(e) =>
                        update({
                          models: { ...settings.models, [id]: e.target.value },
                        })
                      }
                    />
                    <datalist id={`models-${id}`}>
                      {(list?.models ?? []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label ?? m.id}
                        </option>
                      ))}
                    </datalist>
                    <small className="muted">
                      {list
                        ? list.live
                          ? `${number(list.models.length)} مدل از خود سرویس. خالی بگذاری، ${p.defaultModel} استفاده می‌شود.`
                          : `فهرست پیشنهادی (فهرست زنده خوانده نشد). پیش‌فرض: ${p.defaultModel}`
                        : `پیش‌فرض: ${p.defaultModel}`}
                    </small>
                  </label>
                  {id === "claude" && (
                    <label className="field">
                      <span>میزان فکر کردن (effort)</span>
                      <select
                        value={settings.claudeEffort}
                        disabled={locked}
                        onChange={(e) =>
                          update({
                            claudeEffort: e.target
                              .value as AiSettings["claudeEffort"],
                          })
                        }
                      >
                        {claudeEfforts.map((x) => (
                          <option key={x} value={x}>
                            {effortLabels[x]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    className="btn btn--soft"
                    disabled={!p.configured || result === "running" || locked}
                    onClick={() => void test(id)}
                  >
                    <Play size={15} aria-hidden="true" />
                    {result === "running" ? "در حال امتحان…" : "امتحان"}
                  </button>
                </div>
                {result && result !== "running" && (
                  <p
                    className={`test-result${result.ok ? " is-ok" : " is-error"}`}
                    role="status"
                  >
                    {result.ok ? (
                      <>
                        <Check size={15} aria-hidden="true" /> جواب داد با{" "}
                        <bdi dir="ltr">{result.model}</bdi> در{" "}
                        {number(result.latency)} میلی‌ثانیه؛ بودجه{" "}
                        {result.intent?.budget
                          ? `${number(result.intent.budget / 1e6)} میلیون`
                          : "نامشخص"}
                        ، برند {result.intent?.brands.join("، ") || "آزاد"}
                        {result.cost != null &&
                          `، هزینه حدود $${result.cost.toFixed(5)}`}
                      </>
                    ) : (
                      <>
                        خطا{result.model ? ` با ${result.model}` : ""}:{" "}
                        <bdi dir="auto">{result.error}</bdi>
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="ai-settings__actions">
        <button
          className="btn btn--primary btn--lg"
          disabled={busy || locked || !dirty}
        >
          <Save size={17} aria-hidden="true" />
          ذخیره تنظیمات
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy || locked || saved === "env"}
          onClick={() => void send("DELETE")}
        >
          <RotateCcw size={16} aria-hidden="true" />
          بازگشت به تنظیمات .env
        </button>
        <span role="status" className="ai-settings__message">
          {message || (dirty ? "تغییرها هنوز ذخیره نشده‌اند." : "")}
        </span>
      </div>
    </form>
  );
}
