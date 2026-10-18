# Evaluation methodology — Phase 2

`npm run evaluate -- --save` and `/lab` execute the actual engine on 100 authored cases. CLI uses the seed; lab uses SQLite, so modified data can change results. Categories include budgets, hard/soft semantics, brands, exclusions, profiles, storage, charging, conflicts, no results and sequential follow-ups. Results and per-category counts are computed, never fixed UI constants.

## What the metrics establish

Intent accuracy is the proportion of asserted top-level fields passing. Nested objects use asserted-key matching; nonempty arrays require expected members, while an explicitly empty array must actually be empty. No-results expectations compare the actual ranking length. Categories report case-level passes. These are development fixtures, not a held-out Persian benchmark: the parser was developed against them. Extra unasserted fields can escape this metric, so separate regression tests cover false budget extraction and context preservation.

Only three scenarios have independent, single-author relevance grades. Legacy model names were aligned with the new canonical names; grades were not generated from scores. New unjudged families receive zero in those three cases. All other cases are excluded from ranking metric averages. This incomplete judgment pool can penalize plausible new recommendations and is far too small to claim general recommendation quality.

Recall@5 counts relevant model families retrieved in the first five divided by the number of positively labeled families. NDCG@3 uses gains `2^grade−1`, log2 positional discount, and the ideal descending grade ordering. Top-three relevance is the fraction of three slots with positive labels; an absent slot is not credited. Diversity selection is used for displayed top-three evaluation; raw rank is used for retrieval Recall@5.

P50/P95 measure in-process normalization, extraction, filtering, feature-weight scoring, grouping, Pareto/diversity selection, confidence, counterfactuals, why-not, savings and budget-curve analysis. They exclude HTTP, database, network, AI calls and rendering. Timing is machine-dependent. API telemetry separately records real request latency and token usage where supplied.

## Additional verification

Vitest checks strict data validation, source coverage, null measurements, exact model distinctions, written budgets, RAM/storage semantics, no phantom budgets from units, hard constraints, grouped variants, pairwise preference direction, gaming versus parent selection, megapixel independence, chipset dominance over RAM, remaining support, savings optimality, six budgets, 22 sensitivity scenarios and comparison thresholds. Existing AI failure and invalid-JSON fallback tests are retained.

Playwright checks the original decision journey plus why-not, price curve, saving disclosure, source links, variant selection and two-product debugging. Both collapsed and expanded results are tested at widths 375, 768 and 1440. New browser tests fail on console errors and uncaught page errors, and check rendered images.

The debugger intentionally uses local deterministic extraction, labeled in the UI; API searches retain the configurable provider. No successful paid model call, user-outcome experiment, cross-browser certification or load test has been claimed.

See [evaluation-report.json](evaluation-report.json), [data-quality.json](data-quality.json), and [VERIFICATION.md](VERIFICATION.md) for the measured run. Next work should expand blinded multi-author ranking judgments and independent factual review, not tune scores to maximize these three examples.
