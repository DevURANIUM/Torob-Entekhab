import { describe, it, expect, vi, afterEach } from "vitest";
import { normalize, parseBudget } from "../lib/search/normalize";
import { extractIntent } from "../lib/ai/extract-intent";
import { catalog } from "../lib/data/catalog";
import { rank, weights, eligible } from "../lib/search/ranking";
import {
  confidence,
  search,
  marginalValueAnalysis,
} from "../lib/search/engine";
import { intentSchema, keys } from "../lib/domain";
import { resolveIntent } from "../lib/ai/provider";
import { ndcg } from "../lib/evaluation/run";
describe("normalization", () => {
  it.each(["۲۵ میلیون", "25 میلیون", "٢٥ ميليون"])("%s", (q) =>
    expect(parseBudget(q)?.max).toBe(25000000),
  );
  it("normalizes Persian variants", () =>
    expect(normalize("گوشي كیفیت ۲۵٬۰۰۰")).toBe("گوشی کیفیت 25000"));
  it("handles ranges and decimals", () => {
    expect(parseBudget("بین ۱۵ تا ۲۵ میلیون")).toMatchObject({
      min: 15000000,
      max: 25000000,
    });
    expect(parseBudget("۲۲٫۵ میلیون")?.max).toBe(22500000);
  });
});
describe("intent", () => {
  it("merges budget without losing preferences", () => {
    const before = extractIntent("باتری خوب دوربین مهم نیست تا ۲۵ میلیون");
    const after = extractIntent("بودجه رو ببر ۳۰", before);
    expect(after.budget?.max).toBe(30000000);
    expect(after.priorities).toEqual(before.priorities);
  });
  it("changes camera priority", () => {
    const i = extractIntent("دوربین مهم نیست");
    expect(extractIntent("دوربین مهم‌تر شد", i).priorities.camera).toBe(4);
  });
  it("merges brand", () => {
    const a = extractIntent("برای مامانم تا ۲۵ میلیون باتری خوب");
    const b = extractIntent("سامسونگ ترجیح میدم", a);
    expect(b.brands).toEqual(["Samsung"]);
    expect(b.budget).toEqual(a.budget);
    expect(b.priorities).toEqual(a.priorities);
  });
  it("separates negative gaming from camera", () => {
    const i = extractIntent("بازی مهم نیست ولی دوربین و باتری مهمه");
    expect(i.priorities.performance).toBe(0.25);
    expect(i.priorities.camera).toBe(4);
    expect(i.useCases).not.toContain("gaming");
  });
  it("excludes brands", () =>
    expect(extractIntent("سامسونگ نمیخوام").excludedBrands).toContain(
      "Samsung",
    ));
  it("validates malformed weights", () =>
    expect(() =>
      intentSchema.parse({ query: "x", priorities: { camera: -1 } }),
    ).toThrow());
});
describe("retrieval and ranking", () => {
  it("contains 163 stable unique variants", () => {
    expect(catalog).toHaveLength(163);
    expect(new Set(catalog.map((p) => p.id)).size).toBe(163);
  });
  it("enforces all hard filters", () => {
    const i = intentSchema.parse({
      query: "",
      budget: { min: 10000000, max: 60000000 },
      excludedBrands: ["Apple"],
      constraints: {
        minStorage: 256,
        minRam: 8,
        minBattery: 4500,
        minScreenSize: 6.1,
        maxWeight: 200,
        requires5G: true,
        requiresNfc: true,
        minSupportYears: 3,
      },
    });
    const results = rank(catalog, i);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(eligible(r.product, i)).toBe(true);
      expect(r.product.price).toBeLessThanOrEqual(60000000);
      expect(r.product.brand).not.toBe("Apple");
      expect(r.product.storage).toBeGreaterThanOrEqual(256);
    }
  });
  it("does not relax an impossible query", () =>
    expect(rank(catalog, extractIntent("آیفون نو تا ۵ میلیون"))).toHaveLength(
      0,
    ));
  it("keeps distinct model families", () => {
    const r = rank(catalog, extractIntent("گوشی"));
    expect(new Set(r.map((x) => x.product.variant.modelId)).size).toBe(
      r.length,
    );
  });
  it("normalizes weights", () =>
    expect(
      Object.values(weights(extractIntent("باتری مهمه"))).reduce(
        (s, v) => s + v,
        0,
      ),
    ).toBeCloseTo(1));
  it("changes ranking with preferences", () => {
    const battery = rank(catalog, extractIntent("تا ۴۰ میلیون باتری مهمه"));
    const gaming = rank(catalog, extractIntent("تا ۴۰ میلیون برای بازی"));
    expect(battery[0].product.id).not.toBe(gaming[0].product.id);
  });
  it("is deterministic", () => {
    const i = extractIntent("باتری تا ۲۵ میلیون");
    expect(rank(catalog, i)).toEqual(rank(catalog, i));
  });
  it("score is auditable", () => {
    const r = rank(catalog, extractIntent("تا ۳۰ میلیون باتری"))[0];
    const total =
      keys.reduce((s, k) => s + r.contributions[k], 0) -
      r.uncertaintyPenalty -
      r.budgetPenalty;
    expect(r.total).toBeCloseTo(total, 0);
  });
  it("handles empty database", () =>
    expect(search([], extractIntent("گوشی")).ranked).toEqual([]));
  it("zero budget is a hard constraint", () =>
    expect(
      rank(catalog, intentSchema.parse({ query: "گوشی", budget: { max: 0 } })),
    ).toEqual([]));
  it("rejects nonsensical intent without guessing products", () => {
    const result = search(
      catalog,
      extractIntent("سبزتر از دیروز با طعم موسیقی"),
    );
    expect(result.understood).toBe(false);
    expect(result.ranked).toEqual([]);
  });
  it("conflicting bounds return no matches", () =>
    expect(
      rank(
        catalog,
        intentSchema.parse({
          query: "گوشی",
          budget: { min: 30000000, max: 10000000 },
        }),
      ),
    ).toEqual([]));
});
describe("decision tools", () => {
  it("low confidence for vague query", () => {
    const i = extractIntent("گوشی");
    expect(confidence(i, rank(catalog, i))).toBe("low");
  });
  it("clarifies only when it can change choices", () =>
    expect(
      search(catalog, extractIntent("تا ۳۰ میلیون")).clarification,
    ).not.toBeNull());
  it("upgrade preserves brand and constraints", () => {
    const i = extractIntent("سامسونگ تا ۲۵ میلیون باتری خوب");
    const m = marginalValueAnalysis(catalog, i, 30000000)!;
    expect(m.next.product.brand).toBe("Samsung");
    expect(m.next.product.price).toBeLessThanOrEqual(60000000);
    expect(m.deltas.camera).toBe(
      m.next.product.scores.camera - m.current.product.scores.camera,
    );
    expect(m.worthIt).toBe(m.preferenceGain >= 5);
  });
  it("empty upgrades return null", () =>
    expect(marginalValueAnalysis([], extractIntent("گوشی"))).toBeNull());
  it("NDCG uses independent graded relevance", () => {
    expect(ndcg([3, 2, 1], [3, 2, 1])).toBe(1);
    expect(ndcg([1, 0, 0], [3, 2, 1])).toBeCloseTo(0.1064646477, 8);
  });
});
describe("AI resilience", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("falls back when remote fails", async () => {
    vi.stubEnv("AI_MODE", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await resolveIntent("تا ۲۵ میلیون");
    expect(result.fallback).toBe(true);
    expect(result.intent.budget?.max).toBe(25000000);
  });
  it("rejects hallucinated brand output", async () => {
    vi.stubEnv("AI_MODE", "openai");
    vi.stubEnv("OPENAI_API_KEY", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  query: "x",
                  brands: ["Imaginary"],
                }),
              },
            },
          ],
        }),
      }),
    );
    expect((await resolveIntent("سامسونگ")).intent.brands).toEqual(["Samsung"]);
  });
});
