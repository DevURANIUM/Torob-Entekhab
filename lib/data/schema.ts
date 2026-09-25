import { z } from "zod";
import { brands } from "../domain";
const num = (min: number, max: number) =>
  z.number().finite().min(min).max(max).nullable().default(null);
const text = z.string().min(1).max(500).nullable().default(null);
const bool = z.boolean().nullable().default(null);
export const factsSchema = z
  .object({
    dimensions: text,
    weightGrams: num(100, 350),
    materials: text,
    ipRating: text,
    screenSizeInches: num(4, 8.5),
    panel: text,
    resolution: text,
    pixelDensity: num(150, 700),
    refreshRateHz: num(30, 240),
    peakBrightnessNits: num(100, 7000),
    hdr: text,
    protection: text,
    chipset: text,
    nodeNm: num(2, 16),
    cpu: text,
    gpu: text,
    storageTechnology: text,
    expandableStorage: bool,
    launchOs: text,
    majorUpgrades: num(0, 10),
    securityYears: num(0, 10),
    supportStartYear: num(2018, 2030),
    mainCameraMp: num(8, 250),
    mainAperture: num(1, 4),
    ois: bool,
    ultrawideMp: num(2, 60),
    telephotoMp: num(2, 250),
    opticalZoom: num(1, 10),
    macroMp: num(2, 10),
    rearVideo: text,
    frontCameraMp: num(5, 60),
    frontVideo: text,
    batteryMah: num(2000, 8000),
    wiredChargingW: num(5, 250),
    wirelessChargingW: num(0, 100),
    reverseCharging: bool,
    chargerInBox: bool,
    has5G: bool,
    wifi: text,
    bluetooth: text,
    nfc: bool,
    usb: text,
    esim: bool,
    sim: text,
    stereo: bool,
    headphoneJack: bool,
    fingerprint: text,
    faceUnlock: bool,
    colors: text,
    notableFeatures: text,
    measuredBatteryHours: num(1, 100),
    measuredThermalScore: num(0, 100),
    reviewCameraScore: num(0, 100),
    repairabilityScore: num(0, 100),
  })
  .strict();
export type Facts = z.infer<typeof factsSchema>;
export const provenanceSchema = z
  .object({
    source: z.enum(["manufacturer", "review", "specification-reference"]),
    sourceUrl: z.url().startsWith("https://"),
    verifiedAt: z.iso.datetime(),
    confidence: z.enum(["high", "medium", "low"]),
    note: z.string().max(600),
  })
  .strict();
export type Provenance = z.infer<typeof provenanceSchema>;
export const phoneModelSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    manufacturer: z.string(),
    brand: z.enum(brands),
    family: z.string(),
    name: z.string(),
    year: num(2018, 2030),
    announcedAt: z.iso.date().nullable(),
    releasedAt: z.iso.date().nullable(),
    marketStatus: z.enum(["documented", "discontinued", "announced"]),
    region: z.string(),
    facts: factsSchema,
    provenance: z.record(z.string(), provenanceSchema),
    image: z
      .object({
        primary: z.string().nullable(),
        alternate: z.string().nullable(),
        fallback: z.enum(["slab", "fold", "flip"]),
        license: z.string().nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((m, ctx) => {
    for (const [k, v] of Object.entries(m.facts)) {
      if (v !== null && !m.provenance[k])
        ctx.addIssue({
          code: "custom",
          message: `Missing provenance for ${m.id}.${k}`,
        });
    }
    for (const k of Object.keys(m.provenance))
      if (!(k in m.facts) && !["identity", "variants", "year"].includes(k))
        ctx.addIssue({
          code: "custom",
          message: `Unknown provenance field ${k}`,
        });
  });
export const phoneVariantSchema = z
  .object({
    id: z.string(),
    modelId: z.string(),
    storageGb: z.union([
      z.literal(64),
      z.literal(128),
      z.literal(256),
      z.literal(512),
      z.literal(1024),
    ]),
    ramGb: z
      .union([
        z.literal(4),
        z.literal(6),
        z.literal(8),
        z.literal(12),
        z.literal(16),
        z.literal(24),
      ])
      .nullable(),
    condition: z.enum(["new", "used"]),
    region: z.string(),
    source: provenanceSchema,
  })
  .strict();
export const priceSnapshotSchema = z
  .object({
    id: z.string(),
    variantId: z.string(),
    amount: z.number().int().positive().max(1e10),
    currency: z.literal("TOMAN"),
    source: z.string(),
    observedAt: z.iso.datetime(),
    isDemo: z.boolean(),
  })
  .strict();
export type PhoneModel = z.infer<typeof phoneModelSchema>;
export type PhoneVariant = z.infer<typeof phoneVariantSchema>;
export type PriceSnapshot = z.infer<typeof priceSnapshotSchema>;
export function validateDataset(input: {
  models: unknown[];
  variants: unknown[];
  prices: unknown[];
}) {
  const models = input.models.map((m) => phoneModelSchema.parse(m));
  const variants = input.variants.map((v) => phoneVariantSchema.parse(v));
  const prices = input.prices.map((p) => priceSnapshotSchema.parse(p));
  for (const rows of [models, variants, prices])
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error("Duplicate catalog identity");
  const pairs = variants.map(
    (v) => `${v.modelId}:${v.ramGb}:${v.storageGb}:${v.region}:${v.condition}`,
  );
  if (new Set(pairs).size !== pairs.length)
    throw new Error("Duplicate RAM/storage/region combination");
  const modelIds = new Set(models.map((m) => m.id));
  const variantIds = new Set(variants.map((v) => v.id));
  for (const v of variants)
    if (!modelIds.has(v.modelId)) throw new Error(`Orphan variant ${v.id}`);
  for (const p of prices)
    if (!variantIds.has(p.variantId)) throw new Error(`Orphan price ${p.id}`);
  for (const v of variants)
    if (!prices.some((p) => p.variantId === v.id))
      throw new Error(`Missing price ${v.id}`);
  return { models, variants, prices };
}
