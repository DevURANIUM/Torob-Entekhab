# Product decisions

## The job to be done

“I need a phone for my mother; I know the budget and what should feel good, but not which model.” The desired output is a defensible shortlist, not fluent conversation or a catalog of 300 items.

**Hypothesis:** Users who describe needs instead of products can receive a smaller and more relevant candidate set.

## Why decision search

Keyword search starts too late: it assumes a product name. A pure chatbot hides the candidate universe, makes comparison difficult and encourages ungrounded claims. A generic recommendation engine starts with behavioral histories we do not have. Decision search exposes the bridge between language, constraints, candidate retrieval, preferences and the decision.

Smartphones supply understandable trade-offs and a bounded schema. We explicitly avoid other verticals. Three primary choices control cognitive load; a few alternatives remain accessible. Storage variants are deduplicated so apparent choice is not inflated. Roles are factual: “better value” only when the value score is higher; otherwise a real strength or lower price is named.

## Assumptions

- People can articulate at least one useful constraint or preference.
- A smaller shortlist is helpful when reasons and compromises are visible.
- Users will correct an interpretation if editing is inexpensive.
- Relative feature scores can approximate utility, pending real user validation.
- Explicit maximum price is hard; approximate budgets permit a separately labeled, bounded stretch candidate. Brand mentions are hard filters in this MVP; this sacrifices nuanced soft preference handling for inspectability.
- Recipient-based defaults are suggestions, not truths about an age or group. They are visible and removable.
- Manufacturer facts have provenance; prices remain demo fixtures and derived scores cannot validate purchasing quality.

## Critical choices

The LLM extracts a typed preference model; it never produces catalog data or ranking scores. Deterministic ranking can be audited and regression-tested. Explanations come from the same weighted contribution objects. The budget upgrade uses the same constraints and compares actual fixtures, including a valid “do not spend more” conclusion.

Clarification uses a sensitivity probe: if changing a major preference cannot change the top family, interrupting the user adds little value. Confidence is explicitly heuristic. Ties and limited knowledge should not look like calibrated probabilities.

The interface is Persian RTL with local fonts, restrained red accents, inline edits and one accessible native explanation dialog. Product details and comparison preserve intent in the URL. Synthetic data labeling appears globally and on detail pages. No fake social proof, merchants or live-pricing promises.

## Success metrics and interpretation

| Metric                    | Operational definition                          | Caution                                                                   |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Recommendation acceptance | `product_selected` / searches                   | Local counts lack session deduplication; do not call them user conversion |
| Refinement rate           | `followup_submitted` / searches                 | Can mean engagement or poor first results                                 |
| Comparison rate           | `comparison_started` / searches                 | Higher is not automatically better                                        |
| Time to shortlist         | Future session-linked first search to selection | Not claimed by current event counts                                       |
| User feedback             | Positive/negative categories                    | Self-selection bias; small samples                                        |
| Ranking relevance         | NDCG@3 and top-three judged relevance           | Current three judged cases are insufficient for generalization            |

The current lab shows raw event counts, category feedback and request telemetry. It deliberately avoids claiming unique-user funnels without a session model. A future privacy-preserving session id could support time-to-shortlist and repeated-action deduplication with a retention policy.

## Learning agenda

Run experiments A–F from the README. First replace synthetic data with verified catalog records, recruit diverse Persian speakers, collect independent product-family relevance judgments, and compare against price-only/popularity/filter baselines. Measure whether explanations are understood, not merely opened. Track correction patterns to identify ontology gaps before adding more verticals.
