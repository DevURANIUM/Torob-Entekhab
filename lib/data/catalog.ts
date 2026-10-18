import { Phone, keys, Priority } from "../domain";
import {
  PhoneModel,
  PhoneVariant,
  PriceSnapshot,
  validateDataset,
} from "./schema";
import { deriveFeatures } from "../intelligence/features";
import { profiles } from "../intelligence/profiles";
import data from "./catalog-data.json";
import snapshotData from "./torob-snapshot.json";
import { TorobSnapshot, torobSnapshotSchema } from "../torob/snapshot";
type Dataset = ReturnType<typeof validateDataset>;
/** Which price layer ranks the catalog: live Torob listings or fixed demo prices. */
export type PriceSource = "torob" | "demo";
export const dataset = validateDataset(data);
export const torobSnapshot = torobSnapshotSchema.parse(snapshotData);
/** Torob prices unless PRICE_SOURCE=demo or no snapshot has been synced yet. */
export const priceSource = (): PriceSource =>
  process.env.PRICE_SOURCE === "demo" ||
  Object.keys(torobSnapshot.variants).length === 0
    ? "demo"
    : "torob";
/**
 * Adds Torob listings as non-demo price snapshots and Torob product photos as
 * model images. Idempotent, so it can run over rows already seeded from it.
 */
export function withTorobPrices(d: Dataset, s: TorobSnapshot): Dataset {
  // Keyed by fetch time, so a same-day refresh is newer than rows already seeded.
  const stamp = s.fetchedAt.replace(/\D/g, "").slice(0, 14);
  const prices = Object.entries(s.variants)
    .filter(([variantId]) => d.variants.some((v) => v.id === variantId))
    .map(
      ([variantId, listing]): PriceSnapshot => ({
        id: `${variantId}-torob-${stamp}`,
        variantId,
        amount: listing.priceToman,
        currency: "TOMAN",
        source: "ترب",
        observedAt: s.fetchedAt,
        isDemo: false,
        listing,
      }),
    );
  // A database can contain an earlier copy of today's snapshot (for example
  // before a unit correction). The bundled snapshot is the source of truth
  // for that id and must replace, rather than be ignored by, the old row.
  const refreshedIds = new Set(prices.map((p) => p.id));
  return {
    ...d,
    models: d.models.map((m) =>
      s.models[m.id]?.image && !m.image.primary
        ? {
            ...m,
            image: {
              ...m.image,
              primary: s.models[m.id].image,
              license: "تصویر محصول از ترب",
            },
          }
        : m,
    ),
    prices: [...d.prices.filter((p) => !refreshedIds.has(p.id)), ...prices],
  };
}
export function composePhone(
  m: PhoneModel,
  v: PhoneVariant,
  p: PriceSnapshot,
  available = true,
  marketLevel = 1,
): Phone {
  const f = m.facts;
  // The value index was calibrated on demo prices; dividing by the market
  // level keeps it comparable when real prices sit on a different scale.
  const intelligence = deriveFeatures(m, v, p.amount / marketLevel);
  const scores = Object.fromEntries(
    keys.map((k) => [k, intelligence.features[k].value]),
  ) as Record<Priority, number>;
  const useCases = Object.fromEntries(
    Object.entries(profiles).map(([k, profile]) => {
      const entries = Object.entries(profile.weights) as [Priority, number][];
      return [
        k,
        Math.round(
          entries.reduce((s, [key, w]) => s + scores[key] * w, 0) /
            entries.reduce((s, [, w]) => s + w, 0),
        ),
      ];
    }),
  ) as Phone["useCases"];
  return {
    id: v.id,
    slug: v.id,
    modelData: m,
    variant: v,
    priceSnapshot: p,
    intelligence,
    brand: m.brand,
    model: m.name,
    displayName: `${m.brand} ${m.name}`,
    price: p.amount,
    originalPrice: p.amount,
    releaseYear: m.year,
    storage: v.storageGb,
    ram: v.ramGb,
    screenSize: f.screenSizeInches,
    screenType: f.panel,
    refreshRate: f.refreshRateHz,
    resolution: f.resolution,
    battery: f.batteryMah,
    charging: f.wiredChargingW,
    chipset: f.chipset,
    cpuTier: Math.round(scores.performance / 10),
    gpuTier: Math.round(scores.performance / 10),
    cameraMp: f.mainCameraMp,
    ultrawide: f.ultrawideMp === null ? null : true,
    telephoto: f.telephotoMp === null ? null : true,
    scores,
    buildScore: 50,
    weight: f.weightGrams,
    dimensions: f.dimensions,
    has5G: f.has5G,
    hasNfc: f.nfc,
    dualSim: f.sim === null ? null : /dual|\+/.test(f.sim),
    os: f.launchOs,
    supportYears: intelligence.remainingSecurityYears,
    warranty: "شرایط فروشنده و رجیستری بررسی شود",
    available,
    torob: p.listing ?? null,
    pros: [
      f.chipset ? `تراشه ${f.chipset}` : "تراشه ثبت نشده",
      f.ois ? "لرزش‌گیر اپتیکال مستند" : "کیفیت دوربین تست مستقل ندارد",
    ],
    cons: intelligence.warnings,
    tags: [
      m.brand,
      ...(f.weightGrams !== null && f.weightGrams <= 180
        ? ["lightweight"]
        : []),
      ...(f.screenSizeInches !== null && f.screenSizeInches <= 6.3
        ? ["compact"]
        : []),
      ...(f.screenSizeInches !== null && f.screenSizeInches >= 6.7
        ? ["large-screen"]
        : []),
      ...(f.wiredChargingW !== null && f.wiredChargingW >= 60
        ? ["fast-charging"]
        : []),
      ...(f.wirelessChargingW ? ["wireless-charging"] : []),
      ...(scores.performance >= 85 ? ["gaming"] : []),
      ...(intelligence.remainingSecurityYears !== null &&
      intelligence.remainingSecurityYears >= 4
        ? ["long-support"]
        : []),
    ],
    useCases,
  };
}
/**
 * With Torob prices, a variant Torob does not list new is kept for "why not?"
 * answers but marked unavailable, valued at its demo price. Ranking never
 * mixes the two price layers.
 */
export function composeCatalog(d: Dataset, source: PriceSource = "demo"): Phone[] {
  const models = new Map(d.models.map((m) => [m.id, m]));
  const latest = (variantId: string, demo: boolean) =>
    d.prices
      .filter((p) => p.variantId === variantId && p.isDemo === demo)
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  const level = source === "torob" ? marketLevel(d, latest) : 1;
  return d.variants.map((v) => {
    const live = source === "torob" ? latest(v.id, false) : undefined;
    return composePhone(
      models.get(v.modelId)!,
      v,
      live ?? latest(v.id, true),
      source === "demo" || Boolean(live),
      live ? level : 1,
    );
  });
}
/** Median ratio of live to demo price over variants that have both. */
function marketLevel(
  d: Dataset,
  latest: (variantId: string, demo: boolean) => PriceSnapshot | undefined,
) {
  const ratios = d.variants
    .map((v) => {
      const live = latest(v.id, false);
      const demo = latest(v.id, true);
      return live && demo ? live.amount / demo.amount : null;
    })
    .filter((r): r is number => r !== null)
    .sort((a, b) => a - b);
  return ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1;
}
/** Deterministic demo-price catalog used by tests and the evaluation. */
export const catalog = composeCatalog(dataset);
