import { Phone, SearchIntent, keys, Priority, labels } from "../domain";
import {
  rank,
  Ranked,
  eligible,
  score,
  exclusionReasons,
  selectDiverseTopRecommendations,
  dominates,
} from "./ranking";
import { normalize } from "./normalize";
export function confidenceDetails(i: SearchIntent, r: Ranked[]) {
  const gap = r.length > 1 ? r[0].total - r[1].total : 0;
  const completeness = Math.min(
    1,
    (Object.keys(i.priorities).length +
      i.useCases.length +
      (i.budget ? 1 : 0)) /
      5,
  );
  const coverage = r[0]?.coverage ?? 0;
  const ambiguity = i.assumptions.length > 0 || i.warnings.length > 0;
  const value = Math.round(
    100 *
      (0.25 * Math.min(1, gap / 8) +
        0.25 * completeness +
        0.35 * coverage +
        0.15 * Math.min(1, r.length / 5)) -
      (ambiguity ? 10 : 0),
  );
  return {
    level: !r.length || value < 45 ? "low" : value < 75 ? "medium" : "high",
    value: Math.max(0, value),
    gap,
    completeness,
    coverage,
    candidates: r.length,
    ambiguity,
    explanation:
      "اعتماد از فاصله امتیاز، کامل بودن نیاز، پوشش داده، تعداد مدل‌ها و ابهام محاسبه می‌شود؛ احتمال آماری نیست.",
  } as const;
}
export function confidence(i: SearchIntent, r: Ranked[]) {
  return confidenceDetails(i, r).level;
}
export function clarification(i: SearchIntent, p: Phone[]) {
  if (Object.keys(i.priorities).length >= 2 || i.useCases.length) return null;
  return new Set(
    keys
      .slice(0, 5)
      .map((k) => rank(p, { ...i, priorities: { [k]: 6 } })[0]?.product.id)
      .filter(Boolean),
  ).size > 1
    ? "بیشتر کدوم برات مهمه؟"
    : null;
}
export function saveMoney(
  products: Phone[],
  i: SearchIntent,
  retention = 0.93,
) {
  const current = rank(products, i)[0];
  if (!current) return null;
  const candidates = products
    .filter((p) => eligible(p, i) && p.price < current.product.price)
    .map((p) => score(p, i))
    .filter(
      (r) =>
        r.utility >= current.utility * retention &&
        r.coverage >= current.coverage - 0.15,
    )
    .sort((a, b) => a.product.price - b.product.price || b.total - a.total);
  const next = candidates[0];
  return next
    ? {
        currentId: current.product.id,
        nextId: next.product.id,
        currentName: current.product.displayName,
        nextName: next.product.displayName,
        saved: current.product.price - next.product.price,
        retained: next.utility / current.utility,
        losses: keys
          .filter(
            (k) => current.product.scores[k] - next.product.scores[k] >= 8,
          )
          .map((k) => ({
            key: k,
            delta: current.product.scores[k] - next.product.scores[k],
          })),
      }
    : null;
}
export function sensitivity(products: Phone[], i: SearchIntent) {
  const winner = rank(products, i)[0];
  if (!winner) return { stableRatio: 0, scenarios: [], dominantCause: null };
  const scenarios = keys.flatMap((k) =>
    [0.8, 1.2].map((factor) => {
      const base = Object.fromEntries(
        keys.map((x) => [x, winner.weights[x] * 10]),
      );
      const r = rank(products, {
        ...i,
        priorities: { ...base, [k]: base[k] * factor },
      })[0];
      return {
        key: k,
        factor,
        winnerId: r?.product.id ?? null,
        winnerName: r?.product.displayName ?? null,
        changed: r?.product.variant.modelId !== winner.product.variant.modelId,
      };
    }),
  );
  const changes = scenarios.filter((s) => s.changed);
  const runner = rank(products, i)[1];
  return {
    stableRatio: 1 - changes.length / scenarios.length,
    scenarios,
    dominantCause: changes[0]?.key ?? null,
    winningCause: [...keys].sort(
      (a, b) =>
        winner.contributions[b] -
        (runner?.contributions[b] ?? 0) -
        (winner.contributions[a] - (runner?.contributions[a] ?? 0)),
    )[0],
  };
}
export function priceUtilityCurve(products: Phone[], i: SearchIntent) {
  const budget = i.budget?.max ?? rank(products, i)[0]?.product.price;
  if (!budget) return [];
  const w = rank(products, i)[0]?.weights;
  return [0.8, 0.9, 1, 1.1, 1.2, 1.3].map((multiplier) => {
    const cap = Math.round(budget * multiplier);
    const r = rank(products, { ...i, budget: { max: cap, kind: "hard" } })[0];
    const utility =
      r && w
        ? keys.reduce((s, k) => s + r.product.scores[k] * w[k], 0)
        : (r?.utility ?? null);
    return {
      budget: cap,
      multiplier,
      utility: utility === null ? null : Math.round(utility * 10) / 10,
      winnerId: r?.product.id ?? null,
      winnerName: r?.product.displayName ?? null,
      price: r?.product.price ?? null,
    };
  });
}
export function whyNotSelected(
  p: Phone,
  i: SearchIntent,
  ranked: Ranked[],
  selected: Ranked[],
) {
  const reasons = exclusionReasons(p, i);
  if (reasons.length) return { status: "excluded", reasons };
  const s = score(p, i);
  if (selected.some((r) => r.product.id === p.id))
    return { status: "selected", reasons: ["در پیشنهادهای اصلی است."] };
  const family = ranked.find(
    (r) => r.product.variant.modelId === p.variant.modelId,
  );
  if (family && family.product.id !== p.id)
    return {
      status: "variant_grouped",
      reasons: ["نسخه دیگری از همین مدل امتیاز بهتر یا قیمت پایین‌تر دارد."],
    };
  const dominator = ranked.find(
    (r) => r.product.id !== p.id && dominates(r, s),
  );
  if (dominator)
    return {
      status: "dominated",
      reasons: [
        `${dominator.product.displayName} در معیارهای مهم ضعیف‌تر نیست و هزینه بیشتری ندارد.`,
      ],
    };
  const winner = selected[0];
  const losses = winner
    ? keys
        .filter((k) => winner.contributions[k] - s.contributions[k] >= 1)
        .sort(
          (a, b) =>
            winner.contributions[b] -
            s.contributions[b] -
            (winner.contributions[a] - s.contributions[a]),
        )
        .slice(0, 2)
    : [];
  return {
    status: "lower_ranked",
    reasons: [
      `فاصله امتیاز با انتخاب اول: ${Math.max(0, (winner?.total ?? s.total) - s.total).toFixed(1)}؛ تنوع پیشنهادها نیز لحاظ شده.`,
      ...losses.map((k) => `سهم کمتر در معیار ${labels[k]}`),
      ...keys
        .filter(
          (k) => winner && s.product.scores[k] - winner.product.scores[k] >= 8,
        )
        .slice(0, 2)
        .map(
          (k) =>
            `${labels[k]} در این گوشی بالاتر است، اما مجموع وزن‌ها و عدم قطعیت آن را به انتخاب اول تبدیل نکرده.`,
        ),
    ],
  };
}
/**
 * When nothing fits under the budget cap, the cheapest models that meet every
 * other condition, so the user sees how far the budget is from the market
 * instead of an empty page. Scored without the cap so the match reflects fit.
 */
export function nearestAboveBudget(
  products: Phone[],
  intent: SearchIntent,
  count = 3,
) {
  const max = intent.budget?.max;
  if (max === undefined) return null;
  const open = { ...intent, budget: { ...intent.budget, max: undefined } };
  const cheapestPerModel = new Map<string, Phone>();
  for (const p of products)
    if (eligible(p, open) && p.price > max) {
      const seen = cheapestPerModel.get(p.variant.modelId);
      if (!seen || p.price < seen.price)
        cheapestPerModel.set(p.variant.modelId, p);
    }
  const items = [...cheapestPerModel.values()]
    .sort((a, b) => a.price - b.price)
    .slice(0, count)
    .map((p) => score(p, open));
  return items.length ? { cheapest: items[0].product.price, items } : null;
}

export function search(products: Phone[], intent: SearchIntent) {
  const understood = Boolean(
    intent.budget ||
    intent.brands.length ||
    intent.excludedBrands.length ||
    intent.useCases.length ||
    Object.keys(intent.priorities).length ||
    Object.keys(intent.constraints).length ||
    /گوشی|موبایل|phone/.test(normalize(intent.query)),
  );
  const ranked = understood ? rank(products, intent) : [];
  const recommendations = selectDiverseTopRecommendations(ranked);
  const saving = understood ? saveMoney(products, intent) : null;
  const max = intent.budget?.max;
  const stretch =
    max && intent.budget?.kind === "soft"
      ? rank(products, {
          ...intent,
          budget: {
            ...intent.budget,
            max: max * (1 + (intent.budget.flexibility ?? 0.1)),
          },
        }).find(
          (r) =>
            r.product.price > max && r.utility >= (ranked[0]?.utility ?? 0) + 5,
        )
      : undefined;
  return {
    intent,
    understood,
    normalizedQuery: normalize(intent.query),
    candidateCount: understood
      ? products.filter((p) => eligible(p, intent)).length
      : 0,
    familyCount: ranked.length,
    ranked,
    recommendations,
    confidence: confidence(intent, ranked),
    confidenceDetails: confidenceDetails(intent, ranked),
    clarification: clarification(intent, products),
    saving,
    sensitivity: understood ? sensitivity(products, intent) : null,
    curve: understood ? priceUtilityCurve(products, intent) : [],
    stretch: stretch ?? null,
    nearest:
      understood && !ranked.length
        ? nearestAboveBudget(products, intent)
        : null,
    counterfactuals: understood
      ? (["performance", "camera", "battery"] as Priority[]).map((key) => {
          const r = rank(products, {
            ...intent,
            priorities: { ...intent.priorities, [key]: 10 },
          })[0];
          return {
            key,
            label: `${{ performance: "بازی", camera: "دوربین", battery: "باتری" }[key as "performance" | "camera" | "battery"]} اولویت اصلی شود`,
            winnerName: r?.product.displayName ?? null,
            winnerId: r?.product.id ?? null,
          };
        })
      : [],
    alternatives: products.map((p) => ({
      id: p.id,
      name: `${p.displayName} ${p.ram ?? "?"} / ${p.storage}`,
      modelId: p.variant.modelId,
      price: p.price,
      ...whyNotSelected(p, intent, ranked, recommendations),
    })),
  };
}
export type SearchResult = ReturnType<typeof search>;
export function marginalValueAnalysis(
  products: Phone[],
  intent: SearchIntent,
  target?: number,
) {
  const current = rank(products, intent)[0];
  if (!current) return null;
  const oldBudget = intent.budget?.max ?? current.product.price;
  const newBudget =
    target && target > oldBudget
      ? target
      : Math.ceil((oldBudget * 1.2) / 1e6) * 1e6;
  const ranked = rank(products, {
    ...intent,
    budget: { max: newBudget, kind: "hard" },
  });
  // Only a different model counts as "something better"; another storage
  // variant, or the same phone, would compare the pick with itself.
  const otherModel = (r: Ranked) =>
    r.product.variant.modelId !== current.product.variant.modelId;
  const winnerUnchanged = !ranked[0] || !otherModel(ranked[0]);
  // When the pick stays first, show the best model the extra money unlocks.
  const next = winnerUnchanged
    ? (ranked.find(
        (r) => otherModel(r) && r.product.price > current.product.price,
      ) ?? null)
    : ranked[0];
  const deltas = Object.fromEntries(
    keys.map((k) => [
      k,
      next ? next.product.scores[k] - current.product.scores[k] : 0,
    ]),
  ) as Record<Priority, number>;
  const preferenceGain = keys.reduce(
    (s, k) => s + deltas[k] * current.weights[k],
    0,
  );
  const worthIt = Boolean(next) && !winnerUnchanged && preferenceGain >= 5;
  return {
    current,
    next,
    winnerUnchanged,
    oldBudget,
    newBudget,
    extraCost: next ? next.product.price - current.product.price : 0,
    deltas,
    supportDelta:
      !next ||
      next.product.supportYears === null ||
      current.product.supportYears === null
        ? null
        : next.product.supportYears - current.product.supportYears,
    preferenceGain,
    worthIt,
    conclusion: !next
      ? "با این بودجه بیشتر، مدل دیگری که برای نیاز تو بهتر باشد پیدا نشد؛ انتخاب فعلی منطقی است."
      : winnerUnchanged
        ? `با این بودجه هم ${current.product.displayName} بهترین انتخاب برای توئه؛ گزینه گرون‌تری مثل ${next.product.displayName} برای اولویت‌های تو امتیاز کمتری می‌گیره.`
        : worthIt
          ? "برای اولویت‌های تو بهبود معنادار تخمینی ایجاد می‌شود."
          : "برای نیاز تو افزایش بودجه سود کمی دارد؛ انتخاب فعلی منطقی است.",
  };
}
