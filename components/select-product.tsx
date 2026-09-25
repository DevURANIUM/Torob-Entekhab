"use client";
import { useState } from "react";
import { track } from "@/lib/analytics";
export function SelectProduct({ id }: { id: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  return (
    <button
      className="primary"
      onClick={async () => {
        const ok = await track("product_selected", id);
        setSaved(ok);
        setError(!ok);
      }}
    >
      {saved
        ? "به انتخاب‌های من اضافه شد ✓"
        : error
          ? "ثبت نشد؛ دوباره تلاش کن"
          : "این گوشی رو انتخاب می‌کنم"}
    </button>
  );
}
