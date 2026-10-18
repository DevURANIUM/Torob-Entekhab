# Data contract and provenance

We prefer missing data over fabricated data.

Product facts != derived recommendation scores. A non-null fact means a curated manufacturer specification, not an independent laboratory measurement. Prices are a third, explicitly simulated layer.

## Schema and storage

`lib/data/schema.ts` validates `catalog-data.json` at load/seed time. Prisma stores:

- PhoneModel: identity, regional scope, 54 nullable structured facts, per-field provenance and an image descriptor.
- PhoneVariant: model relation, an explicitly documented RAM/storage combination, condition, region and configuration source. Apple RAM stays null.
- PriceSnapshot: variant relation, positive TOMAN amount, source, ISO observedAt, isDemo. Composition selects the newest snapshot.

There are 61 models and 163 variants across Samsung, Apple, Xiaomi, Redmi, Poco, Honor, Nothing, Motorola, Google and OnePlus. The old Product table is retained but not used by the application. No analytics are deleted by seeding. Model facts are stored once; runtime projections provide compatibility with the existing UI.

Strict schemas reject out-of-range dimensions, capacity, refresh rates, RAM/storage, nonpositive prices, unknown fields, duplicate identifiers, duplicate region/configuration pairs, orphan relations, missing prices and populated facts without provenance. RAM means physical RAM; virtual expansion is not counted.

Identity years, announcement dates and release dates may be null. `marketStatus=documented` is not a claim of current manufacture or retailer availability. `condition=new` describes the demo offer, not verified stock. International/US specifications do not prove compatibility, registration or eSIM service availability in Iran.

## Sources and verification

Source preference is manufacturer specifications and launch/support announcements, followed by established specification references, then reputable reviews for independently measured properties. This revision uses manufacturer sources only. See [source manifest](sources.json); the catalog has the exact source URL and verification timestamp for each populated fact and each variant.

Verification date: 2026-09-25. Pages were read directly, including Apple model-specific support pages, Xiaomi global/UK specs, Samsung newsroom tables and regional support, Google historical model sections, Honor structured specs, OnePlus UK specs, Nothing EU pages and Motorola regional support. Only supported configurations were admitted. Examples: OnePlus 12R UK has 16/256; Honor 200 Pro global has 12/512; Redmi Note 13 Pro 5G global has 8/256 and 12/512. Configurations from different regions are not blindly cross-multiplied.

Field confidence expresses confidence in the transcription/source attribution. It does not imply an independent test or validated recommendation quality. Manufacturer brightness and charging are claimed maxima, not measured everyday performance. Xiaomi 14's telephoto uses a 50 MP sensor but its ordinary photo mode is documented as 32 MP. Finish-dependent weights use the specified glass/plastic finish; other finishes may differ.

Unknown and absent are different. Null means not verified. False is used only for documented absence. Dedicated telephoto data is not populated from an in-sensor crop. Unknown facts cannot satisfy mandatory hardware constraints. Full-detail UI and comparison display null as «نامشخص».

No independent camera scores, thermal measurements, battery endurance or repairability scores have been supplied. Those fields remain null for all models. Apple specification pages do not supply the RAM/mAh/max-wired-power facts used by other brands, so those remain unknown. Support policy has uneven coverage, deliberately exposed in `/lab`.

## Price policy

Every current price is a deterministic, invented demo amount labeled «قیمت نمونه برای دمو». It is not an estimate of today's Iranian price. All 163 snapshots are dated 2026-09-25, TOMAN, isDemo=true. Relative variant premiums are simulation inputs. There are no live retailer feeds, stock checks, discounts or purchase offers. Staleness is computed as older than 30 days; recent demo timestamps do not make a price real.

## Derived feature model

All output indices are clamped and rounded to integer 0–100. They are not benchmarks, probabilities or predicted life spans. Each feature carries formula text, factual input keys and coverage. See `lib/intelligence/features.ts` for executable constants, tier mapping and version.

| Index | Calculation / limitations |
| --- | --- |
| Performance | 90% ordinal chipset engineering tier + up to 10 points from physical RAM, capped at 12 GB. Unknown chipset uses a conservative tier; unknown RAM uses a neutral 6 GB scoring placeholder, never a factual claim. No FPS or thermal test claims. |
| Battery | 45 + (capacity−3500)/60, +5 when verified node ≤4nm, −3 for screen >6.7 inches. Missing capacity uses a conservative scoring prior. It is suitability, not hours of endurance. Charging is separate. |
| Camera | Baseline 35, OIS +20, ultrawide +10, dedicated telephoto +15, rear 4K +12, front 4K +8. Megapixels contribute zero. This is capability/versatility, not tested image quality or night performance. Missing capability earns no bonus. |
| Display | Baseline 40, OLED +20, capped refresh-rate bonus, ≥400ppi +8, HDR +7. Peak brightness does not dominate. |
| Charging | Baseline 25, capped wired-power contribution, wireless +10. Unknown wired power receives a conservative score. No exact charging-time promise. |
| Portability | 95 minus 0.55 per gram over 150, minus 15 per inch over 6.2. Missing weight uses conservative 40. |
| Storage | Logarithmic capacity benefit plus bounded physical RAM benefit; virtual RAM excluded. |
| Connectivity | Baseline 30; verified 5G +20, NFC +15, eSIM +15, Wi-Fi ≥6 +20. Regional availability remains a caveat. |
| Simplicity | Neutral 50 for every model, coverage zero. No unsupported clean-software or accessibility superiority by brand. |
| Longevity | Support component (capped at 65), plus 15% performance and 15% storage headroom, plus five points for verified IP67/IP68. Remaining support uses the verified start year, counted conservatively from January 1, as of the versioned 2026-09-25 evaluation date. Uncertainty is up to one year; exact end dates/lifespan are not claimed. Missing start or policy means unknown remaining support. |
| Value | Mean performance/camera/battery utility minus a capped-direction price burden plus baseline. Depends on demo price, not real market value. |

Feature coverage lowers ranking through a separate uncertainty penalty and affects recommendation confidence. Derived confidence is never labeled high. Repairability, unmeasured thermals and software simplicity are not given fabricated brand bonuses. Tags are rules over facts/indices: lightweight ≤180g, compact ≤6.3 inches, large-screen ≥6.7 inches, fast charging ≥60W, wireless, gaming tier and remaining support ≥4 years.

## Ranking and decision policy

Twelve profiles define weights; explicit user edits override the profile values. Weights normalize to one. Hard filters run first, model grouping second, Pareto/diversity selection third. Unknown-required fields fail filters. A weighted coverage penalty penalizes missing evidence. The score panel exposes every contribution and penalty.

Soft budgets expose bounded stretch candidates separately, requiring at least five utility points of benefit. Save mode uses 93% utility retention and a coverage guard. Sensitivity is local (±20% weights), not a guarantee of robustness to missing facts or model error. The budget knee is discrete and limited to six tested caps. Numeric comparison thresholds are in `lib/specifications.ts`; 5010 versus 5000mAh receives no advantage highlight.

## Update strategy

1. Read the specific model/region official page; verify each added fact/configuration. Do not copy a neighboring model's data.
2. Edit the canonical model or variant and its exact field provenance; keep unknown fields null. Record conflicting regional variants explicitly.
3. Add a new dated price snapshot with isDemo and source; do not relabel simulation as live pricing.
4. Bump the feature version/as-of date deliberately when changing time-based support or scoring. Do not silently change historical evaluation semantics.
5. Run validation, unit tests, 100-case evaluation and source spot checks; regenerate `docs/data-quality.json` and `docs/evaluation-report.json`.
6. Run `npm run db:setup` with the server stopped if Prisma's Windows engine is locked; this upserts normalized records and preserves analytics.

Source-link validation cannot prove correctness of a parsed value. This remains a manually curated development dataset and needs independent factual review before use in a purchasing service. The source manifest is an audit index, not an automated freshness monitor.
