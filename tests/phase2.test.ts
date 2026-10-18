import { describe, it, expect } from "vitest";
import { catalog, dataset, composePhone } from "../lib/data/catalog";
import { validateDataset, factsSchema } from "../lib/data/schema";
import { extractIntent } from "../lib/ai/extract-intent";
import { parseBudget } from "../lib/search/normalize";
import { intentSchema, keys } from "../lib/domain";
import {
  rank,
  score,
  selectDiverseTopRecommendations,
  eligible,
} from "../lib/search/ranking";
import {
  saveMoney,
  priceUtilityCurve,
  sensitivity,
  whyNotSelected,
  search,
} from "../lib/search/engine";
import { meaningfulDifference } from "../lib/specifications";
import { evaluate } from "../lib/evaluation/run";
const phone = (id: string) => catalog.find((p) => p.variant.modelId === id)!;
describe("dataset integrity", () => {
  it("validates 61 real models and all 163 paired variants", () => {
    expect(dataset.models).toHaveLength(61);
    expect(dataset.variants).toHaveLength(163);
    expect(new Set(dataset.models.map((m) => m.brand)).size).toBe(10);
    expect(validateDataset(dataset).variants).toHaveLength(163);
  });
  it("every populated fact has a dated source; unknown measurements stay unknown", () => {
    for (const m of dataset.models) {
      for (const [key, value] of Object.entries(m.facts)) {
        if (value !== null)
          expect(m.provenance[key]?.sourceUrl).toMatch(/^https:/);
      }
      expect(m.facts.measuredBatteryHours).toBeNull();
      expect(m.facts.reviewCameraScore).toBeNull();
      expect(m.facts.measuredThermalScore).toBeNull();
    }
  });
  it("does not fabricate Apple RAM or battery capacity", () => {
    for (const p of catalog.filter((p) => p.brand === "Apple")) {
      expect(p.ram).toBeNull();
      expect(p.battery).toBeNull();
    }
  });
  it("preserves recognizable specification differences", () => {
    expect(phone("samsung-a55").screenSize).toBe(6.6);
    expect(phone("poco-x6").battery).toBe(5100);
    expect(phone("apple-iphone-16promax").screenSize).toBe(6.9);
  });
  it.each([
    { screenSizeInches: -1 },
    { batteryMah: 50000 },
    { refreshRateHz: 999 },
    { weightGrams: 5 },
  ])("rejects impossible facts %j", (f) =>
    expect(() => factsSchema.parse(f)).toThrow(),
  );
  it("rejects orphan variants and missing prices", () => {
    expect(() => validateDataset({ ...dataset, models: [] })).toThrow();
    expect(() => validateDataset({ ...dataset, prices: [] })).toThrow();
  });
  it("requires provenance on newly supplied facts", () => {
    const models = structuredClone(dataset.models);
    models[0].facts.batteryMah = 4000;
    expect(() => validateDataset({ ...dataset, models })).toThrow();
  });
  it("prices are positive explicit demo snapshots", () => {
    expect(
      dataset.prices.every(
        (p) => p.isDemo && p.amount > 0 && p.source === "قیمت نمونه برای دمو",
      ),
    ).toBe(true);
  });
});
describe("Persian budget semantics", () => {
  it.each([
    ["۲۰ تومن", 20],
    ["بیست میلیون", 20],
    ["حدود ۲۵", 25],
    ["زیر سی", 30],
    ["تا ۳۰", 30],
    ["نهایت ۳۵", 35],
    ["حدوداً سی تومن", 30],
    ["بیست و پنج میلیون", 25],
  ])("%s", (q, m) =>
    expect(parseBudget(q as string)?.max).toBe(Number(m) * 1e6),
  );
  it.each(["بین ۲۰ تا ۳۰", "۲۰-۳۰"])("parses range %s", (q) =>
    expect(parseBudget(q)).toMatchObject({ min: 20e6, max: 30e6 }),
  );
  it("separates hard and soft budgets", () => {
    expect(parseBudget("تا ۲۵ میلیون")?.kind).toBe("hard");
    expect(parseBudget("حدود ۲۵ میلیون")?.kind).toBe("soft");
  });
  it.each(["زیر ۱۸۰ گرم", "رم ۱۲ گیگ", "حداقل ۴ سال", "باتری ۵۰۰۰"])(
    "does not treat hardware constraints as budget: %s",
    (q) => expect(parseBudget(q)).toBeUndefined(),
  );
});
describe("ranking behavior and counterfactuals", () => {
  it.each(["camera", "performance", "longevity"] as const)(
    "increasing %s favors the stronger candidate",
    (key) => {
      const sorted = [...catalog].sort((a, b) => a.scores[key] - b.scores[key]);
      const weak = sorted[0],
        strong = sorted.at(-1)!;
      const base = intentSchema.parse({
        query: "گوشی",
        priorities: Object.fromEntries(keys.map((k) => [k, 1])),
      });
      const altered = {
        ...base,
        priorities: { ...base.priorities, [key]: 10 },
      };
      const before = score(strong, base).utility - score(weak, base).utility;
      const after =
        score(strong, altered).utility - score(weak, altered).utility;
      expect(after).toBeGreaterThan(before);
    },
  );
  it("gaming and parent rankings materially differ", () =>
    expect(
      rank(catalog, extractIntent("برای پابجی تا ۳۰ میلیون"))[0].product.variant
        .modelId,
    ).not.toBe(
      rank(catalog, extractIntent("برای مادرم تا ۳۰ میلیون"))[0].product.variant
        .modelId,
    ));
  it("camera score does not reward megapixels alone", () => {
    const p = phone("poco-x6");
    const m = structuredClone(p.modelData);
    m.facts.mainCameraMp = 200;
    expect(composePhone(m, p.variant, p.priceSnapshot).scores.camera).toBe(
      p.scores.camera,
    );
  });
  it("a faster chipset can beat more RAM", () =>
    expect(phone("poco-x6-pro").scores.performance).toBeGreaterThan(
      catalog.find((p) => p.variant.modelId === "poco-x6" && p.ram === 12)!
        .scores.performance,
    ));
  it("remaining support is less than original promise", () => {
    const p = phone("samsung-s24");
    expect(p.supportYears).toBeLessThan(p.modelData.facts.securityYears!);
    expect(p.supportYears).toBeGreaterThan(0);
  });
  it("unknown facts cannot satisfy hard constraints", () =>
    expect(
      eligible(
        phone("apple-iphone-16"),
        intentSchema.parse({ query: "", constraints: { minRam: 4 } }),
      ),
    ).toBe(false));
  it("all returned variants obey budget, exclusions and minimum storage", () => {
    const i = extractIntent("به جز سامسونگ تا ۴۰ میلیون حداقل ۲۵۶ گیگ");
    const r = search(catalog, i);
    expect(r.ranked.length).toBeGreaterThan(0);
    for (const x of r.ranked) {
      expect(x.product.price).toBeLessThanOrEqual(40e6);
      expect(x.product.brand).not.toBe("Samsung");
      expect(x.product.storage).toBeGreaterThanOrEqual(256);
    }
    expect(r.stretch).toBeNull();
  });
  it("top recommendations group models and are deterministic", () => {
    const ranked = rank(catalog, extractIntent("گوشی تا ۴۰ میلیون"));
    const selected = selectDiverseTopRecommendations(ranked);
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((x) => x.product.variant.modelId)).size).toBe(
      3,
    );
    expect(selectDiverseTopRecommendations(ranked)).toEqual(selected);
  });
  it("save mode finds the cheapest qualifying alternative", () => {
    const i = extractIntent("گوشی تا ۸۰ میلیون");
    const saved = saveMoney(catalog, i);
    expect(saved).not.toBeNull();
    const current = rank(catalog, i)[0];
    const qualifying = catalog
      .filter((p) => eligible(p, i) && p.price < current.product.price)
      .map((p) => score(p, i))
      .filter(
        (r) =>
          r.utility >= current.utility * 0.93 &&
          r.coverage >= current.coverage - 0.15,
      );
    expect(
      phone(catalog.find((p) => p.id === saved!.nextId)!.variant.modelId),
    ).toBeDefined();
    expect(catalog.find((p) => p.id === saved!.nextId)!.price).toBe(
      Math.min(...qualifying.map((r) => r.product.price)),
    );
    expect(saved!.retained).toBeGreaterThanOrEqual(0.93);
  });
  it("curve uses six budgets without changing user intent", () => {
    const i = extractIntent("سامسونگ تا ۳۰ میلیون");
    const before = JSON.stringify(i);
    const curve = priceUtilityCurve(catalog, i);
    expect(curve.map((x) => x.multiplier)).toEqual([
      0.8, 0.9, 1, 1.1, 1.2, 1.3,
    ]);
    expect(curve.every((x) => x.price === null || x.price <= x.budget)).toBe(
      true,
    );
    expect(JSON.stringify(i)).toBe(before);
  });
  it("sensitivity computes all 22 perturbations", () => {
    const i = extractIntent("گوشی تا ۳۰ میلیون");
    const s = sensitivity(catalog, i);
    expect(s.scenarios).toHaveLength(22);
    expect(s.stableRatio).toBeGreaterThanOrEqual(0);
    expect(s.stableRatio).toBeLessThanOrEqual(1);
  });
  it("why-not exposes hard exclusions", () => {
    const i = extractIntent("گوشی تا ۱۰ میلیون");
    const r = rank(catalog, i);
    expect(
      whyNotSelected(
        phone("samsung-s24"),
        i,
        r,
        selectDiverseTopRecommendations(r),
      ),
    ).toMatchObject({ status: "excluded", reasons: ["بالاتر از سقف بودجه"] });
  });
  it("comparison suppresses meaningless battery differences", () => {
    expect(meaningfulDifference("batteryMah", [5000, 5010])).toBe(false);
    expect(meaningfulDifference("wiredChargingW", [25, 67])).toBe(true);
    expect(meaningfulDifference("batteryMah", [null, 5000])).toBe(false);
  });
});
describe("evaluation and context", () => {
  it("runs 100 actual cases including sequential follow-ups", () => {
    const r = evaluate(catalog);
    expect(r.count).toBe(100);
    expect(r.rows.filter((x) => !x.pass)).toEqual([]);
    expect(r.byCategory["follow-ups"].count).toBeGreaterThan(5);
  });
  it("parent assumptions are explicit and do not infer age", () => {
    const i = extractIntent("برای مادرم");
    expect(i.assumptions.length).toBeGreaterThan(0);
    expect(i.useCases).not.toContain("elderly");
  });
  it("removes gaming while preserving budget and storage", () => {
    const i = extractIntent("بازی تا ۳۰ میلیون ۲۵۶ گیگ");
    const next = extractIntent("بازی رو بیخیال", i);
    expect(next.useCases).not.toContain("gaming");
    expect(next.budget).toEqual(i.budget);
    expect(next.constraints).toEqual(i.constraints);
  });
});
it("save follow-up preserves the original utility weights", () => {
  const i = extractIntent("برای عکاسی تا ۴۰ میلیون");
  const next = extractIntent("یکم ارزون‌تر", i);
  expect(next.action).toBe("save");
  expect(next.priorities).toEqual(i.priorities);
});
it("explicit soft stretch stays bounded and hard results never exceed target", () => {
  const i = extractIntent(
    "حدود ۳۰ بودجه دارم ولی اگه واقعا ارزش داشته باشه تا ۳۳ هم میرم",
  );
  expect(i.budget).toMatchObject({ max: 30e6, target: 30e6, kind: "soft" });
  expect(i.budget!.flexibility).toBeCloseTo(0.1);
  const r = search(catalog, i);
  expect(r.recommendations.every((x) => x.product.price <= 30e6)).toBe(true);
  if (r.stretch) {
    expect(r.stretch.product.price).toBeLessThanOrEqual(33e6 + 1);
    expect(r.stretch.utility - r.ranked[0].utility).toBeGreaterThanOrEqual(5);
  }
});
it("RAM-only request does not add an unintended storage constraint", () =>
  expect(extractIntent("رم ۱۲ گیگ میخوام").constraints).toEqual({
    minRam: 12,
  }));
it("duplicate configurations and corrupt prices are rejected", () => {
  const variants = [
    ...dataset.variants,
    { ...dataset.variants[0], id: "duplicate-variant" },
  ];
  expect(() => validateDataset({ ...dataset, variants })).toThrow();
  const prices = structuredClone(dataset.prices);
  prices[0].amount = -1;
  expect(() => validateDataset({ ...dataset, prices })).toThrow();
});
