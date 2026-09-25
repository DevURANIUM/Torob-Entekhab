import { z } from "zod";
export const brands = [
  "Samsung",
  "Xiaomi",
  "Apple",
  "Nothing",
  "Motorola",
  "Honor",
  "Redmi",
  "Poco",
  "Google",
  "OnePlus",
] as const;
export const keys = [
  "battery",
  "camera",
  "performance",
  "display",
  "longevity",
  "portability",
  "value",
  "charging",
  "storage",
  "connectivity",
  "simplicity",
] as const;
export type Priority = (typeof keys)[number];
export const labels: Record<Priority, string> = {
  battery: "باتری",
  camera: "دوربین",
  performance: "عملکرد",
  display: "نمایشگر",
  longevity: "دوام نرم‌افزاری",
  portability: "سبکی",
  value: "ارزش خرید",
  charging: "سرعت شارژ",
  storage: "حافظه",
  connectivity: "ارتباطات",
  simplicity: "سادگی نرم‌افزار",
};
const weight = z.number().min(0).max(10);
export const intentSchema = z.object({
  query: z.string().max(1000),
  budget: z
    .object({
      min: z.number().min(0).max(1e10).optional(),
      max: z.number().min(0).max(1e10).optional(),
      target: z.number().positive().max(1e10).optional(),
      flexibility: z.number().min(0).max(0.3).optional(),
      kind: z.enum(["hard", "soft"]).optional(),
    })
    .optional(),
  brands: z.array(z.enum(brands)).max(10).default([]),
  excludedBrands: z.array(z.enum(brands)).max(10).default([]),
  assumptions: z.array(z.string().max(250)).max(10).default([]),
  warnings: z.array(z.string().max(250)).max(10).default([]),
  action: z.enum(["refine", "save", "compare_first_two"]).default("refine"),
  recipient: z.enum(["mother", "father", "self"]).optional(),
  useCases: z
    .array(
      z.enum([
        "everyday",
        "gaming",
        "photography",
        "elderly",
        "student",
        "business",
        "long_term_use",
        "social_media",
        "content_creator",
        "travel",
        "battery_first",
        "compact",
      ]),
    )
    .max(12)
    .default([]),
  priorities: z
    .object({
      battery: weight.optional(),
      camera: weight.optional(),
      performance: weight.optional(),
      display: weight.optional(),
      longevity: weight.optional(),
      portability: weight.optional(),
      value: weight.optional(),
      charging: weight.optional(),
      storage: weight.optional(),
      connectivity: weight.optional(),
      simplicity: weight.optional(),
    })
    .default({}),
  constraints: z
    .object({
      minStorage: z.number().min(0).max(2048).optional(),
      minRam: z.number().min(0).max(64).optional(),
      minBattery: z.number().min(0).max(20000).optional(),
      minScreenSize: z.number().min(0).max(10).optional(),
      maxScreenSize: z.number().min(0).max(10).optional(),
      maxWeight: z.number().min(1).max(1000).optional(),
      requires5G: z.boolean().optional(),
      requiresNfc: z.boolean().optional(),
      minSupportYears: z.number().min(0).max(10).optional(),
      minCharging: z.number().min(0).max(300).optional(),
      newOnly: z.boolean().optional(),
    })
    .default({}),
});
export type SearchIntent = z.infer<typeof intentSchema>;
export type Phone = {
  modelData: import("./data/schema").PhoneModel;
  variant: import("./data/schema").PhoneVariant;
  priceSnapshot: import("./data/schema").PriceSnapshot;
  intelligence: import("./intelligence/features").ProductFeatures;
  id: string;
  slug: string;
  brand: (typeof brands)[number];
  model: string;
  displayName: string;
  price: number;
  originalPrice: number;
  releaseYear: number | null;
  storage: number;
  ram: number | null;
  screenSize: number | null;
  screenType: string | null;
  refreshRate: number | null;
  resolution: string | null;
  battery: number | null;
  charging: number | null;
  chipset: string | null;
  cpuTier: number;
  gpuTier: number;
  cameraMp: number | null;
  ultrawide: boolean | null;
  telephoto: boolean | null;
  scores: Record<Priority, number>;
  buildScore: number;
  weight: number | null;
  dimensions: string | null;
  has5G: boolean | null;
  hasNfc: boolean | null;
  dualSim: boolean | null;
  os: string | null;
  supportYears: number | null;
  warranty: string;
  available: boolean;
  pros: string[];
  cons: string[];
  tags: string[];
  useCases: Record<SearchIntent["useCases"][number], number>;
};
export const number = (n: number | null | undefined) =>
  n == null
    ? "نامشخص"
    : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(n);
export const price = (n: number) => `${number(n)} تومان`;
