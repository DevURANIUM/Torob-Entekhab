// Maps Torob search cards onto catalog variants. Pure functions, so the rules
// are unit-tested rather than trusted: a wrong match would show a wrong price.
import type { TorobCard } from "./types";

export type CardCondition = "new" | "stock" | "activated";

export type ParsedCard = {
  core: string;
  network: 4 | 5 | null;
  storageGb: number | null;
  ramGb: number | null;
  condition: CardCondition;
};

const faDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776));

const MAKERS = [
  "samsung",
  "apple",
  "xiaomi",
  "google",
  "honor",
  "nothing",
  "oneplus",
  "motorola",
  "moto",
];

/**
 * Lower-cased model name without maker, network suffix, punctuation or
 * spaces, so "Z Flip 6" and "Z Flip6" compare equal.
 */
export function coreName(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[()]/g, " ")
    .replace(/\b[45]g\b/g, " ")
    .replace(/\bdual sim\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ");
  for (const m of MAKERS) s = s.replace(new RegExp(`\\b${m}\\b`, "g"), " ");
  return s.replace(/\s+/g, "");
}

/** "Note 13 Pro 4G" and "Note 13 Pro 5G" are different phones. */
export function networkOf(name: string): 4 | 5 | null {
  return /\b5g\b/i.test(name) ? 5 : /\b4g\b/i.test(name) ? 4 : null;
}

const REGION = /\((vietnam|china|india|global|stock|active|not active)\)/gi;

/**
 * Torob titles every handset "گوشی …"; cases, chargers and screen guards
 * that mention a phone model never start that way.
 */
export function isPhoneListing(card: Pick<TorobCard, "name_fa">) {
  const fa = (card.name_fa ?? "").trim();
  return fa === "" || fa.startsWith("گوشی");
}

export function parseCard(card: Pick<TorobCard, "name_en" | "name_fa">) {
  const en = card.name_en;
  if (!en || !isPhoneListing(card)) return null;
  const lower = en.toLowerCase();
  const fa = card.name_fa ?? "";
  const condition: CardCondition =
    /\bstock\b|refurb|used/.test(lower) || /استوک|کارکرده/.test(fa)
      ? "stock"
      : /\bactive\b/.test(lower.replace(/not active/g, ""))
        ? "activated"
        : "new";
  const sizes = faDigits(en).match(/(\d+|1T)(?:\/(\d+))?\s*GB\s*$/i);
  const toGb = (v: string) => (/^1t$/i.test(v) ? 1024 : Number(v));
  const withoutSizes = sizes ? en.slice(0, sizes.index) : en;
  return {
    core: coreName(
      withoutSizes.replace(REGION, " ").replace(/not active/gi, " "),
    ),
    network: networkOf(withoutSizes),
    storageGb: sizes ? toGb(sizes[1]) : null,
    ramGb: sizes?.[2] ? Number(sizes[2]) : null,
    condition,
  } satisfies ParsedCard;
}

/** Torob's "در ۲۰۴ فروشگاه" means 204 sellers; a bare shop name means one. */
export function shopCount(shopName: string | null): number {
  if (!shopName) return 0;
  const m = faDigits(shopName).match(/(\d+)\s*فروشگاه/);
  return m ? Number(m[1]) : 1;
}

export type VariantKey = {
  brand: string;
  name: string;
  storageGb: number;
  ramGb: number | null;
};

/** Catalog core name as Torob writes it ("Poco X6 Pro" is sold as "Xiaomi Poco X6 Pro"). */
export function catalogCore(v: Pick<VariantKey, "brand" | "name">) {
  const prefix = ["Poco", "Redmi"].includes(v.brand) ? `${v.brand} ` : "";
  return coreName(`${prefix}${v.name}`);
}

/**
 * Cheapest available, new-condition card whose model, storage and RAM all
 * agree with the variant. Activated and used listings are never matched.
 */
export function matchVariant(
  variant: VariantKey,
  cards: TorobCard[],
): TorobCard | null {
  const core = catalogCore(variant);
  const network = networkOf(variant.name);
  const hits = cards.filter((c) => {
    const p = parseCard(c);
    return (
      p !== null &&
      c.available &&
      c.price_toman !== null &&
      p.condition === "new" &&
      p.core === core &&
      (network === null || p.network === null || p.network === network) &&
      p.storageGb === variant.storageGb &&
      (variant.ramGb === null || p.ramGb === null || p.ramGb === variant.ramGb)
    );
  });
  hits.sort(
    (a, b) =>
      shopCount(b.shop_name) - shopCount(a.shop_name) ||
      a.price_toman! - b.price_toman!,
  );
  // Prefer a listing many shops carry over a lone outlier price.
  const wellStocked = hits.filter((c) => shopCount(c.shop_name) >= 2);
  const pool = wellStocked.length ? wellStocked : hits;
  return pool.sort((a, b) => a.price_toman! - b.price_toman!)[0] ?? null;
}

/**
 * Finds a trustworthy product photo for a model without relaxing the much
 * stricter price-match rule above. A result can be a different storage or RAM
 * configuration, but it must still be a new, available listing of this exact
 * handset. This keeps product imagery complete while never attaching a price
 * from the wrong variant.
 */
export function matchModelImage(
  model: Pick<VariantKey, "brand" | "name">,
  cards: TorobCard[],
): TorobCard | null {
  const core = catalogCore(model);
  const hits = cards.filter((card) => {
    const parsed = parseCard(card);
    const hasExactPersianTitle =
      !card.name_en &&
      isPhoneListing(card) &&
      titleContainsModel(card.name_fa ?? "", model.name);
    return (
      card.available &&
      Boolean(card.image) &&
      ((parsed !== null &&
        parsed.condition === "new" &&
        parsed.core === core) ||
        hasExactPersianTitle)
    );
  });
  return (
    hits.sort(
      (a, b) =>
        shopCount(b.shop_name) - shopCount(a.shop_name) ||
        (a.price_toman ?? Number.MAX_SAFE_INTEGER) -
          (b.price_toman ?? Number.MAX_SAFE_INTEGER),
    )[0] ?? null
  );
}

/** Some Torob cards only have Persian titles, but embed the official English
 * model name. Match the whole model phrase so an S24 image cannot become an
 * S24 Ultra image merely because their prefixes overlap. */
function titleContainsModel(title: string, modelName: string) {
  const escaped = modelName
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "[\\s\u200c-]+");
  return new RegExp(
    `(?:^|[^a-z0-9])${escaped}(?=\\s*(?:$|حافظه|رم|ظرفیت|دو|بدون|مدل|5g|4g|[0-9۰-۹]))`,
    "i",
  ).test(title);
}

/** A Torob image URL resized by its own CDN (`…webp_/280x280.jpg`). */
export function resizedImage(url: string | null, size: number) {
  if (!url) return null;
  if (!/^https:\/\/image\.torob\.com\//.test(url)) return url;
  return `${url.replace(/_\/\d+x\d+\.jpg$/, "")}_/${size}x${size}.jpg`;
}
