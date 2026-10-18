"use client";
import { useState } from "react";
// Commit on blur so a network rerank never interrupts a multi-digit edit.
export function NumericField({
  value,
  onCommit,
  label,
  min = 0,
  max = 10000,
}: {
  value: number | undefined;
  onCommit: (n: number | undefined) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step="any"
      value={draft}
      placeholder="آزاد"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = draft === "" ? undefined : Number(draft);
        if (
          n !== value &&
          (n === undefined || (Number.isFinite(n) && n >= min && n <= max))
        )
          onCommit(n);
        else setDraft(value === undefined ? "" : String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
