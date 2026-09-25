import { PhoneModel, PhoneVariant, Facts } from "../data/schema";
import { Priority, keys } from "../domain";
export const FEATURE_VERSION = "hardware-heuristics-v2.0";
export const AS_OF = "2026-09-25";
const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
// Ordinal engineering tiers, NOT measured benchmarks. Exact chipset lookup avoids RAM-as-performance.
export const chipsetTiers: Record<string, number> = {
  "Helio G91-Ultra": 30,
  "Dimensity 6100+": 42,
  "Exynos 1280": 48,
  "Exynos 1380": 57,
  "Exynos 1480": 65,
  "Exynos 1580": 74,
  "Snapdragon 6 Gen 3": 56,
  "Exynos 2200": 74,
  "Exynos 2400": 89,
  "Exynos 2400e": 85,
  "Snapdragon 8 Gen 3 for Galaxy": 94,
  "Snapdragon 7s Gen 2": 55,
  "Dimensity 8300-Ultra": 84,
  "Snapdragon 8s Gen 3": 87,
  "Snapdragon 8 Gen 2": 89,
  "Dimensity 8200-Ultra": 74,
  "Dimensity 9200+": 91,
  "Snapdragon 8 Gen 3": 94,
  "Dimensity 7200-Ultra": 63,
  "Dimensity 7300-Ultra": 65,
  "Snapdragon 7 Gen 1 Accelerated Edition": 62,
  "Snapdragon 7 Gen 3": 72,
  "Snapdragon 8+ Gen 1": 83,
  "Dimensity 7200 Pro": 64,
  "Snapdragon 7s Gen 3": 67,
  "Snapdragon 7 Plus Gen 3": 82,
  "Snapdragon 8 Elite": 99,
  "Dimensity 7030": 50,
  "Google Tensor G3": 75,
  "Google Tensor G4": 79,
  "A15 Bionic": 81,
  "A16 Bionic": 87,
  "A17 Pro": 93,
  A18: 95,
  "A18 Pro": 99,
};
export type Feature = {
  value: number;
  coverage: number;
  basis: string;
  fields: (keyof Facts)[];
  kind: "derived";
  confidence: "low" | "medium";
};
export type ProductFeatures = {
  version: string;
  asOf: string;
  features: Record<Priority, Feature>;
  coverage: number;
  remainingSecurityYears: number | null;
  warnings: string[];
};
export function deriveFeatures(
  model: PhoneModel,
  v: PhoneVariant,
  price: number,
): ProductFeatures {
  const f = model.facts;
  const features = {} as Record<Priority, Feature>;
  const remaining =
    f.securityYears !== null && f.supportStartYear !== null
      ? Math.max(0, f.supportStartYear + f.securityYears - (2026 + 267 / 365))
      : null;
  const put = (
    k: Priority,
    value: number,
    fields: (keyof Facts)[],
    basis: string,
    coverage?: number,
  ) => {
    const c =
      coverage ?? fields.filter((x) => f[x] !== null).length / fields.length;
    features[k] = {
      value: clamp(value),
      coverage: c,
      basis,
      fields,
      kind: "derived",
      confidence: c >= 0.7 ? "medium" : "low",
    };
  };
  put(
    "performance",
    (chipsetTiers[f.chipset ?? ""] ?? 40) * 0.9 +
      (Math.min(v.ramGb ?? 6, 12) / 12) * 10,
    ["chipset"],
    "۹۰٪ رده مهندسی تراشه + حداکثر ۱۰٪ ظرفیت رم؛ بنچمارک یا تست حرارتی نیست.",
    f.chipset && chipsetTiers[f.chipset] !== undefined ? 1 : 0,
  );
  put(
    "battery",
    45 +
      ((f.batteryMah ?? 3500) - 3500) / 60 +
      (f.nodeNm !== null && f.nodeNm <= 4 ? 5 : 0) -
      (f.screenSizeInches !== null && f.screenSizeInches > 6.7 ? 3 : 0),
    ["batteryMah", "nodeNm", "screenSizeInches"],
    "ظرفیت، فرایند تراشه و اندازه صفحه؛ تخمین سخت‌افزاری، نه ساعت شارژدهی.",
  );
  put(
    "camera",
    35 +
      (f.ois ? 20 : 0) +
      (f.ultrawideMp !== null ? 10 : 0) +
      (f.telephotoMp !== null ? 15 : 0) +
      (f.rearVideo?.includes("4K") ? 12 : 0) +
      (f.frontVideo?.includes("4K") ? 8 : 0),
    ["ois", "ultrawideMp", "telephotoMp", "rearVideo", "frontVideo"],
    "لرزش‌گیر، تنوع لنز و ویدیو؛ تعداد مگاپیکسل امتیاز کیفیت عکس نیست.",
  );
  put(
    "display",
    40 +
      (/OLED/i.test(f.panel ?? "") ? 20 : 0) +
      Math.min(25, ((f.refreshRateHz ?? 60) - 60) / 3) +
      (f.pixelDensity !== null && f.pixelDensity >= 400 ? 8 : 0) +
      (f.hdr ? 7 : 0),
    ["panel", "refreshRateHz", "pixelDensity", "hdr"],
    "نوع پنل، نوسازی، تراکم و HDR؛ روشنایی تبلیغاتی معیار اصلی نیست.",
  );
  put(
    "charging",
    f.wiredChargingW === null
      ? 35
      : 25 +
          Math.min(65, f.wiredChargingW * 0.6) +
          (f.wirelessChargingW ? 10 : 0),
    ["wiredChargingW", "wirelessChargingW"],
    "توان اعلام‌شده با سقف سود؛ زمان شارژ واقعی ادعا نشده.",
  );
  put(
    "portability",
    f.weightGrams === null
      ? 40
      : 95 -
          (f.weightGrams - 150) * 0.55 -
          Math.max(0, (f.screenSizeInches ?? 6.5) - 6.2) * 15,
    ["weightGrams", "screenSizeInches"],
    "وزن و اندازه نمایشگر؛ ارگونومی واقعی اندازه‌گیری نشده.",
  );
  put(
    "storage",
    30 +
      Math.min(55, Math.log2(v.storageGb / 64) * 18) +
      (v.ramGb === null ? 0 : Math.min(15, v.ramGb)),
    [],
    "ظرفیت واقعی نسخه؛ حافظه مجازی به‌عنوان RAM شمرده نمی‌شود.",
    v.ramGb === null ? 0.5 : 1,
  );
  put(
    "connectivity",
    30 +
      (f.has5G ? 20 : 0) +
      (f.nfc ? 15 : 0) +
      (f.esim ? 15 : 0) +
      (f.wifi && parseInt(f.wifi) >= 6 ? 20 : 0),
    ["has5G", "nfc", "esim", "wifi"],
    "قابلیت‌های مستند شبکه؛ سازگاری اپراتور و رجیستری جداگانه بررسی شود.",
  );
  put(
    "simplicity",
    50,
    [],
    "سهولت استفاده سنجیده نشده؛ امتیاز خنثی برای همه، بدون فرض بر اساس برند.",
    0,
  );
  put(
    "longevity",
    (remaining === null ? 30 : Math.min(65, 20 + remaining * 10)) +
      features.performance.value * 0.15 +
      features.storage.value * 0.15 +
      (/IP6[78]/.test(f.ipRating ?? "") ? 5 : 0),
    ["securityYears", "supportStartYear", "chipset", "ipRating"],
    "پشتیبانی امنیتی باقی‌مانده از شروع تعهد، توان تراشه، حافظه و مقاومت IP مستند؛ عمر دقیق دستگاه نیست.",
    remaining === null ? 0.2 : 0.85,
  );
  put(
    "value",
    (features.performance.value +
      features.camera.value +
      features.battery.value) /
      3 -
      Math.max(0, price / 1e6 - 15) * 0.35 +
      20,
    [],
    "سود سخت‌افزاری نسبت به قیمت نمونه؛ قیمت واقعی بازار نیست.",
    0.5,
  );
  return {
    version: FEATURE_VERSION,
    asOf: AS_OF,
    features,
    remainingSecurityYears:
      remaining === null ? null : Math.round(remaining * 10) / 10,
    coverage: keys.reduce((s, k) => s + features[k].coverage, 0) / keys.length,
    warnings: [
      "امتیازها تخمین شفاف سخت‌افزاری‌اند؛ تست مستقل دوربین، گرما، تعمیرپذیری و شارژدهی ثبت نشده.",
      ...(remaining === null
        ? [
            "پشتیبانی باقی‌مانده قابل محاسبه نیست؛ تاریخ شروع یا تعهد معتبر ثبت نشده.",
          ]
        : []),
    ],
  };
}

export const deriveProductFeatures = deriveFeatures;
