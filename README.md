# ترب انتخاب

> ترب جواب می‌دهد «این کالا را از کجا بخرم؟»
> این آزمایش یک سؤال قبل‌تر را بررسی می‌کند:
> «اصلاً چی بخرم؟»

**Torob Entekhab — AI Shopping Decision Engine.** A working Persian, RTL smartphone decision demo. Describe a need, inspect the interpretation, get three ranked choices, understand compromises, refine, compare, and test whether spending more is useful. Independent portfolio project; no official Torob affiliation.

## Run locally

Requires Node.js 22.12+ (verified with Node 24.19), npm, and a writable project directory. No API key or external database required.

```powershell
npm install
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

On macOS/Linux replace `Copy-Item .env.example .env` with `cp .env.example .env`. Visit http://localhost:3000. Do not overwrite an existing `.env` when updating the project. The idempotent seed creates 61 models, 163 documented RAM/storage variants and 163 dated demo price snapshots across ten brands. Setup preserves analytics. A small setup helper handles SQLite file creation on Windows.

```bash
npm run lint
npm run typecheck
npm test
npm run evaluate
npm run build
npm start
```

Stop the development server before `npm start` on the same port. For browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright starts a development server if one is not running. Screenshots and failure traces are written under `test-results/`.

## Problem and product hypothesis

Keyword search works once someone has a model in mind. People buying a phone for a parent, a student, or a particular daily routine often have constraints and trade-offs instead of a product name. Our hypothesis: **users who describe needs instead of products can receive a smaller and more relevant candidate set.** Three primary recommendations make the decision manageable, with alternatives available on demand.

Smartphones provide a constrained ontology, understandable trade-offs, and enough variety to demonstrate retrieval and ranking without pretending to solve every shopping vertical. No shopping cart, checkout, or general-purpose chatbot is included.

## User experience and three-minute demo

1. On `/`, enter:

   `برای مامانم گوشی می‌خوام تا ۲۵ میلیون. باتری و صفحه بزرگ مهمه، دوربین خیلی مهم نیست و می‌خوام چند سال راحت کار کنه.`

2. Inspect budget, recipient, priorities and large-screen constraint. Expand **جزئیات برداشت AI**. Open **چرا اینو پیشنهاد دادی؟** and show both raw scores and normalized contribution weights.
3. Enter the follow-up `سامسونگ ترجیح میدم.` The budget and existing priorities remain intact.
4. Enter `اگه تا ۳۰ میلیون هزینه کنم واقعاً چیز بهتری گیرم میاد؟` or use the upgrade button. Explain the actual score and support-year differences. Budget is not silently changed by this analysis.
5. Check two comparison boxes. Open the comparison table and show the preference-aware winner before specifications. Return to results and open product details.
6. Visit `/lab`: live local evaluation, known failures, arbitrary-query debugger, recorded request latency and token costs, events and feedback. Inspect data coverage, side-by-side scoring, sensitivity, and the 100-case evaluation.

More supported queries (the complete evaluation fixtures live in `lib/evaluation/cases.ts`):

```text
برای مامانم گوشی تا ۲۵ میلیون میخوام، باتری خوب و صفحه بزرگ
برای پابجی گوشی تا ۳۰ میلیون میخوام
دوربین خیلی مهمه و تا ۴۰ میلیون بودجه دارم
سامسونگ تا ۲۰ میلیون
گوشی سبک برای استفاده روزمره
گوشی میخوام حداقل ۴ سال نگه دارم
تا ۳۵ میلیون، بازی مهم نیست ولی دوربین و باتری مهمه
برای دانشجو تا ۱۸ میلیون
آیفون نو تا ۵ میلیون
به جز سامسونگ تا ۳۰ میلیون
گوشی ۲۵۶ گیگ
گوشی زیر ۱۸۰ گرم
گوشی با 5G و NFC
موتورولا با صفحه بزرگ
ناتینگ تا ۳۰ میلیون
آنر تا ۲۰ میلیون
برای پدرم گوشی بادوام
بین ۱۵ تا ۲۵ میلیون
```

`آیفون نو تا ۵ میلیون` must show no matches. Numeric fields commit when you leave the field or press Enter, so typing cannot be interrupted by a network request. All current intent fields can be edited or removed. Search intent travels in the URL to comparison/details and survives reload/back navigation. URL sharing includes the original query; avoid personal information.

## Architecture

Next.js 16 App Router + React 19 + strict TypeScript; Zod at the API/model boundary; Prisma 6 + SQLite; Lucide; locally bundled Vazirmatn. Custom CSS gives the RTL surface explicit responsive control without a component framework or animation runtime. Server components render details, comparison and the lab; the interactive search surface fetches validated server routes. The lab receives public catalog facts for local side-by-side debugging; API credentials stay server-only.

```text
User Query / Follow-up
         |
         v
Persian Normalizer
         |
         v
MockAIProvider / OpenAIProvider -- failure --> MockAIProvider
         |
         v
Validated SearchIntent <--------- Editable preferences
         |
         +----> Clarification sensitivity probe
         |
         v
Hard Filters (never silently relaxed)
         |
         v
Eligible SQLite Records
         |
         v
Deterministic weighted ranking
         |
         v
Deduplicate storage variants by family
         |
         v
Top three + alternatives
         |
         +----> Grounded score explanations / trade-offs
         +----> Preference-aware comparison
         +----> Marginal budget analysis
         |
         v
RTL UI --> local events / feedback --> Evaluation Lab
```

```text
app/
  api/search/route.ts        validated extraction/retrieval/ranking API
  api/events/route.ts        local event collection
  search/                   decision workspace
  product/[slug]/           product detail with preference context
  compare/                  weighted comparison
  lab/                      evaluation and debugger
  lab/events/               recent local events
components/                 independent UI pieces, editor, cards, score panel
lib/
  domain.ts                 typed intent and product domain
  data/catalog.ts           validated model/variant/price composition
  ai/                       provider, extraction and grounded explanations
  search/                   normalization, filters, ranking and marginal value
  evaluation/               hand-authored cases and metric implementation
  analytics.ts              local event client
  db.ts                     repository boundary
  state.ts                  shareable validated intent
prisma/                     schema and idempotent seed
tests/                      pure engine and AI resilience tests
e2e/                        browser journeys and responsive checks
scripts/                    database preparation and evaluation CLI
docs/                       product rationale and evaluation methodology
```

## AI architecture

`AIProvider` exposes extraction, refinement and explanation. The mock provider recognizes budgets, ten brands, exclusions, recipients, twelve use cases, priorities and numeric/feature constraints. OpenAI mode sends the intent schema and prior state to an OpenAI-compatible Chat Completions endpoint. It requests JSON, then validates with Zod. Invalid output, network failures, missing keys and timeouts fall back to local extraction. User input is labeled untrusted shopping data in the system instruction. Prices, records and scores are never requested from the model.

Both providers use the same deterministic explanation implementation: model prose cannot add an unverified specification. This deliberately sacrifices stylistic variety for traceability. Successful online calls report token usage; cost is only estimated if explicit per-million rates are configured. The live remote provider has not been verified against a paid account; its failure and invalid-output paths are covered by tests.

## Retrieval and ranking model

For 163 variants, exhaustive filtering is a stronger baseline than approximate vector retrieval: no eligible item is accidentally lost. Conditions include price bounds, included/excluded brands, storage, RAM, battery, screen, weight, software-support years, 5G and NFC. A contradictory intent returns an empty set. Explicit brand mentions currently act as hard filters, including “prefer Samsung”; this simplification is exposed in the editor.

Product facts != derived recommendation scores. Manufacturer facts and their field-level provenance are in `lib/data/catalog-data.json`. `PhoneModel`, `PhoneVariant`, and `PriceSnapshot` are separate Prisma tables. Shared specifications are stored once per model. The old Product table is retained for non-destructive upgrades but is no longer served. Run `npm run db:setup` after updating the seed.

`lib/intelligence/features.ts` produces integer 0–100 heuristic indices with formula text, input fields, coverage and uncertainty. Chipset tier dominates performance; RAM has a bounded contribution. Camera versatility uses OIS, lenses and video, never megapixels as image quality. Battery suitability uses capacity, chip process and screen size, not invented endurance tests. Remaining support counts elapsed time from a documented support-start year, conservatively using January 1. Unknown facts fail explicit hard constraints.

Twelve profile weight maps are combined with visible user overrides and normalized. The score is:

```text
utility = sum(featureIndex[k] * normalizedWeight[k])
coverage = sum(featureCoverage[k] * normalizedWeight[k])
uncertaintyPenalty = 4 * (1 - coverage)
budgetPenalty = max(0, price / budgetMax - 1) * 30
total = utility - uncertaintyPenalty - budgetPenalty
```

Hard-budget candidates never exceed the cap. An approximate budget can expose a separate candidate within its bounded flexibility only when utility improves by at least five points. Main cards still obey the target. Explicit brand mentions act as hard filters; soft-brand preference is not modeled.

## Explainability, diversity and decision tools

`selectDiverseTopRecommendations` removes Pareto-dominated model candidates, then chooses up to three with utility, meaningful feature distance and cheaper alternatives in mind. No brand quota is forced. Variants are grouped by model ID; details let users choose documented configurations.

Card reasons and the score drawer use actual weighted contributions. “Why not?” distinguishes excluded, grouped, dominated, selected and lower-ranked candidates. Sensitivity recomputes 22 ±20% single-weight scenarios; larger camera, gaming and battery scenarios are also computed. The lab exposes the raw data, formula inputs, weights, penalties, ranks and competing candidates.

The six-point budget curve tests 80%, 90%, 100%, 110%, 120% and 130% of the current cap, preserving other constraints. Its displayed knee is the first tested budget retaining 95% of the maximum utility in that interval; this is a discrete heuristic, not a globally optimal price. Save mode finds the cheapest eligible variant retaining at least 93% of the winner's utility, with no more than a 0.15 coverage loss. Savings and upgrade deltas always use demo prices.

Comparison separates “for you” derived scores from complete grouped facts. Numeric advantages require documented thresholds (battery 300 mAh, charging 15 W, weight 15 g, refresh 30 Hz); absent data is not interpreted as absence of a feature. Confidence combines score gap, intent detail, weighted data coverage, ambiguity and candidate count. It is not a calibrated probability.

## Evaluation and metrics

`npm run evaluate -- --save` regenerates `docs/evaluation-report.json`: 100 authored cases spanning budgets, profiles, constraints, negation, follow-ups and empty results. Field accuracy and category pass counts are computed. Three legacy scenarios have independent graded relevance labels; their limited judgments do not cover every newly added family, so unjudged families score zero. This is a development baseline, not a held-out market benchmark. See [evaluation methodology](docs/EVALUATION.md) and [verification](docs/VERIFICATION.md) for actual results.

`npx tsx scripts/data-quality.ts` regenerates model-level coverage in `docs/data-quality.json`. [DATA.md](docs/DATA.md) defines sources, missing-data policy, formulas and updates. Events and AI telemetry retain the existing behavior; no fake users, conversion or revenue metrics are added.

## Environment variables

| Variable                     | Default / purpose                                           |
| ---------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`               | `file:./demo.db`; SQLite path relative to Prisma schema     |
| `AI_MODE`                    | `mock`; set `openai` for remote extraction                  |
| `OPENAI_API_KEY`             | server-only credential; absent means graceful fallback      |
| `OPENAI_BASE_URL`            | `https://api.openai.com/v1`; trusted operator configuration |
| `OPENAI_MODEL`               | `gpt-4.1-mini`; configurable compatible model               |
| `AI_INPUT_COST_PER_MILLION`  | USD input-token rate; 0 means unknown pricing               |
| `AI_OUTPUT_COST_PER_MILLION` | USD output-token rate; 0 means unknown pricing              |

Restart the server after changing environment variables. Never prefix secrets with `NEXT_PUBLIC_`. `.env` and SQLite files are ignored.

## Privacy, security and production boundary

Requests have length bounds, Zod schemas and per-process rate limits. React escapes displayed text; no raw HTML execution. The AI request has a ten-second timeout. Invalid schema output cannot enter ranking. Prompt injection cannot directly add catalog items, execute tools, or access secrets; schema validation cannot guarantee semantic fidelity, so interpreted intent remains visible and editable.

Local analytics stores event type, optional product id/category and time, never raw query text. AI telemetry stores token counts, latency, mode and estimated cost. Queries are present in the shareable URL and, in remote mode, sent to the configured AI provider. Server/access logs may contain URLs. There is no login, cookie tracking or external analytics.

This is a production-buildable **demo**, not an audited live shopping service. The public lab is intended for local evaluation. Before public hosting, protect lab routes, enforce retention, add origin checks and a trusted-proxy-aware distributed rate limiter, and use durable database storage. The in-memory limiter does not coordinate multiple instances. The current app is not published externally.

For PostgreSQL, change the Prisma datasource provider to `postgresql`, set its connection string, create reviewed migrations, regenerate the client and seed. `PhoneModel`/`PhoneVariant`/`PriceSnapshot`/`Event`/`AiRun` and the `getProducts()` boundary are portable; no SQLite-specific SQL is used. A live catalog should use normalized, indexed searchable columns rather than the small-demo JSON payload and should include source URLs, verification dates and per-field coverage.

## Failure modes and trade-offs

- All prices are invented demo fixtures, explicitly labeled «قیمت نمونه برای دمو», not current market offers. Stock, registration, warranty and regional compatibility must be independently checked.
- The catalog is a curated set of 61 models / 163 documented variants, not a complete or latest-market inventory. Honor X and Moto G are not included where verification was insufficient.
- Missing facts remain null. Apple RAM, mAh capacity and guaranteed support periods are not filled from assumptions. Independent camera, thermal, battery-endurance and repairability measurements are absent. Hardware heuristics are not benchmarks.
- Source verification establishes what a manufacturer page says, not independent laboratory accuracy. Regional combinations and finish-dependent weights are explicit. Support estimates have up to one year of date granularity uncertainty.
- All current imagery uses labeled local device silhouettes; no uncertain remote licenses or hotlinks. The abstraction supports primary/alternate images with error fallback.
- Persian parsing supports written numbers and tested conversational forms, not unrestricted negation or arbitrary semantic reasoning. Exact FPS, night-image quality and advertising experience are not guaranteed.
- Only three ranking cases are judged, with incomplete single-author labels. Heuristics have not been learned or calibrated against user outcomes.
- The remote provider's live quality and cost have not been measured without credentials. The offline lab evaluates mock extraction only.
- Modern Chromium is tested; WebKit/Firefox, assistive-technology audits, concurrent-load benchmarks and formal accessibility certification have not been run.

## Future experiments

**A.** Three recommendations versus ten: acceptance and time to shortlist.

**B.** Natural-language onboarding versus filter onboarding: task completion and correction rate.

**C.** Immediate clarification versus preliminary results: abandonment and relevance improvement.

**D.** Explanations shown by default versus on demand: decision confidence and comprehension.

**E.** Preference-aware ranking versus a popularity baseline: blinded graded relevance and selection.

**F.** “Spend more?” analysis: decision confidence, budget regret and whether a useful no-upgrade recommendation increases trust.

Read [product decisions](docs/PRODUCT.md) and [evaluation methodology](docs/EVALUATION.md) before interpreting metrics.
