import { Phone } from "../domain";
import { extractIntent } from "../ai/extract-intent";
import { search } from "../search/engine";
import { cases } from "./cases";
export function subset(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      (expected.length > 0 || actual.length === 0) &&
      expected.every((x) => actual.includes(x))
    );
  if (expected && typeof expected === "object")
    return (
      Boolean(actual) &&
      Object.entries(expected).every(([k, v]) =>
        subset((actual as Record<string, unknown>)[k], v),
      )
    );
  return actual === expected;
}
export function ndcg(grades: number[], ideal: number[]) {
  const dcg = (x: number[]) =>
    x.slice(0, 3).reduce((s, v, i) => s + (2 ** v - 1) / Math.log2(i + 2), 0);
  return dcg(ideal) ? dcg(grades) / dcg(ideal) : 0;
}
export function evaluate(products: Phone[]) {
  const rows = cases.map((c) => {
    const start = performance.now();
    const intent = extractIntent(
      c.query,
      c.previous ? extractIntent(c.previous) : undefined,
    );
    const result = search(products, intent);
    const fields = Object.entries(c.expected).map(([key, value]) => ({
      key,
      pass: subset(intent[key as keyof typeof intent], value),
    }));
    if (c.noResults !== undefined)
      fields.push({
        key: "noResults",
        pass: (result.ranked.length === 0) === c.noResults,
      });
    const relevance = c.relevance;
    const judged = relevance && Object.keys(relevance).length > 0;
    const grades = judged
      ? result.recommendations.map((r) => relevance[r.product.model] ?? 0)
      : [];
    return {
      query: c.query,
      category: c.category ?? Object.keys(c.expected)[0] ?? "ambiguity",
      diversity: {
        brands: new Set(result.recommendations.map((r) => r.product.brand))
          .size,
        priceSpread: result.recommendations.length
          ? Math.max(...result.recommendations.map((r) => r.product.price)) -
            Math.min(...result.recommendations.map((r) => r.product.price))
          : 0,
        featureDistance:
          result.recommendations.length > 1
            ? result.recommendations
                .slice(1)
                .reduce(
                  (sum, r) =>
                    sum +
                    Object.keys(r.weights).reduce(
                      (s, k) =>
                        s +
                        Math.abs(
                          r.product.scores[k as keyof typeof r.weights] -
                            result.recommendations[0].product.scores[
                              k as keyof typeof r.weights
                            ],
                        ) *
                          r.weights[k as keyof typeof r.weights],
                      0,
                    ),
                  0,
                ) /
              (result.recommendations.length - 1)
            : 0,
      },
      fields,
      pass: fields.every((f) => f.pass),
      note: c.note,
      latency: performance.now() - start,
      top: result.recommendations.map((r) => r.product.model),
      recall: judged
        ? result.ranked
            .slice(0, 5)
            .filter((r) => (relevance[r.product.model] ?? 0) > 0).length /
          Object.keys(relevance).length
        : null,
      ndcg: judged
        ? ndcg(
            grades,
            Object.values(relevance).sort((a, b) => b - a),
          )
        : null,
      relevance: judged ? grades.filter((v) => v > 0).length / 3 : null,
    };
  });
  const mean = (a: number[]) =>
    a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const latency = rows.map((r) => r.latency).sort((a, b) => a - b);
  const byField = Object.fromEntries(
    ["budget", "brands", "useCases", "constraints"].map((key) => {
      const fields = rows.flatMap((r) => r.fields).filter((f) => f.key === key);
      return [key, mean(fields.map((f) => Number(f.pass)))];
    }),
  );
  return {
    timestamp: new Date().toISOString(),
    mode: "mock",
    count: rows.length,
    judgedCount: rows.filter((r) => r.ndcg !== null).length,
    intentAccuracy: mean(
      rows.flatMap((r) => r.fields).map((f) => Number(f.pass)),
    ),
    byField,
    byCategory: Object.fromEntries(
      [...new Set(rows.map((r) => r.category))].map((category) => {
        const group = rows.filter((r) => r.category === category);
        return [
          category,
          {
            count: group.length,
            passed: group.filter((r) => r.pass).length,
            accuracy: mean(group.map((r) => Number(r.pass))),
          },
        ];
      }),
    ),
    diversity: {
      brands: mean(rows.map((r) => r.diversity.brands)),
      priceSpread: mean(rows.map((r) => r.diversity.priceSpread)),
      featureDistance: mean(rows.map((r) => r.diversity.featureDistance)),
    },
    recall: mean(rows.flatMap((r) => (r.recall === null ? [] : [r.recall]))),
    ndcg: mean(rows.flatMap((r) => (r.ndcg === null ? [] : [r.ndcg]))),
    relevance: mean(
      rows.flatMap((r) => (r.relevance === null ? [] : [r.relevance])),
    ),
    p50: latency[Math.floor(latency.length * 0.5)],
    p95: latency[Math.floor(latency.length * 0.95)],
    rows,
  };
}
