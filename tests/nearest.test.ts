import { describe, expect, it } from "vitest";
import { catalog } from "../lib/data/catalog";
import { extractIntent } from "../lib/ai/extract-intent";
import { search } from "../lib/search/engine";

describe("nothing fits the budget", () => {
  it("offers the cheapest models above the cap that meet every other condition", () => {
    const r = search(catalog, extractIntent("آیفون نو تا ۵ میلیون"));
    expect(r.ranked).toHaveLength(0);
    expect(r.nearest).not.toBeNull();
    const items = r.nearest!.items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(3);
    // Brand is kept; only the cap is lifted.
    expect(items.every((x) => x.product.brand === "Apple")).toBe(true);
    expect(items.every((x) => x.product.price > 5_000_000)).toBe(true);
    // Cheapest first, one variant per model, and the headline is the cheapest.
    const prices = items.map((x) => x.product.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(new Set(items.map((x) => x.product.variant.modelId)).size).toBe(
      items.length,
    );
    const cheapestIphone = Math.min(
      ...catalog
        .filter((p) => p.brand === "Apple" && p.available)
        .map((p) => p.price),
    );
    expect(r.nearest!.cheapest).toBe(cheapestIphone);
    // Scored without the cap, so the fit is not wiped out by the budget penalty.
    expect(items[0].budgetPenalty).toBe(0);
  });

  it("stays quiet when the budget already finds phones or nothing was understood", () => {
    expect(
      search(catalog, extractIntent("برای بازی تا ۳۵ میلیون")).nearest,
    ).toBeNull();
    expect(
      search(catalog, extractIntent("سبزتر از دیروز با طعم موسیقی")).nearest,
    ).toBeNull();
  });
});
