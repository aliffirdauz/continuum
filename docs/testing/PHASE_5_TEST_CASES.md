# Phase 5: Unavailability Simulation Acceptance

Status: **Complete** — automated and agent-assisted acceptance passed on 2026-10-08, and the acceptance owner approved the screenshots the same day. Scope and calculation decisions live in [`../DEVELOPMENT_PHASES.md`](../DEVELOPMENT_PHASES.md). The cases below describe expected behavior; the Results section records what was actually run.

## Calculation and seed cases

- TC-P5-001: Compare baseline and unavailable scenarios at the same future UTC horizon, with the source evidence set frozen at capture. Changing duration changes date-based decay without introducing future evidence or an arbitrary duration multiplier.
- TC-P5-002: Only the selected person's expertise is removed. Existing documents and other historical evidence remain eligible for freshness and documentation factors. Phase 3 uncapped raw scores feed effective count; a separate capped-score, three-expert capacity proxy feeds coverage.
- TC-P5-003: Seeded Budi scenario affects Line 4, hydraulic calibration, stamping press diagnosis, and vendor maintenance. Stamping press risk rises; Line 4 coverage falls sharply even if relative inverse-HHI count increases and its score falls slightly. Healthy-coverage scenarios, future-dated/empty evidence, zero holders, date boundaries, and 0–100 bounds are covered.
- TC-P5-004: Results sort deterministically with stable ID tie-breaks. Business objects are deduplicated, link weights retained, and a person with no eligible areas produces honest zero/empty output. Department filtering changes the displayed report, not the saved intervention.

## API, authorization, persistence

- TC-P5-005: `POST /simulations/unavailability` requires a manager or knowledge admin. Validate employee ID/status, duration (integer 1–365), unexpected fields, body shape, and an optional department filter as defined in the implementation. Return 400/401/403/404 as appropriate; no credentials appear in errors.
- TC-P5-006: Capture one immutable result, its input, start/horizon timestamps, formula versions, and creator in a forward-migrated store. `GET /simulations/:id` returns the stored result only to its creator or knowledge admin; a different manager cannot enumerate another person's run. Unknown/unauthorized IDs are handled without leaking the run. GET never inserts/updates.
- TC-P5-007: Runs exceeding area/object caps fail explicitly rather than truncating. Areas and objects paginate with stable ordering, 20 default/50 max page size, total counts, and repeatable pages. Batching prevents per-area evidence/object queries.
- TC-P5-008: No POST changes employee status, evidence, expertise records, or Phase 4 risk snapshots. A rerun is an explicit new simulation, not a silently overwritten historical record. Concurrent writes remain independent.

## Browser and operational acceptance

- TC-P5-009: Authenticated manager selects an active employee and duration via keyboard, runs the simulation, views affected area before/after coverage/risk and linked objects, and revisits the run by ID. Employee viewers cannot trigger protected writes.
- TC-P5-010: Compare desktop and 375-pixel layouts, no-result, validation, loading, error/retry, inaccessible/unknown-run, and browser-token boundary. Label hypothetical impact, not staff performance or guaranteed outages.
- TC-P5-011: Run formatting, lint, typecheck, API/web unit tests, builds, migrations on existing and disposable fresh databases, seed repeatability, API integration, and Playwright on a rebuilt Compose stack. Capture real command outputs and manual screenshots before owner acceptance and Phase 5 completion.

## Results

### 2026-10-08: rebuilt Compose stack (Docker Engine 28.4.0, Chromium)

Where each case is covered:

| Case                | Automated evidence                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-P5-001, 002      | `src/simulations/simulation.spec.ts` (capture-instant boundary, documents kept in both branches, sole-holder removal); `test/simulation-seed.spec.ts` (365-day horizon ages both branches with the same evidence count); integration run at 1 vs 365 days.                                                                                     |
| TC-P5-003           | `test/simulation-seed.spec.ts` asserts the documented Budi probes from real seed data (Line 4 `1.49 → 1.50`, `38.9% → 7.6%`, `54.4 → 54.1` CRITICAL; stamping press MEDIUM → CRITICAL; hydraulic `51.4 → 53.8`; vendor LOW → MEDIUM) and Kevin's healthy authentication coverage. Integration covers Budi, Kevin, and `emp_ayu` (no evidence). |
| TC-P5-004, 007      | Service spec: coverage-loss → risk-delta → ID ordering, object deduplication, department filter narrows only the view, and a 501-area input is rejected before any evidence read or write. Integration: department filter, `pageSize=3` paging, repeat pages, out-of-range page, `pageSize` 0/51 and `page=0` → 400.                           |
| TC-P5-005, 006, 008 | Integration: 401 without/invalid token, 403 for employees (POST and GET), 400 for bad ID, 0/366/1.5/string durations, forged `startedAt`/`horizonAt`, `emp_hendra` (on leave); 404 for unknown person and run; admin-created run is 404 for the manager; three concurrent creates get distinct IDs; source data unchanged.                     |
| TC-P5-009, 010      | `e2e/simulation.spec.ts`: keyboard create, revisit by URL, department filter, 375-pixel overflow, no direct browser→API calls, no token in the Auth.js session, rejected submission keeps entries, unknown run, employee viewer, anonymous redirect. `e2e/phase5-walkthrough.manual.spec.ts`: screenshots plus create and result outage.       |

Commands and actual results:

- `npx --yes pnpm@10.17.1 format:check` and `npx --yes pnpm@10.17.1 check`: passed. Lint and typecheck passed for both packages; API unit tests **159/159**, web unit tests **55/55**; both production builds passed. A scan of the 16 built client chunks under `apps/web/.next/static` found no `accessToken`, `Bearer`, or secret names. `docker compose config --quiet` passed.
- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <disposable DB> --exit-code`: the first run reported drift from Phase 4 (see defect 4). After the fix it returned **No difference detected** (exit 0).
- **Upgrade of the existing database:** it held the three Phase 1–4 migrations, 186 evidence rows, 2 risk snapshots, and 3 users. `docker compose up -d` applied `20261003000000_simulation_runs` and `20261004000000_risk_snapshot_index_name`; all rows were preserved, the seed reran with unchanged counts, and every service became healthy.
- **Fresh disposable database** (`continuum_p5_fresh`, dropped afterwards): all five migrations applied; running the seed twice left 6 departments, 35 employees, 25 knowledge areas, 12 business objects, 186 evidence records, 3 users, and 0 simulation runs.
- `npx --yes pnpm@10.17.1 test:integration`: **76/76** (core data 42, expertise 14, risk 12, simulations 8), passed twice in a row against the same database.
- GET never writes: the row count and an MD5 of every stored `simulation_runs` id and result (40 rows) were identical before and after three paginated `GET /simulations/:id` requests. Evidence stayed at 186 and employee statuses at 34 active and 1 on leave. Risk snapshots went from 2 to 3 because the Phase 4 risk integration test captures today's snapshot; simulations never write snapshots.
- `npx --yes pnpm@10.17.1 test:e2e`: **15 passed, 3 skipped**. The skipped cases are the opt-in Phase 3 outage and Phase 4/5 walkthroughs.
- `RUN_PHASE5_WALKTHROUGH=1 WALKTHROUGH_OUTPUT_DIR="$(cygpath -m "$PWD/docs/testing/assets/phase5")" npx --yes pnpm@10.17.1 --filter @continuum/web exec playwright test phase5-walkthrough.manual.spec.ts --workers=1`: **1/1**. It briefly stops the local Compose API; never run it against a shared environment.

Defects found and fixed during acceptance, each with a test that failed first:

1. **Expired token reported as a save failure.** `apiPost` redirects to sign-in on a 401, but the server action's `try/catch` swallowed Next.js's redirect and showed "Could not save this simulation". The action now calls `unstable_rethrow` first (`actions.spec.ts`).
2. **POST and GET disagreed.** JSONB storage normalized the last digits of unrounded floats (for example `24.016231878529613` came back as `24.01623187852961`), so a re-read differed from the creation response. The integration suite caught it; the service now responds from the persisted row (`simulations.service.spec.ts`).
3. **A failed submission reset the form.** React resets a `<form action>` after every action, so a retry silently fell back to the 30-day default with no person selected. The form now submits through `onSubmit` in a transition, and `action` still covers posts sent before hydration (`e2e/simulation.spec.ts`, and the walkthrough asserts it after an outage).
4. **Phase 4 schema drift.** The hand-written unique index name in `20261001000000_risk_snapshots` was 64 characters, which PostgreSQL truncated differently from Prisma's name. The forward-only migration `20261004000000_risk_snapshot_index_name` renames it. The applied migration was not edited.

Visual review by the agent: [form](assets/phase5/simulate-form-desktop.png), [desktop result](assets/phase5/simulate-result-desktop.png), [375-pixel result](assets/phase5/simulate-result-mobile.png), [unknown run](assets/phase5/simulate-unknown-run.png), [create outage](assets/phase5/simulate-create-outage.png), [result outage](assets/phase5/simulate-result-outage.png), and [recovered](assets/phase5/simulate-result-recovered.png).

- The result shows the captured date, horizon, assumptions, formula versions, before/after cards, factor contributions, linked objects, and three deduplicated objects. Labels describe hypothetical knowledge-area exposure, not people.
- The mobile cards stack without page overflow; the top tab strip scrolls horizontally, as in earlier phases.
- The outage states show a generic message with a retry control and no internal detail. The form keeps "Budi Santoso" selected after a failed create.
- In the full-page desktop captures, the fixed sidebar and focused skip link appear mid-page. This is a Playwright full-page capture artifact, also visible in the accepted Phase 4 screenshots, not a layout defect.
- Dates are shown in UTC like the rest of the platform. A run captured at 06:18 in Jakarta on 8 Oct reads "Captured 7 Oct 2026".

Environment notes, not application evidence:

- On 2026-10-04 a Compose image build filled the C: drive, which holds Docker Desktop's data disk. The engine died with a bus error while exporting the API image. This corrupted BuildKit's `cache.db`, so `dockerd` panicked at every start ("bbolt … Page expected to be: 291, but self identifies as 0"), and left a broken `continuum-api:local` tag.
- Recovery on 2026-10-08: the data disk was mounted with an elevated `wsl --mount`, `buildkit/cache.db` was renamed to `cache.db.corrupt-20261004` (not deleted), the broken tag was removed, and 23.4 GB of now-unreachable build cache was pruned. No volume was reset; the Postgres data above survived intact.
- Later builds ran with a watchdog that cancels the build if C: drops below 1 GB free. The lowest observed was 1.2 GB.

**Acceptance-owner sign-off (2026-10-08):** the owner reviewed the screenshots above and confirmed the visual result is acceptable. Phase 5 is complete.
