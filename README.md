# ترب انتخاب

> ترب جواب می‌دهد «این کالا را از کجا بخرم؟»
> این آزمایش یک سؤال قبل‌تر را بررسی می‌کند:
> «اصلاً چی بخرم؟»

**Torob Entekhab — AI Shopping Decision Engine.** A working Persian, RTL smartphone decision demo. Describe a need, inspect the interpretation, get three ranked choices with real Torob prices and photos, understand compromises, refine, compare, and test whether spending more is useful. Phones only, by design. Independent portfolio project; no official Torob affiliation.

## Run locally

Requires Node.js 22.12+ (verified with Node 24.19), npm, and a writable project directory. No API key or external database required.

```powershell
npm install
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

On macOS/Linux replace `Copy-Item .env.example .env` with `cp .env.example .env`. Visit http://localhost:3000. Do not overwrite an existing `.env` when updating the project. The idempotent seed creates 61 models, 163 documented RAM/storage variants, 163 dated demo price snapshots and the Torob price snapshots from `lib/data/torob-snapshot.json` (49 variants as of 2026-10-18) across ten brands. Setup preserves analytics. A small setup helper handles SQLite file creation on Windows.

No Torob connection is needed to run the app: prices and photos come from the committed snapshot. Only the live seller list on product pages calls Torob, and it falls back to the snapshot when Torob is unreachable. See [Live prices and photos from Torob](#live-prices-and-photos-from-torob) to refresh prices.

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

Playwright starts its own development server on port 3100 with `PRICE_SOURCE=demo`, so the journeys' budgets stay meaningful as market prices move. Next.js allows one `next dev` per project folder, so stop any running `npm run dev` first. Screenshots and failure traces are written under `test-results/`.

## Live prices and photos from Torob

Product prices, seller counts and photos come from Torob through [torob-mcp](https://github.com/mmdju/torob-mcp), a read-only MCP server over Torob's public API. Manufacturer specifications and derived scores are unchanged.

- `lib/torob/client.ts` speaks MCP JSON-RPC over Streamable HTTP (one POST per tool call).
- `lib/torob/match.ts` maps Torob cards onto catalog variants: same model, storage and RAM, the same 4G/5G edition, new condition only (`Stock`/used and `Active` iPhones are never matched), preferring a price many shops carry over a single-shop outlier. Only handset listings (titles starting «گوشی») are accepted, so cases, chargers and screen guards never enter the catalog. Rules are unit-tested in `tests/torob.test.ts`.
- `npm run torob:sync` writes `lib/data/torob-snapshot.json` (committed). The app reads it at runtime, so prices and photos work offline; `npm run db:setup` also seeds them as non-demo `PriceSnapshot` rows.
- Product pages stream live seller offers and Torob's price chart (`lib/torob/live.ts`, cached 30 minutes). When Torob is unreachable they fall back to the snapshot price and a link.
- Variants Torob does not list new are kept for "why not?" answers but marked unavailable; ranking never mixes Torob and demo prices.
- Product photos are Torob's, requested at the slot's size from Torob's own CDN (`…webp_/336x336.jpg`), with the original and then a drawn silhouette as fallbacks (`components/ui/phone-image.tsx`).

Torob answers bursts with a bot challenge (HTTP 490), and the hosted endpoint is rate limited. For syncing, run torob-mcp on your own machine:

```powershell
git clone https://github.com/mmdju/torob-mcp; cd torob-mcp; npm install
$env:PORT=3333; node dist/index.js --http
# in this project:
$env:TOROB_MCP_URL="http://127.0.0.1:3333/mcp"; npm run torob:sync
```

Prices are stored exactly as Torob returns them, in Toman: the same figure as Torob's own «از … تومان» (for example Galaxy A55 256/8 at 108,000,000). Do not convert them.

Sync options:

| Variable                  | Effect                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| `TOROB_MCP_URL`           | torob-mcp endpoint; a local `--http` server avoids the hosted rate limit      |
| `TOROB_SYNC_DELAY_MS`     | pause between calls (default 3200; 4000–6000 is gentler on Torob)             |
| `TOROB_SYNC_FRESH=1`      | refetch today's prices instead of reusing the day-old cache in `.cache/torob` |
| `TOROB_SYNC_CACHE_ONLY=1` | rebuild the snapshot from cached responses without calling Torob              |

When Torob keeps challenging a run, the script stops calling it, finishes from cache and keeps earlier rows for the rest; rerun later to fill them in. Snapshot rows are keyed by fetch time, so a same-day refresh replaces rows already seeded. Run `npm run db:setup` after a sync.

`PRICE_SOURCE=demo` switches the whole app back to the fixed demo prices. Unit tests, `npm run evaluate`, the lab evaluation and the Playwright journeys (port 3100) always use demo prices, because their budgets were authored against them.

## Problem and product hypothesis

Keyword search works once someone has a model in mind. People buying a phone for a parent, a student, or a particular daily routine often have constraints and trade-offs instead of a product name. Our hypothesis: **users who describe needs instead of products can receive a smaller and more relevant candidate set.** Three primary recommendations make the decision manageable, with alternatives available on demand.

Smartphones provide a constrained ontology, understandable trade-offs, and enough variety to demonstrate retrieval and ranking without pretending to solve every shopping vertical. No shopping cart, checkout, or general-purpose chatbot is included.

## User experience and three-minute demo

1. On `/`, enter:

   `برای مامانم گوشی می‌خوام تا ۲۵ میلیون. باتری و صفحه بزرگ مهمه، دوربین خیلی مهم نیست و می‌خوام چند سال راحت کار کنه.`

2. Inspect budget, recipient, priorities and large-screen constraint. Expand **جزئیات برداشت AI**. Open **چرا اینو پیشنهاد دادی؟** and show both raw scores and normalized contribution weights.
3. Enter the follow-up `سامسونگ ترجیح میدم.` The budget and existing priorities remain intact.
4. Enter `اگه تا ۳۰ میلیون هزینه کنم واقعاً چیز بهتری گیرم میاد؟` or use the upgrade button. Explain the actual score and support-year differences. Budget is not silently changed by this analysis. If the current pick stays best at the higher budget, the panel says so and compares it with the best pricier different model; it never compares a phone with itself.
5. Check two comparison boxes. Open the comparison table and show the preference-aware winner before specifications. Return to results and open product details.
6. Visit `/lab`: live local evaluation, known failures, arbitrary-query debugger, recorded request latency and token costs, events and feedback. Inspect data coverage, side-by-side scoring, sensitivity, and the 100-case evaluation.

The budgets in this walkthrough and the queries below were written for the demo prices. With Torob prices (cheapest listed handset about 65 million Toman on 2026-10-18), run with `PRICE_SOURCE=demo` or raise the budgets, for example `تا ۱۵۰ میلیون`.

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

Next.js 16 App Router + React 19 + strict TypeScript; Zod at the API/model boundary; Prisma 6 + SQLite; Lucide; locally bundled Vazirmatn. Custom CSS gives the RTL surface explicit responsive control without a component framework or animation runtime. Server components render details, comparison and the lab; the interactive search surface fetches validated server routes; product pages stream Torob's seller list through React Suspense. The lab receives public catalog facts for local side-by-side debugging; API credentials stay server-only.

### Design

`app/globals.css` follows Torob's visual language: Torob red (`--brand: #d72e3e`) for actions and the recommended pick, white surfaces on a neutral grey page, and Vazirmatn at heavy weights for headlines and scores. All colours are tokens on `:root`, redefined for `prefers-color-scheme: dark`. Layouts are mobile-first:

| Width         | Results layout                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| under 720px   | one column; the intent bar keeps budget, budget type and brand on one row; under 560px the explanation opens as a bottom sheet |
| 720–1079px    | two columns; the best pick spans the row with its photo beside the details                                                     |
| 1080px and up | three equal columns                                                                                                            |

From 1000px the home hero shows three real phones fanned beside the composer; on smaller screens they sit below it.

Selects use the browser's customizable select where supported (styled list, check mark, rotating chevron) and a matching chevron elsewhere. Keyboard focus is always visible, motion respects `prefers-reduced-motion`, and the pages never scroll sideways at 375px (checked by the e2e suite).

```text
User Query / Follow-up
         |
         v
Persian Normalizer
         |
         v
Claude / OpenAI / DeepSeek / Gemini / OpenRouter (order and models from /settings/ai) -- all fail --> MockAIProvider
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
Eligible SQLite Records + Torob price snapshot
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
  api/ai/                    AI settings, model lists and test calls
  search/                   decision workspace
  product/[slug]/           product detail with preference context
  compare/                  weighted comparison
  lab/                      evaluation and debugger
  settings/ai/              AI service, order and model selection
  lab/events/               recent local events
components/
  layout/                   site header and footer
  home/                     need composer and hero
  search/                   results, intent editor, cards, decision tools, panels
  product/                  specifications, Torob offers, selection
  settings/                 AI settings form
  lab/                      search debugger
  ui/                       phone image with Torob CDN resizing and fallback
lib/
  domain.ts                 typed intent and product domain
  data/catalog.ts           validated model/variant/price composition
  ai/                       five-service provider chain, settings, model lists, cost
  search/                   normalization, filters, ranking and marginal value
  evaluation/               hand-authored cases and metric implementation
  analytics.ts              local event client
  torob/                    torob-mcp client, variant matching, snapshot, live cache
  db.ts                     repository boundary
  state.ts                  shareable validated intent
prisma/                     schema and idempotent seed
tests/                      pure engine and AI resilience tests
e2e/                        browser journeys and responsive checks
scripts/                    database preparation, evaluation CLI, Torob sync
docs/                       product rationale and evaluation methodology
```

## AI architecture

Intent extraction can use five remote services, with local rule-based extraction (`mock`) always behind them:

| Service            | Module                                  | How it is called                                                                                                                                                                                                                            | Default model             |
| ------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Claude (Anthropic) | `lib/ai/providers/claude.ts`            | Official `@anthropic-ai/sdk`, `client.beta.messages.parse` with structured outputs (`betaZodOutputFormat(intentSchema)`), adjustable effort (default `low`, a short extraction), and server-side refusal fallbacks (`fallbacks: "default"`) | `claude-opus-5-5`         |
| OpenAI             | `lib/ai/providers/openai-compatible.ts` | Chat Completions in JSON mode, schema embedded in the instruction                                                                                                                                                                           | `gpt-4.1-mini`            |
| DeepSeek           | same                                    | DeepSeek's OpenAI-compatible API at `https://api.deepseek.com`                                                                                                                                                                              | `deepseek-flash`          |
| Gemini (Google)    | same                                    | Gemini's OpenAI-compatible endpoint at `https://generativelanguage.googleapis.com/v1beta/openai`                                                                                                                                            | `gemini-3.8-flash`        |
| OpenRouter         | same                                    | `https://openrouter.ai/api/v1` with its optional attribution header; one key reaches hundreds of models                                                                                                                                     | `google/gemini-3.8-flash` |

`lib/ai/catalog.ts` is the single registry of the five services (env prefix, endpoint, default model, suggested models, where to get a key). All receive the same instructions (`lib/ai/instructions.ts`): user text is untrusted shopping data, and prices, records and scores are never requested from the model. Every reply is validated with the same Zod `intentSchema`; an invented brand or malformed field is rejected, never trusted. A JSON reply wrapped in a code fence is unwrapped first.

### Choosing services and models

`/settings/ai` (linked as «تنظیمات AI» in the header and from `/lab`) controls which service answers first (or `auto`, or no AI), the fallback order, the model of each service and Claude's effort. Model fields suggest the provider's live model list: Claude through `client.models.list()`, OpenAI, DeepSeek and Gemini through their `/models` endpoint (non-chat models such as embeddings and image models are hidden), and OpenRouter's public list filtered to models that accept a JSON response format. When a list cannot be read, built-in suggestions are shown; any model id can still be typed. «امتحان» sends one real request with the edited model and reports latency, the parsed budget and brand, and cost. Each call costs tokens.

Settings are stored in the `AppSetting` table and override the environment; «بازگشت به تنظیمات .env» deletes them. API keys never leave the server environment: the settings schema has no field for them and rejects unknown fields. Saving settings and test calls are allowed on a development server; in production they require `AI_SETTINGS_TOKEN`, sent from the page's password field as `x-settings-token`. Without the token, the page is read-only in production.

`lib/ai/provider.ts` tries the first service, then the rest in order, skipping any without an API key; a network error, timeout, HTTP error, refusal, cut-off output or invalid JSON moves to the next. If none answers, local extraction runs. The response reports which service and model answered, whether it was a fallback, and which services were tried. The search page says when a backup service answered.

Every service uses the same deterministic explanation implementation: model prose cannot add an unverified specification. This deliberately sacrifices stylistic variety for traceability. Each call records service, model, token usage and latency in `AiRun`; `/lab` shows a per-service table (key configured, model, order, successful calls, latency, cost). Cost (`lib/ai/cost.ts`) uses per-service rates, then the shared `AI_*` rates; list prices of the current Claude models are built in. The five live services have not been verified against paid accounts here; their request shapes, fallback chain, settings, model lists, refusal handling and invalid-output paths are covered by `tests/ai-providers.test.ts`.

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

The value index was calibrated on demo prices. With Torob prices, the price that enters it is divided by the market level (the median ratio of Torob to demo price over variants that have both), so value scores keep their shape while every displayed price, budget and saving stays in real Toman.

Hard-budget candidates never exceed the cap. An approximate budget can expose a separate candidate within its bounded flexibility only when utility improves by at least five points. Main cards still obey the target. Explicit brand mentions act as hard filters; soft-brand preference is not modeled.

## Explainability, diversity and decision tools

`selectDiverseTopRecommendations` removes Pareto-dominated model candidates, then chooses up to three with utility, meaningful feature distance and cheaper alternatives in mind. No brand quota is forced. Variants are grouped by model ID; details let users choose documented configurations.

Card reasons and the score drawer use actual weighted contributions. “Why not?” distinguishes excluded, grouped, dominated, selected and lower-ranked candidates. Sensitivity recomputes 22 ±20% single-weight scenarios; larger camera, gaming and battery scenarios are also computed. The lab exposes the raw data, formula inputs, weights, penalties, ranks and competing candidates.

The six-point budget curve tests 80%, 90%, 100%, 110%, 120% and 130% of the current cap, preserving other constraints. Its displayed knee is the first tested budget retaining 95% of the maximum utility in that interval; this is a discrete heuristic, not a globally optimal price. Save mode finds the cheapest eligible variant retaining at least 93% of the winner's utility, with no more than a 0.15 coverage loss. Savings and upgrade deltas use the active price source (Torob by default). The upgrade analysis only counts a different model as "something better"; when the current pick stays first, it shows the best pricier different model within the higher budget, or says that no such model exists.

Comparison separates “for you” derived scores from complete grouped facts. Numeric advantages require documented thresholds (battery 300 mAh, charging 15 W, weight 15 g, refresh 30 Hz); absent data is not interpreted as absence of a feature. Confidence combines score gap, intent detail, weighted data coverage, ambiguity and candidate count. It is not a calibrated probability.

## Evaluation and metrics

`npm run evaluate -- --save` regenerates `docs/evaluation-report.json`: 100 authored cases spanning budgets, profiles, constraints, negation, follow-ups and empty results. Field accuracy and category pass counts are computed. Three legacy scenarios have independent graded relevance labels; their limited judgments do not cover every newly added family, so unjudged families score zero. This is a development baseline, not a held-out market benchmark. See [evaluation methodology](docs/EVALUATION.md) and [verification](docs/VERIFICATION.md) for actual results.

`npx tsx scripts/data-quality.ts` regenerates model-level coverage in `docs/data-quality.json`. [DATA.md](docs/DATA.md) defines sources, missing-data policy, formulas and updates. Events and AI telemetry retain the existing behavior; no fake users, conversion or revenue metrics are added.

## Environment variables

| Variable                                      | Default / purpose                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`                                | `file:./demo.db`; SQLite path relative to Prisma schema                            |
| `AI_MODE`                                     | `mock`; or `auto`, `claude`, `openai`, `deepseek`, `gemini`, `openrouter`          |
| `AI_PROVIDERS`                                | `claude,openai,deepseek,gemini,openrouter`; fallback order                         |
| `AI_SETTINGS_TOKEN`                           | required to save AI settings or run test calls in production                       |
| `AI_TIMEOUT_MS`                               | `15000`; per-call timeout for every service                                        |
| `ANTHROPIC_API_KEY`                           | server-only Claude credential; absent means skipped                                |
| `ANTHROPIC_MODEL`                             | `claude-opus-5-5`                                                                  |
| `ANTHROPIC_EFFORT`                            | `low`; `medium`, `high`, `xhigh` or `max`                                          |
| `OPENAI_API_KEY`                              | server-only credential; absent means skipped                                       |
| `OPENAI_BASE_URL`                             | `https://api.openai.com/v1`; trusted operator configuration                        |
| `OPENAI_MODEL`                                | `gpt-4.1-mini`; configurable compatible model                                      |
| `DEEPSEEK_API_KEY`                            | server-only credential; absent means skipped                                       |
| `DEEPSEEK_BASE_URL`                           | `https://api.deepseek.com`                                                         |
| `DEEPSEEK_MODEL`                              | `deepseek-flash`                                                                   |
| `GEMINI_API_KEY`                              | server-only credential; absent means skipped                                       |
| `GEMINI_BASE_URL`                             | `https://generativelanguage.googleapis.com/v1beta/openai`                          |
| `GEMINI_MODEL`                                | `gemini-3.8-flash`                                                                 |
| `OPENROUTER_API_KEY`                          | server-only credential; absent means skipped                                       |
| `OPENROUTER_BASE_URL`                         | `https://openrouter.ai/api/v1`                                                     |
| `OPENROUTER_MODEL`                            | `google/gemini-3.8-flash`                                                          |
| `OPENROUTER_SITE_URL` / `OPENROUTER_APP_NAME` | optional attribution sent to OpenRouter                                            |
| `TOROB_MCP_URL`                               | hosted torob-mcp endpoint; point at a local `--http` server                        |
| `PRICE_SOURCE`                                | `torob`; set `demo` for the fixed demo prices                                      |
| `TOROB_SYNC_*`                                | sync-only options; see the Torob section above                                     |
| `AI_INPUT_COST_PER_MILLION`                   | USD input-token rate; 0 means unknown pricing                                      |
| `AI_OUTPUT_COST_PER_MILLION`                  | USD output-token rate; 0 means unknown pricing                                     |
| `<SERVICE>_*_COST_PER_MILLION`                | per-service rates (`ANTHROPIC_`, `OPENAI_`, `DEEPSEEK_`, `GEMINI_`, `OPENROUTER_`) |

Restart the server after changing environment variables. Never prefix secrets with `NEXT_PUBLIC_`. `.env` and SQLite files are ignored.

## Privacy, security and production boundary

Requests have length bounds, Zod schemas and per-process rate limits. React escapes displayed text; no raw HTML execution. The AI request has a ten-second timeout. Invalid schema output cannot enter ranking. Prompt injection cannot directly add catalog items, execute tools, or access secrets; schema validation cannot guarantee semantic fidelity, so interpreted intent remains visible and editable.

Local analytics stores event type, optional product id/category and time, never raw query text. AI telemetry stores token counts, latency, mode and estimated cost. Queries are present in the shareable URL and, in remote mode, sent to the configured AI provider. Server/access logs may contain URLs. There is no login, cookie tracking or external analytics.

This is a production-buildable **demo**, not an audited live shopping service. The public lab is intended for local evaluation. Before public hosting, protect lab routes, enforce retention, add origin checks and a trusted-proxy-aware distributed rate limiter, and use durable database storage. The in-memory limiter does not coordinate multiple instances. The current app is not published externally.

For PostgreSQL, change the Prisma datasource provider to `postgresql`, set its connection string, create reviewed migrations, regenerate the client and seed. `PhoneModel`/`PhoneVariant`/`PriceSnapshot`/`Event`/`AiRun` and the `getProducts()` boundary are portable; no SQLite-specific SQL is used. A live catalog should use normalized, indexed searchable columns rather than the small-demo JSON payload and should include source URLs, verification dates and per-field coverage.

## Failure modes and trade-offs

- Prices are Torob's lowest listed price for the matched listing at sync time, not a live quote; they drift during the day. Stock, registration, warranty and regional compatibility must be checked with the seller. With `PRICE_SOURCE=demo`, prices are invented fixtures labeled «قیمت نمونه برای دمو».
- Torob coverage is partial: 49 of 163 variants are priced (2026-10-18). Many 2023–24 models are sold only as used ("Stock") and stay unavailable; OnePlus, Motorola and Pixel were not reached because Torob challenged the sync. Torob answers bursts with a bot challenge (HTTP 490) that clears after minutes to half an hour.
- The catalog is a curated set of 61 models / 163 documented variants, not a complete or latest-market inventory. Honor X and Moto G are not included where verification was insufficient.
- Missing facts remain null. Apple RAM, mAh capacity and guaranteed support periods are not filled from assumptions. Independent camera, thermal, battery-endurance and repairability measurements are absent. Hardware heuristics are not benchmarks.
- Source verification establishes what a manufacturer page says, not independent laboratory accuracy. Regional combinations and finish-dependent weights are explicit. Support estimates have up to one year of date granularity uncertainty.
- Product photos are loaded from Torob's CDN (34 of 61 models as of 2026-10-18); models without a Torob photo, or whose photo fails to load, show a drawn device silhouette.
- Persian parsing supports written numbers and tested conversational forms, not unrestricted negation or arbitrary semantic reasoning. Exact FPS, night-image quality and advertising experience are not guaranteed.
- Only three ranking cases are judged, with incomplete single-author labels. Heuristics have not been learned or calibrated against user outcomes.
- The live quality and cost of Claude, OpenAI, DeepSeek, Gemini and OpenRouter have not been measured without credentials. The offline lab evaluates mock extraction only. User queries are sent to whichever service is configured; choose providers whose data terms fit your use.
- Modern Chromium is tested; WebKit/Firefox, assistive-technology audits, concurrent-load benchmarks and formal accessibility certification have not been run.

## Future experiments

**A.** Three recommendations versus ten: acceptance and time to shortlist.

**B.** Natural-language onboarding versus filter onboarding: task completion and correction rate.

**C.** Immediate clarification versus preliminary results: abandonment and relevance improvement.

**D.** Explanations shown by default versus on demand: decision confidence and comprehension.

**E.** Preference-aware ranking versus a popularity baseline: blinded graded relevance and selection.

**F.** “Spend more?” analysis: decision confidence, budget regret and whether a useful no-upgrade recommendation increases trust.

Read [product decisions](docs/PRODUCT.md) and [evaluation methodology](docs/EVALUATION.md) before interpreting metrics.
