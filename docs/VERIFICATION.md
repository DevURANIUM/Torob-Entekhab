# Verification — Phase 2

Verified on 2026-09-25 in `G:\torob`, Windows, Node 24, npm, SQLite and Chromium. The original Next/React application and red/white Persian RTL design were extended in place.

| Check | Actual result |
| --- | --- |
| `npm run db:setup` | Passed; 61 models, 163 variants, 163 demo snapshots, relational references validated; legacy Product and analytics retained |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 78/78 passed; two test files |
| Ranking behavior/counterfactual group | 15/15 passed, including the three pairwise weight directions |
| `npm run evaluate -- --save` | 100 cases; 144 asserted fields; all cases and assertions passed |
| `npm run build` | Passed; Next.js optimized production build |
| `npm start` | Started successfully on localhost:3000 |
| `npm run test:e2e` against production server | 10/10 passed in 12.1 seconds |
| Responsive checks | 375, 768, 1440px, collapsed and expanded decision tools; no document overflow |
| Browser errors | No uncaught errors or console errors in the instrumented Phase 2 journeys; no hydration errors observed |
| Images | Local labeled SVG silhouettes rendered; no broken image state observed |

A duplicate workspace under `Github/` included its own `.next` generated code. Root ESLint and TypeScript now exclude that independent copy; its files were not modified. Root lint initially traversed its generated artifacts, and the scope fix was followed by a clean lint/typecheck. Vitest prints an upstream advisory about its current CommonJS config loader; tests pass. Playwright prints a terminal color-environment advisory; this is not a browser error.

## Catalog and factual coverage

| Brand | Models | Variants |
| --- | ---: | ---: |
| Apple | 16 | 54 |
| Samsung | 14 | 38 |
| Poco | 4 | 10 |
| Xiaomi | 4 | 8 |
| Redmi | 4 | 10 |
| Honor | 4 | 8 |
| Nothing | 3 | 7 |
| OnePlus | 4 | 7 |
| Motorola | 2 | 3 |
| Google | 6 | 18 |
| Total | 61 | 163 |

Model-level coverage across 54 nullable fact fields: **1306 / 3294 = 39.6478%**. Unknown values: 1988. Every populated fact has dated field-level provenance (1306 high-confidence manufacturer-source transcriptions; zero populated fields lacking verification metadata). Confidence here refers to source attribution, not independently measured truth.

- Screen size: 61/61, 100%.
- Chipset: 61/61, 100%.
- Weight: 59/61, 96.72%.
- IP rating: 47/61, 77.05%.
- Battery capacity: 45/61, 73.77%; Apple capacity intentionally unknown.
- Security policy duration: 23/61, 37.70%; remaining support additionally requires a documented start year.
- Independent endurance, thermal, camera-review and repairability measurements: 0%; deliberately null.
- Price snapshots: 163/163 demo, none older than 30 days at the report's 2026-09-25 reference date.

The denominator includes measurement fields absent throughout the dataset and optional capabilities whose absence has not been verified. It does not count variant RAM/storage or identity dates as model fact fields. Full per-field results are in `data-quality.json`.

## Actual evaluation results

Saved run: `2026-09-25T13:37:57.886Z`.

- Intent asserted-field accuracy: 144/144, 100%; case pass count: 100/100.
- Independently judged ranking scenarios: **3 only**.
- Recall@5: **0.4722222222**.
- NDCG@3: **0.4051620159**.
- Top-three relevance under those labels: **0.2222222222**.
- In-process P50: **14.4465 ms**; P95: **33.2305 ms**.

These weak ranking-label metrics are reported without hiding them. The three inherited, single-author judgment sets omit many newly added plausible phones; new unjudged models receive zero. They are an incomplete development baseline, not evidence that recommendation quality is high. Broader independent judgments remain necessary. Passing pairwise/invariant tests establishes predictable behavior, not validated purchasing outcomes. The 100 intent fixtures overlap parser development and are not held-out generalization tests.

## Browser findings and fixes

The original decision journey, brand refinement, upgrade, comparison, back navigation, product selection, feedback and no-result recovery passed. New journeys exercise why-not selection, score-based savings, the price curve, sensitivity disclosure, variant switching, source URLs, data quality and side-by-side debugging.

Browser verification caught and fixed duplicate evaluation-row keys, a missing explicit accessible name on the model selector, and intrinsic grid width causing overflow at 375px. All tests were rerun against the optimized production server. Screenshots under `test-results/` were visually inspected at 375, 768 and 1440 widths.

## Explicit limits

No current retailer pricing, availability or registration check; all prices are invented demo inputs. Manufacturer pages are the source of facts, not independent lab measurements. Regional and finish variations matter. Some identity dates and many optional specs are unknown. No calibrated camera-quality, real FPS, thermal, repairability or battery-endurance claims. Support estimates have year-level granularity and a versioned reference date. No live paid AI call, held-out language evaluation, multi-author ranking study, load test or Firefox/WebKit certification was performed.
