# Development Phase Tracker

Last updated: 2026-10-03

This document tracks delivery against `continuum_project_spec.md`. A phase is complete only when implementation, automated regression, manual test documentation, and operational documentation are all present.

## Status Summary

| Phase | Scope                     | Status   |
| ----- | ------------------------- | -------- |
| 1     | Foundation                | Complete |
| 2     | Core data                 | Complete |
| 3     | Expertise engine          | Complete |
| 4     | Risk engine               | Complete |
| 5     | Unavailability simulation | Planned  |
| 6     | Knowledge transfer        | Planned  |
| 7     | Product polish            | Planned  |

## Phase 1: Foundation

Status: **Complete**

Delivered:

- pnpm workspace and Turborepo task pipeline;
- Next.js, TypeScript, Tailwind CSS, and shadcn/ui foundation;
- NestJS, TypeScript, validation, and OpenAPI foundation;
- PostgreSQL 17 and Redis containers with health checks and persistent volumes;
- Prisma schema, generated client workflow, and committed baseline migration;
- idempotent seed with one demo identity for each required role;
- Auth.js credential flow backed by the NestJS API;
- protected application shell and responsive Phase 1 dashboard;
- separate liveness and dependency readiness probes;
- multi-stage production Dockerfiles and ordered Compose startup;
- unit regression coverage, manual acceptance cases, README, and architecture documentation.

Deliberately deferred:

- organizational `Employee` records and all Phase 2 entities;
- Northstar's 35-person synthetic domain dataset;
- knowledge metrics, scoring, risk, simulation, and transfer workflows;
- BullMQ workers and third-party connector simulations.

Key decisions:

- Authentication `User` and organizational `Employee` are separate concepts.
- NestJS exclusively owns Prisma and database access.
- Credentials are appropriate only for the synthetic portfolio environment.
- Redis is verified by readiness but remains functionally unused until a queue or cache has a concrete requirement.
- API routes are deny-by-default.
- Every protected web page verifies the session itself with `requireSession()`, because a layout check does not stop its page from rendering.

Acceptance evidence is maintained in [`testing/PHASE_1_TEST_CASES.md`](testing/PHASE_1_TEST_CASES.md). The full container acceptance, including the manual keyboard and responsive check, passed on 2026-09-27 after three fixes: Compose image pull policy, an offline-capable pnpm cache in the API image, and page-level session verification.

## Phase 2: Core Data

Status: **Complete**

Scope:

- model departments, employees, knowledge areas, business objects, knowledge-to-object relationships, and evidence;
- seed realistic Northstar Industries data without altering demo auth identities;
- expose validated, paginated, read-only REST resources;
- build dashboard, knowledge list, knowledge detail, people list, and people profile pages;
- provide loading, empty, error, not-found, filtering, and responsive states;
- index common filters and search fields;
- add API integration tests and browser-level critical-flow tests.

Exclusions:

- expertise scores, confidence, effective expert count, and expert distribution (Phase 3);
- risk scores, risk levels, and risk-based dashboard figures (Phase 4);
- create, update, and delete endpoints for domain entities;
- a link between authentication `User` and organizational `Employee`;
- the Expert Finder, business object pages, BullMQ, and connector simulations.

Entry criteria:

- Phase 1 regression remains green (confirmed on 2026-09-27 before work started);
- Phase 2 schema relationships and deletion behavior are agreed (recorded below);
- seed scenarios are mapped to stable IDs (recorded below).

Key decisions:

- **Read-only API.** The spec's Phase 2 deliverable is browsing. The write endpoints listed in spec section 29 wait for the phase that needs them, together with their role rules.
- **Deletion behavior.** Deleting a department is restricted while employees, knowledge areas, or business objects reference it. Deleting an employee or a knowledge area is restricted while evidence references it, because evidence is an audit trail; records are retired through their `status` instead. A knowledge-to-business-object link is deleted with either side.
- **Value ranges.** Criticality, decay rate, impact weight, and evidence strength are stored as `0.0` to `1.0` and enforced by database check constraints.
- **Identity boundary.** `User` and `Employee` stay unlinked. Demo authentication identities are seeded exactly as in Phase 1.
- **Stable IDs.** Seed records use readable IDs: `dep_<name>`, `emp_<first name>`, `ka_<slug>`, `bo_<slug>`, and `ev_<knowledge area slug>_<nnn>`. Records are upserted by ID and never deleted by the seed.
- **Deterministic time.** Evidence dates are day offsets from a fixed reference date, `2026-09-01T00:00:00Z`, so every seed run writes identical rows. The Phase 3 engine must accept an explicit "as of" date for reproducible tests.
- **Search.** Phase 2 uses case-insensitive substring search backed by `pg_trgm` GIN indexes. Ranked full-text search arrives with the Expert Finder.
- **People without rankings.** People views list knowledge areas alphabetically and never sort people by evidence volume. The directory shows how many knowledge areas a person has evidence in, not how much evidence they produced.

Seed scenario mapping:

| Scenario                  | Knowledge area ID           | Seeded shape                                                                                                       |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A: critical manufacturing | `ka_line4_troubleshooting`  | `emp_budi` holds most strong, recent, diverse evidence; `emp_andri` has some; two others have one weak record each |
| B: moderately distributed | `ka_month_end_closing`      | `emp_sarah` > `emp_nadia` > `emp_fajar`, all recent                                                                |
| C: healthy coverage       | `ka_authentication_service` | `emp_kevin`, `emp_raka`, and `emp_dina` hold comparable evidence                                                   |
| D: aging knowledge        | `ka_legacy_supplier_import` | Most evidence is more than two years older than the reference date                                                 |

Acceptance criteria:

- `prisma migrate deploy` upgrades a Phase 1 database and creates a fresh database without errors.
- Running the seed twice leaves 6 departments, 35 employees, 25 knowledge areas, 12 business objects, and the same evidence count, with the 3 demo users unchanged.
- Every domain endpoint rejects missing and invalid tokens, validates query parameters, and returns `400` for invalid input and `404` for unknown IDs.
- Every list endpoint returns pagination metadata and a deterministic order.
- The dashboard, knowledge, and people pages render real seeded data, verify the session themselves, and cover loading, empty, error, not-found, and narrow-screen states.
- No page shows expertise scores, risk levels, rankings, or performance language.
- Lint, typecheck, unit tests, and production builds pass; API integration and browser tests pass against the Compose stack.

Completion on 2026-09-27:

- Implemented: schema and migration `20260927120000_phase_2_core_data`, the Northstar seed (186 evidence records and 44 knowledge-to-object links), read-only endpoints for dashboard summary, departments, employees, knowledge areas, business objects, and evidence, and the dashboard, knowledge, knowledge detail, people, and profile pages.
- Passing: formatting, lint, typecheck, 64 API and 20 web unit tests, both production builds, the Phase 1 upgrade migration, seed idempotency, database integrity rules, 42 API integration tests against Compose, the client bundle token scan, and the Playwright browser tests (6 of 6, and 126 of 126 in repeated runs).
- Fixed during browser testing: the Phase 1 sign-in form could submit natively before hydration and put the password in the URL. It now waits for hydration and uses `POST`, and a browser test guards the regression.
- Fresh-volume startup (TC-P2-001) passed: both migrations applied to empty volumes, the seed produced the expected counts, and the integration and browser suites passed against the new stack.
- Loading and error states (TC-P2-012) and expired API tokens (TC-P2-013) passed in scripted browser runs against the stack.
- TC-P2-007 to TC-P2-011 passed a hand test in a browser.
- The keyboard-only walkthrough (TC-P2-014) passed after a fix: a global border color rule had overridden every border utility, hiding the focus border on inputs and dropdowns. It now lives in the base layer.
- Every acceptance criterion above has passing evidence, so Phase 2 is complete.

Evidence is recorded in [`testing/PHASE_2_TEST_CASES.md`](testing/PHASE_2_TEST_CASES.md).

## Phase 3: Expertise Engine

Status: **Complete** — formulas, read-only API, web surfaces, automated regression, focused Chromium keyboard/outage acceptance, and operational documentation are present. Evidence: [`testing/PHASE_3_TEST_CASES.md`](testing/PHASE_3_TEST_CASES.md).

Scope:

- Calculate evidence-based expertise per employee and knowledge area, with configurable evidence-type weights, knowledge-specific recency decay, diversity, and an explainable confidence label.
- Calculate effective expert count from the distribution of unrounded expertise contributions, not the number of people with evidence.
- Expose read-only `GET /knowledge/:id/experts`, `GET /employees/:id/expertise`, and `GET /expert-search?q=`; build `/experts`, add expertise distribution and evidence explanation to knowledge detail, and show per-area expertise on people profiles.
- Show effective expert count in the knowledge explorer/detail. Keep the dashboard's risk presentation for Phase 4.

Exclusions:

- Risk scores, risk levels, department risk, and historical risk snapshots (Phase 4); unavailability simulation (Phase 5); transfer planning (Phase 6).
- Domain write endpoints, background recalculation/BullMQ, third-party connectors, and a cross-area employee leaderboard. `User` and `Employee` remain separate.

Scoring decisions (see specification sections 9–12):

- Default evidence weights: `INCIDENT_RESOLVED=1.00`, `PROCESS_EXECUTION=0.95`, `MAINTENANCE_ACTIVITY=0.95`, `PROJECT_PARTICIPATION=0.85`, `CODE_CONTRIBUTION=0.85`, `TICKET_RESOLVED=0.80`, `DOCUMENT_AUTHORED=0.75`, `CODE_REVIEW=0.65`, `DOCUMENT_CONTRIBUTION=0.60`, `TRAINING_COMPLETED=0.50`, `PEER_CONFIRMATION=0.45`. Supply overrides through the scoring function, not hardcoded branches.
- Recency uses the spec's inclusive day bands: `0–90: 1.00`, `91–180: 0.90`, `181–365: 0.75`, `366–730: 0.55`, `>730: 0.35`. Blend the per-area decay rate as `recency = 1 - (1 - band) × min(1, knowledgeDecayRate × 20)`. A rate of zero disables aging; evidence after `asOf` is excluded. The earlier proposal to use `exp(-rate × ageInYears)` was rejected after checking the seed: its `0.02–0.06` rates barely reduced evidence older than two years, undermining scenario D.
- For each employee/area: `base = Σ(typeWeight × strength × recency)`; `diversity = min(uniqueTypes / 5, 1)`; `score = min(100, base × (0.7 + 0.3 × diversity) × K)`, displayed to one decimal. Use a single global `K=12`, calibrated against the four seeded scenarios; keep the unrounded pre-cap contribution for inverse HHI so display rounding/capping cannot distort shares. Treat the spec's example scores as directional, not exact fixtures: no single global linear scale can reproduce all example values from this seed.
- Confidence summarizes evidence quality, not a probability: HIGH when count ≥5, latest evidence ≤180 days old, and ≥3 distinct types; MEDIUM when count ≥2 and either latest evidence ≤365 days old or ≥2 distinct types; LOW otherwise. No evidence yields no expert entry/confidence. Show the count, types, and dates behind the label.
- For positive contributions, `share_i = contribution_i / Σ(contributions)` and `effectiveExpertCount = 1 / Σ(share_i²)`; return zero when the sum is zero. One holder gives 1, two equal holders give 2. Keep calculations independent of NestJS/Prisma and accept an explicit `asOf` date; API defaults to request time when omitted, while tests pass `asOf` explicitly.

API and product decisions:

- `GET /knowledge/:id/experts`: validated ID and optional `asOf`; return area context, effective expert count, and contributors sorted by score descending, then name and ID. Paginate contributors using the existing `{ data, meta }` conventions; return 404 for unknown areas.
- `GET /employees/:id/expertise`: validated ID, optional `asOf` and pagination; sort this person's knowledge areas by score, return an empty list for a known person without evidence and 404 for an unknown person. Add filters only if the page needs them.
- `GET /expert-search?q=`: require a nonblank query; return up to five matched knowledge areas with up to three contributors each, with explicit limits for both. Search knowledge names/descriptions using existing PostgreSQL search infrastructure; make match ordering deterministic and validate it against realistic queries. Do not flatten people from different areas into a leaderboard.
- `/experts` supports search, disambiguation, evidence explanation, and links to profiles. Knowledge detail shows the distribution and effective count; a profile shows scores in the context of individual areas, business criticality, and linked business objects. Use coverage language, not employee performance or Phase 4 risk labels. Preserve server-side `requireSession()` and token confinement.

Seed acceptance at explicit `asOf=2026-09-01T00:00:00Z`:

- `ka_line4_troubleshooting`: Budi clearly dominates Andri and the two weak contributors; effective count is close to 1 (calibration probe: about 1.49).
- `ka_month_end_closing`: Sarah > Nadia > Fajar, with moderately distributed coverage (probe: about 2.66 effective experts).
- `ka_authentication_service`: Kevin, Raka, and Dina are close, near 3 effective experts (probe: about 2.99).
- `ka_legacy_supplier_import`: older evidence reduces scores relative to comparable recent evidence. Do not assert that it is the lowest-scoring area in the _entire_ dataset without checking every area. The spec's example 88/65/48 implies approximately 2.75 effective experts, not the 1.5–2 suggested elsewhere; validate the distribution shape rather than the literal figures.

Implementation and acceptance sequence:

1. Finish and verify pure scoring/recency/confidence/HHI functions with boundary tests and seed calibration; keep weights configurable and validate malformed dates/rates at the API boundary.
2. Add Prisma-backed expertise service and read-only endpoints following the existing module/DTO/pagination patterns. Fetch evidence in batches for search/results, not one query per contributor. Provide traceable evidence IDs and contribution breakdown for explainability.
3. Implement Expert Finder, knowledge-detail distribution, and per-area profile coverage with loading, empty, error, responsive, and keyboard states; keep client-visible sessions free of API tokens.
4. Test authorization, validation (`400`), unknown records (`404`), no-evidence (`200` with empty data), pagination/order, time filtering, seed scenarios, and repeatability with explicit `asOf` in API integration tests and critical Playwright flows (at most three workers).
5. Create `testing/PHASE_3_TEST_CASES.md`, rerun Phase 1/2 regression plus format, lint, typecheck, unit tests, builds, API integration, and browser tests. Record actual results and limitations; update README and architecture docs before marking Phase 3 complete.

## Phase 4: Risk Engine

Status: **Complete** — pure formula, protected API, explicit knowledge-admin snapshot capture, forward migration, and server-rendered risk surfaces are implemented. Format/lint/typecheck/unit/build, migration and seed checks, API integration (**68 passed**), regular Chromium E2E (**10 passed; two opt-in outage cases skipped**), and the Phase 4 local visual/keyboard/outage walkthrough (**1 passed**) are documented in [`testing/PHASE_4_TEST_CASES.md`](testing/PHASE_4_TEST_CASES.md). The acceptance owner reviewed the dashboard, mobile detail, and outage screenshots and approved the visual result on 2026-10-03. The unrelated opt-in Phase 3 outage case was not required to close Phase 4.

Goal: show where **knowledge areas** are vulnerable and why, without rating employees. The dashboard becomes a risk overview rather than only an inventory. Keep Phase 3 expertise scoring and its `asOf` semantics unchanged.

Scope:

- Pure, deterministic 0–100 knowledge-risk calculation with business criticality, effective-expert concentration, evidence freshness, and documentation gap; show the four normalized inputs, their weighted contributions, risk level, effective expert count, `asOf`, and a formula version.
- Protected, read-only knowledge risk endpoint and batched organization/department risk summaries; dashboard distribution, highest-risk knowledge areas, knowledge explorer risk filter, and knowledge detail explanation. Use deterministic ties and bounded lists/pagination.
- Persist dated risk snapshots with formula version and a compact calculation-input audit payload; make repeated capture for the same area/date/version idempotent. Display history only when actual snapshots exist, not a fabricated trend.
- Add reproducible API, formula, migration, and browser acceptance evidence in `testing/PHASE_4_TEST_CASES.md`.

Exclusions: unavailability simulation (Phase 5); transfer plans or risk improvement claims (Phase 6); a worker/queue, third-party ingestion, write APIs for ordinary domain records, cross-person rankings, or advanced charting for its own sake. Do not add dependencies for simple visualization.

Evidence from the existing deterministic seed at `asOf=2026-09-01T00:00:00Z` (calculated from `buildEvidence()`, `scoreExpertise()` and inverse HHI):

| Knowledge area         | Criticality | Effective experts | Newest evidence (days old) | Documentation evidence (newest days old) |
| ---------------------- | ----------: | ----------------: | -------------------------: | ---------------------------------------: |
| Line 4 troubleshooting |        0.96 |              1.49 |                          9 |                            2 records; 70 |
| Month-end closing      |        0.90 |              2.66 |                          3 |                           2 records; 120 |
| Authentication service |        0.87 |              2.99 |                         15 |                            3 records; 75 |
| Legacy supplier import |        0.55 |              1.46 |                        150 |                           1 record; 1400 |
| Bank reconciliation    |        0.75 |              2.43 |                          6 |                                     none |

**Scoring decision (agreed: calibrate against seed rather than copy contradictory illustrative numbers):** spec section 14's suggested additive formula and default levels cannot simultaneously produce Line 4 **CRITICAL**, month-end **MEDIUM**, and authentication **LOW**: authentication's criticality alone contributes 34.8/100, while even maximum concentration leaves a fresh, documented Line 4 at most 73.4/100. Use a criticality-weighted **exposure** score instead: `risk = 100 × businessCriticality × (0.75 × concentration + 0.15 × freshness + 0.10 × documentationGap)`. Levels, computed on the unrounded score: `LOW < 10`, `MEDIUM < 30`, `HIGH < 45`, `CRITICAL >= 45`. This uses a different scale distribution from the illustrative 86/100 example; do not claim exact example scores. Bump the formula version if any coefficients, bands, or level boundaries change.

- `concentration = 1` for zero effective experts; otherwise `clamp((3 - effectiveExpertCount) / 2, 0, 1)`. Zero and a single holder both score maximum concentration; explain the difference using the separate effective count and evidence count.
- Freshness and documentation gap use the same inclusive UTC age bands: `0–90 days: 0`, `91–180: 0.25`, `181–365: 0.50`, `366–730: 0.75`, `>730: 1`. No eligible evidence/documentation yields 1. Documentation means eligible `DOCUMENT_AUTHORED` or `DOCUMENT_CONTRIBUTION`, using its latest date; recent incidents do not erase a stale-documentation gap.
- At the seeded reference date, formula probes give Line 4 **54.4 CRITICAL**, month-end **13.8 MEDIUM**, authentication **0.2 LOW**, legacy supplier import **39.4 HIGH** (aged documentation), and bank reconciliation **23.5 MEDIUM** (no documentation). These are calibration checks, not hardcoded overrides; assert levels and reasonable score ranges in tests.

Calculation contract:

- Evaluate evidence only on or before explicit `asOf` (UTC), defaulting to request time. Reuse **uncapped, unrounded** Phase 3 expertise contributions for effective expert count; zero evidence must be considered exposed, not safe.
- Criticality is the knowledge area's stored 0–1 value. Formula weights, thresholds, scale, and null behavior belong in one versioned pure module. Round only at the API presentation boundary; compute levels from the unrounded score. Explain each factor in the response so the UI never needs to reimplement the formula.
- The existing model has no historical `createdAt`-bounded evidence replay semantics or audit for source mutations. A snapshot must record the score, factors, `asOf`, capture time, and version **as calculated then**; it must not claim that a later recomputation of an old `asOf` reconstructs the original source state. Use explicit administrative/batch capture first, rather than introduce BullMQ just for 25 seeded areas.

Implementation sequence:

1. Record calibrated formula, level boundaries, and expected seed ordering here. Start RED/GREEN tests for pure risk factors, zero evidence, missing documentation, date boundaries, score bounds, and formula version.
2. Compose risk computation over batched Phase 3 evidence/area data without N+1 queries; expose authenticated `GET /knowledge/:id/risk` plus bounded dashboard risk distribution, departments, and highest-risk knowledge endpoints. Decide whether a POST recalculation means read-only recomputation or persisted snapshot, and authorize any write explicitly.
3. Add the forward-only snapshot migration with a uniqueness key for area + UTC snapshot date + formula version and persisted factor input values. Test idempotency, stable ordering, and read-only historical retrieval; keep snapshot capture separate from ordinary GETs.
4. Update dashboard, knowledge explorer, and knowledge detail, with clear factor labels, empty/error/loading, keyboard, and narrow-screen states. Do not label a person as risky.
5. Add integration tests for auth, validation, 404, pagination, dates, snapshot persistence, and seeded scenarios; run formatting, lint, typecheck, unit, builds, migration/seed checks, integration and Playwright tests on rebuilt Compose. Record actual command results and hands-on acceptance before marking **Complete**.

## Phase 5: Unavailability Simulation

Status: **Planned**

Planned outcomes:

- temporary removal or reduction of selected expertise contributions;
- before-and-after expert count, risk, coverage, and business impact;
- interactive simulation flow;
- deterministic simulation regression fixtures.

## Phase 6: Knowledge Transfer

Status: **Planned**

Planned outcomes:

- transfer plans, candidates, activities, and progress;
- deterministic activity recommendations;
- measured backup expertise growth;
- visible risk progression from critical toward low.

## Phase 7: Product Polish

Status: **Planned**

Planned outcomes:

- complete loading, empty, error, skeleton, and tooltip states;
- explainability drawers and historical charts;
- responsive and accessibility review;
- seed reset workflow, final architecture diagram, and screenshots;
- complete E2E portfolio demo path.

## Phase Completion Protocol

For every phase:

1. Confirm scope and exclusions.
2. Record unresolved product decisions before implementation.
3. Implement the smallest complete vertical slices.
4. Add automated unit, integration, and E2E coverage appropriate to the phase.
5. Create the phase's reproducible manual test document.
6. Run the existing regression suite before marking the phase complete.
7. Record command results and any environmental limitations.
8. Update README, architecture, and this tracker.
