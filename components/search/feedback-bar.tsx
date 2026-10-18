"use client";
import { useState } from "react";
import { track } from "@/lib/analytics";

const reasons = [
  "قیمت",
  "برند",
  "مشخصات",
  "اولویت‌بندی",
  "پیشنهادها نامرتبط بودن",
  "سایر",
];

export function FeedbackBar({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const [sent, setSent] = useState(false);
  const [negative, setNegative] = useState(false);
  const send = async (value: string) => {
    const ok = await track("feedback", value);
    setSent(ok);
    if (!ok) onError("ثبت بازخورد ممکن نشد؛ دوباره تلاش کن.");
  };
  return (
    <section className="feedback" aria-live="polite">
      <span>
        {sent ? "ممنون؛ بازخوردت ثبت شد." : "این پیشنهاد به دردت خورد؟"}
      </span>
      {!sent && (
        <div className="feedback__actions">
          <button
            type="button"
            className="btn btn--soft"
            onClick={() => send("positive")}
          >
            آره
          </button>
          <button
            type="button"
            className="btn btn--soft"
            aria-expanded={negative}
            onClick={() => setNegative(true)}
          >
            نه خیلی
          </button>
        </div>
      )}
      {!sent && negative && (
        <div className="feedback__reasons">
          <span className="muted">چی درست نبود؟</span>
          {reasons.map((x) => (
            <button
              type="button"
              className="toggle"
              key={x}
              onClick={() => send(x)}
            >
              {x}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
