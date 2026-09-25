import { SearchIntent } from "../domain";
export function normalize(text: string): string {
  return text
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".")
    .replace(/\u200c/g, " ")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
export function numericWords(text: string) {
  let q = normalize(text);
  const words: Record<string, number> = {
    ده: 10,
    یازده: 11,
    دوازده: 12,
    سیزده: 13,
    چهارده: 14,
    پانزده: 15,
    شانزده: 16,
    هفده: 17,
    هجده: 18,
    نوزده: 19,
    بیست: 20,
    سی: 30,
    چهل: 40,
    پنجاه: 50,
    شصت: 60,
    هفتاد: 70,
    هشتاد: 80,
    نود: 90,
    صد: 100,
    یک: 1,
    دو: 2,
    سه: 3,
    چهار: 4,
    پنج: 5,
    شش: 6,
    هفت: 7,
    هشت: 8,
    نه: 9,
  };
  for (const [w, n] of Object.entries(words).sort(
    (a, b) => b[0].length - a[0].length,
  ))
    q = q.replace(new RegExp(`(^|\\s)${w}(?=\\s|$)`, "g"), `$1${n}`);
  q = q.replace(
    /\b(20|30|40|50|60|70|80|90|100)\s+و\s+(\d{1,2})\b/g,
    (_, a, b) => String(+a + +b),
  );
  return q;
}
export function parseBudget(text: string): SearchIntent["budget"] | undefined {
  const q = numericWords(text);
  const amount = (s: string) =>
    Number(s) < 1000 ? Number(s) * 1e6 : Number(s);
  const range = q.match(
    /(?:بین|از)?\s*(\d+(?:\.\d+)?)\s*(?:میلیون)?\s*(?:تا|[-–]|و)\s*(\d+(?:\.\d+)?)\s*(?:میلیون|تومن|تومان)?/,
  );
  const soft =
    /حدود|تقریبا|تقریباً|حدودا/.test(q) &&
    !/(?:نهایت|حداکثر|زیر|بیشتر نشه|سقف)/.test(q);
  if (range) {
    const a = amount(range[1]),
      b = amount(range[2]);
    return {
      min: Math.min(a, b),
      max: Math.max(a, b),
      target: Math.max(a, b),
      kind: "hard",
      flexibility: 0,
    };
  }
  const m =
    q.match(/(\d+(?:\.\d+)?)\s*(?:میلیون|تومن|تومان)/) ??
    q.match(
      /(?:بودجه(?: ام)?(?: رو ببر)?|تا|حدودا?|حداکثر|نهایت|زیر|سقف)\s*(\d+(?:\.\d+)?)(?!\d)(?!\s*(?:گرم|گیگ|سال|وات))/,
    );
  if (!m) return;
  const max = amount(m[1]);
  return {
    max,
    target: max,
    kind: soft ? "soft" : "hard",
    flexibility: soft ? 0.1 : 0,
  };
}
