import { Phone } from "../domain";
import { factsSchema } from "./schema";
export function dataQuality(products: Phone[], now = new Date()) {
  const models = [
    ...new Map(products.map((p) => [p.variant.modelId, p.modelData])).values(),
  ];
  const fields = Object.keys(
    factsSchema.shape,
  ) as (keyof (typeof models)[number]["facts"])[];
  const byField = fields.map((key) => {
    const populated = models.filter((m) => m.facts[key] !== null);
    return {
      key,
      populated: populated.length,
      missing: models.length - populated.length,
      coverage: models.length ? populated.length / models.length : 0,
      highConfidence: populated.filter(
        (m) => m.provenance[key]?.confidence === "high",
      ).length,
      unverified: populated.filter((m) => !m.provenance[key]?.verifiedAt)
        .length,
    };
  });
  const populated = byField.reduce((s, x) => s + x.populated, 0);
  return {
    models: models.length,
    variants: products.length,
    brands: [...new Set(models.map((m) => m.brand))],
    fields: fields.length,
    populated,
    missing: models.length * fields.length - populated,
    coverage: models.length ? populated / (models.length * fields.length) : 0,
    highConfidence: byField.reduce((s, x) => s + x.highConfidence, 0),
    unverified: byField.reduce((s, x) => s + x.unverified, 0),
    stalePrices: products.filter(
      (p) =>
        now.getTime() - Date.parse(p.priceSnapshot.observedAt) > 30 * 86400000,
    ).length,
    demoPrices: products.filter((p) => p.priceSnapshot.isDemo).length,
    byField,
  };
}
