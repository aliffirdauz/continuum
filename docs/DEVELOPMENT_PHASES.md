# Development Phase Tracker

Last updated: 2026-09-27

This document tracks delivery against `continuum_project_spec.md`. A phase is complete only when implementation, automated regression, manual test documentation, and operational documentation are all present.

## Status Summary

| Phase | Scope                     | Status   |
| ----- | ------------------------- | -------- |
| 1     | Foundation                | Complete |
| 2     | Core data                 | Complete |
| 3     | Expertise engine          | Planned  |
| 4     | Risk engine               | Planned  |
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

Status: **Planned**

Planned outcomes:

- configurable evidence weights;
- recency decay and evidence diversity;
- deterministic expertise and confidence calculations;
- effective expert count using inverse HHI;
- expert distribution and explainability;
- focused numerical boundary tests.

## Phase 4: Risk Engine

Status: **Planned**

Planned outcomes:

- concentration, criticality, freshness, and documentation-gap factors;
- explainable knowledge risk scores and levels;
- organization and department risk views;
- historical risk snapshots;
- formula versioning and calculation input auditability.

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
