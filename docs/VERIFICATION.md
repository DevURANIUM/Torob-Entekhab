# Verification record

Verified locally on 2026-09-25 using Windows, Node 24.19.0, npm 11.17.0, Next.js 16.3.6 and Chromium through Playwright.

| Check | Result |
|---|---|
| `npm install` | Passed; lockfile generated |
| `npm run db:setup` | Passed; 96 deterministic records, Prisma schema synchronized |
| `npm run dev` | Started successfully; main journey verified |
| `npm run lint` | Passed, no warnings or errors |
| `npm run typecheck` | Passed |
| `npm test` | 30 tests passed |
| `npm run build` | Passed; all nine app routes compiled/generated |
| `npm start` | Started production server successfully |
| `npm run test:e2e` | Six tests passed against the running production server |
| `npm audit` | Zero vulnerabilities across the installed dependency tree |
| `npm audit --omit=dev` | Zero production dependency vulnerabilities |

The final browser run covered the parent-shopping journey, explanations and Escape dismissal, brand refinement, marginal budget analysis, comparison, back navigation, detail/selection, lab/debugger, invalid and malformed inputs, nonsensical input, feedback persistence, impossible budget recovery and 375/768/1440 viewport overflow checks. No uncaught page errors were observed in the primary journey. Screenshots of the home, results and lab were visually inspected.

The saved [evaluation report](evaluation-report.json) contains the real run at `2026-09-25T02:12:51.080Z`:

- 33 cases, 3 with manually judged ranking relevance.
- Asserted-field accuracy: 0.9795918367.
- Recall@5: 0.75.
- NDCG@3: 0.7703233713.
- Top-three relevance: 0.7777777778.
- In-process P50: 0.7662 ms; P95: 6.5621 ms. These are not HTTP or end-to-end latency.

The known written-number extraction case fails visibly in evaluation. It is not disguised as a passing benchmark. Engine regression tests all pass because they assert the supported behavior and safety properties; the broader evaluation separately reports known capability gaps.

No live paid AI request, external publication, verified manufacturer-data audit, PostgreSQL deployment, multi-user load test, cross-browser test or formal accessibility audit was performed. Font assets are installed locally. Product images are explicitly symbolic placeholders. Existing event counts include actual development/browser-test activity, not real customer activity.

The Vitest tool prints a non-failing notice about a future Vite native config-loader default; tests complete normally. Playwright prints a non-failing terminal-color environment warning. Neither is an application runtime error.
