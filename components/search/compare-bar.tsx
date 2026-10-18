"use client";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import { number } from "@/lib/domain";
import { track } from "@/lib/analytics";

export function CompareBar({
  ids,
  state,
  onClear,
}: {
  ids: string[];
  state: string;
  onClear: () => void;
}) {
  if (!ids.length) return null;
  return (
    <div className="compare-bar" role="region" aria-label="مقایسه">
      <Scale size={20} aria-hidden="true" />
      <span>{number(ids.length)} گوشی برای مقایسه</span>
      {ids.length >= 2 ? (
        <Link
          className="btn btn--primary"
          href={`/compare?ids=${ids.join(",")}&state=${state}`}
          onClick={() => track("comparison_started")}
        >
          مقایسه انتخاب‌ها
        </Link>
      ) : (
        <span className="compare-bar__hint">یک گوشی دیگر هم انتخاب کن</span>
      )}
      <button
        type="button"
        className="icon-btn"
        aria-label="پاک کردن مقایسه"
        onClick={onClear}
      >
        <X size={18} />
      </button>
    </div>
  );
}
