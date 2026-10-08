# Phase 6: Knowledge Transfer Acceptance

Status: **In progress — automated and agent-assisted acceptance passed on 2026-10-08; acceptance-owner screenshot sign-off pending**. Scope, decisions, and calibration live in [`../DEVELOPMENT_PHASES.md`](../DEVELOPMENT_PHASES.md). The cases below describe expected behavior; the Results section records what was actually run.

## Rules and calibration

- TC-P6-001: Every activity type maps to one evidence type under the versioned `transfer-v1` mapping. A completed activity's evidence carries the activity weight as strength, the completion time as `occurredAt`, `source = "Transfer plan"`, the activity ID as `sourceReference`, and plan, activity, and mapping version in `metadata`.
- TC-P6-002: Recommendations follow the spec bands: below 40, 40–70 inclusive, above 70. Owner assignment is advice and records no evidence.
- TC-P6-003: Status transitions match the agreed table; `COMPLETED` is terminal. Coverage progress is the share of the gap from baseline to target, clamped to 0–100.
- TC-P6-004: With seed data, following the recommendations lifts Andri on Line 4 to at least 70 within eight activities and moves the area from CRITICAL to HIGH, never LOW. A second plan for Joko reaches LOW, and the risk score never rises along the path. The primary holder's own score does not change.

## API, authorization, persistence

- TC-P6-005: Every authenticated role can list and read plans; only `MANAGER` and `KNOWLEDGE_ADMIN` can read candidates, create or update plans, add activities, or complete them (401 without or with an invalid token, 403 for employees).
- TC-P6-006: Creation rejects malformed or out-of-range input with 400:
  - same person as holder and backup, inactive people, a primary holder without expertise;
  - a target that is not an integer from 1 to 100, or not above the backup's current coverage;
  - dates in the past, more than two years ahead, or not in `YYYY-MM-DD` form;
  - unexpected fields.

  It returns 404 for unknown areas or people, and 409 for a second open plan for the same area and backup.

- TC-P6-007: Creation stores the backup's baseline coverage and a baseline checkpoint. Each completion stores exactly one evidence row and one checkpoint, moves a planned plan to in progress, and stamps the start time. Concurrent completions of one activity produce one success and one 409.
- TC-P6-008: Activities cannot be added to or completed on blocked or completed plans (409); completing twice returns 409; plans never return from `COMPLETED`. A transfer in one area does not change another area's evidence (Line 4 is unchanged by the integration suite).
- TC-P6-009: `pnpm db:reset` refuses without `--yes`. With it, it deletes transfer data, simulation runs, risk snapshots, and non-seed evidence, then reseeds, leaving exactly the seed counts.

## Browser and operational acceptance

- TC-P6-010: A manager creates a plan from the transfer list, adds a recommended activity and a keyboard-entered custom activity, completes both, sees coverage rise and the history grow, and completes the plan. Employees see plans read-only; unknown plans show the not-found state; pages have no horizontal overflow at 375 pixels; the browser never calls the API or receives its token.
- TC-P6-011: The opt-in flagship walkthrough resets the local database and then:
  1. starts at Line 4 (CRITICAL) and plans Budi → Andri from the knowledge page;
  2. follows the recommendations until Andri reaches 70 (HIGH) and completes the plan;
  3. plans Budi → Joko until the area is LOW;
  4. captures desktop, mobile, and list screenshots;
  5. resets the database again.
- TC-P6-012: Format, lint, typecheck, unit tests, builds, migration drift, upgrade and fresh migrations, seed and reset repeatability, API integration, and Playwright pass on a rebuilt Compose stack, and the acceptance owner reviews the screenshots.

## Results

### 2026-10-08: rebuilt Compose stack (Docker Engine 28.4.0, Chromium)

| Case          | Automated evidence                                                                                                                                                                                                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-P6-001–003 | `src/transfers/transfer.spec.ts` (22 tests): mapping completeness and weights, band boundaries at 39.9/40/70/70.1, the transition table, clamped progress, and an area assessment equal to `calculateRisk` with evidence after `asOf` excluded.                                                                                         |
| TC-P6-004     | `test/transfer-seed.spec.ts` with real seed data. Andri goes from 18.4 to at least 70 in at most eight recommended activities, CRITICAL → HIGH, never LOW. Joko then reaches LOW. Risk never rises, and Budi's score is unchanged.                                                                                                      |
| TC-P6-005–008 | `transfers.service.spec.ts` (17 tests) and `test/integration/transfers.spec.ts`: authorization matrix, validation and 400/404/409 cases, baseline checkpoint, evidence traceability through `GET /evidence/:id`, blocked and completed guards, a concurrent completion race (one 200, one 409), and an unchanged Line 4 evidence count. |
| TC-P6-009     | The reset was verified on a disposable database. It refused without `--yes`. Junk rows (1 evidence, plan, activity, checkpoint, run, and snapshot) were reset back to 186 evidence and 0 of everything else, and a second reset deleted nothing.                                                                                        |
| TC-P6-010     | `e2e/transfers.spec.ts`: create from the list, add a recommendation, keyboard-entered custom activity, two completions, coverage rise, plan completion, a read-only employee, not-found, 375-pixel overflow, no direct browser-to-API calls, and no token in the session.                                                               |
| TC-P6-011     | `e2e/phase6-walkthrough.manual.spec.ts`, opt-in; it resets the database before and after.                                                                                                                                                                                                                                               |

Commands and actual results:

- `npx --yes pnpm@10.17.1 format:check` and `npx --yes pnpm@10.17.1 check`: passed. API unit **199/199** and web unit **70/70**, including the new transfer pages, actions, `apiPatch`, and role-based entry links; both production builds passed.
- `prisma migrate diff --from-migrations … --to-schema-datamodel … --exit-code`: **No difference detected**. The check constraints are invisible to Prisma, as in Phase 2.
- **Upgrade of the existing database** (five migrations, 186 evidence, 44 simulation runs, 3 snapshots): `20261008000000_knowledge_transfer` applied; all rows were preserved and the seed reran unchanged. Inside rolled-back transactions, PostgreSQL rejected:
  - the same person as holder and backup;
  - a target of 101;
  - a weight of 0.05;
  - a completed activity without evidence.
- **Fresh disposable database:** all six migrations applied, and the seed produced 186 evidence records and no plans.
- `npx --yes pnpm@10.17.1 test:integration`: **79/79**, passing on five consecutive runs against the same accumulating database. All seven transfer-sourced evidence rows in the database are linked to an activity whose ID equals their `sourceReference`.
- `npx --yes pnpm@10.17.1 test:e2e`: **18 passed, 4 skipped** (opt-in Phase 3 to 6 walkthroughs), on three consecutive runs.
- `RUN_PHASE6_WALKTHROUGH=1 WALKTHROUGH_OUTPUT_DIR="$(cygpath -m "$PWD/docs/testing/assets/phase6")" npx --yes pnpm@10.17.1 --filter @continuum/web exec playwright test phase6-walkthrough.manual.spec.ts --workers=1`: **1/1**. Afterwards the database was back at 186 evidence records, 0 plans, and 0 runs.

Flagship result (screenshots: [Andri plan](assets/phase6/transfer-andri-desktop.png), [Joko plan](assets/phase6/transfer-joko-desktop.png), [375-pixel Joko plan](assets/phase6/transfer-joko-mobile.png), [plan list](assets/phase6/transfers-list.png)):

| Plan         | Activities | Backup coverage | Line 4 risk                      |
| ------------ | ---------: | --------------- | -------------------------------- |
| Budi → Andri |          7 | 18.3 → 76.0     | CRITICAL 56.9 → HIGH 33.1        |
| Budi → Joko  |          6 | 2.7 → 44.0      | HIGH 33.1 → MEDIUM → **LOW 6.7** |

In the Andri plan, the risk crossed into HIGH after the second activity. The risk score fell at every checkpoint of both plans, matching the calibration probe.

Defects found and fixed during acceptance:

1. **Advisory lock failed against the real database.** `pg_advisory_xact_lock` returns `void`, which `$queryRaw` cannot deserialize, so creating a plan returned 500. Mocks hid this; the integration suite caught it. The lock now uses `$executeRaw`, verified against PostgreSQL before the rebuild.
2. **Same-page redirects did not refresh the plan.** A server-action redirect to the same page with a `#activities` hash did not refetch it, so a saved activity did not appear. Actions now call `revalidatePath` and return success; `ActionForm` clears its fields only after a successful save and keeps them on failure.
3. **Progress history was hard to read on phones.** At 375 pixels the history table needed horizontal scrolling inside its card, hiding coverage and risk. Narrow screens now show a stacked list.
4. **Two tests failed whenever run in parallel.** The simulation suite's "never mutates source data" check compared the global evidence total, which the parallel transfer suite legitimately changes. It now compares non-evidence totals plus Line 4 and Budi evidence.
5. **Test assumptions broke over repeated runs.** Pooled backups accumulate evidence across runs and can become the dominant holder. The tests now select the seeded primary holder explicitly, accept any holder order, and expect falling risk only while the backup remains below the primary holder. This is the documented inverse-HHI behavior: training a backup past the primary concentrates knowledge again.

Visual review by the agent:

- The history and risk badges are readable on desktop and at 375 pixels.
- The coverage bar marks the baseline and target.
- Recommendations change band as coverage grows.
- Completed plans hide write controls.
- Employees see no write controls.
- The fixed-sidebar and skip-link placement in full-page desktop captures is the same Playwright artifact as in the accepted Phase 4 and 5 screenshots.

Acceptance-owner screenshot review is **pending**.
