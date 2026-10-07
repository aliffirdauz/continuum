# Phase 4: Risk Engine Acceptance

Status: **Complete**. Formula and scope live in [`../DEVELOPMENT_PHASES.md`](../DEVELOPMENT_PHASES.md); actual automated and walkthrough evidence is recorded below.

## Formula and seed checks

- TC-P4-001: On `asOf=2026-09-01T00:00:00Z`, risk calculation uses uncapped Phase 3 expertise contributions and returns its formula version, 0–100 score, level, four factors, and the dates/count behind freshness and documentation.
- TC-P4-002: Line 4 troubleshooting is CRITICAL; month-end closing is MEDIUM; authentication service is LOW. Legacy supplier import has a substantial stale-documentation gap; bank reconciliation has a maximal no-document gap.
- TC-P4-003: Empty evidence produces zero effective experts and maximum concentration/freshness/documentation gaps; future-dated evidence is ignored. Inclusive day-band boundaries, level thresholds, nonzero criticality, and unrounded calculation are unit tested.
- TC-P4-004: Same seed and `asOf` produce identical ordered responses independent of pagination and request order. Display rounding never changes a level.

## API and persisted snapshots

- TC-P4-005: Authenticated knowledge risk detail resolves known IDs and returns 404 for unknown IDs; invalid IDs/date/query return 400, missing/invalid bearer token returns 401. No state change on GET.
- TC-P4-006: Dashboard risk distribution totals match the area population; department counts and highest-risk list are deterministic, bounded, and paginated. Empty datasets render without misleading scores.
- TC-P4-007: Run committed migration on both existing and fresh databases. Capture real snapshots explicitly with authorization; repeated area/date/version capture is idempotent. Inspect persisted factors/version/`asOf` and ensure read history contains only actual captures. A backdated `asOf` is not represented as a historical database reconstruction.

## Browser and operational checks

- TC-P4-008: Dashboard shows distribution, department exposure, and highest-risk knowledge with links to explanations. Explorer can narrow by risk level without falsely labeling a partial page as a complete result set.
- TC-P4-009: Knowledge detail explains every factor and retains links to evidence and existing expertise; no employee performance rankings or exposed API token.
- TC-P4-010: Loading, empty, error/retry, keyboard-only and 375-pixel narrow-screen paths remain usable.
- TC-P4-011: `pnpm format:check`, `pnpm check`, `docker compose config --quiet`, `pnpm test:integration`, and `pnpm test:e2e` pass against a rebuilt Compose stack; inspect migrations, seed repeatability, and browser bundle token boundary. Record real counts and any limitations below.

## Results

Automated regression on a rebuilt, seeded Docker Compose stack (Phase 4 worktree; no volume reset):

- `pnpm format:check`: passed after formatting the ten Phase 4 web files that initially failed the check.
- `pnpm check`: lint and typecheck passed in both packages; unit suites passed **142/142 API** and **33/33 web** tests; production API and Next.js builds passed after adding server-supplied weighted contributions and conditional snapshot history.
- `docker compose config --quiet`: passed. API and web containers were healthy after `docker compose up -d --build web`.
- `pnpm test:integration`: **68/68 passed** after the weighted-contribution change and seeded-scenario coverage for Line 4, month-end closing, authentication service, legacy supplier import, and bank reconciliation. The suite also covers authentication, validation, server-supplied point contributions, pagination, read-only GET, administrator-only capture, rejected backdating, stored history, and repeat capture.
- `pnpm test:e2e`: **10 passed, 2 skipped** on the default run after adding the opt-in Phase 4 walkthrough. The skipped cases are the Phase 3 outage and Phase 4 walkthrough (both intentionally require local outage opt-in). Chromium exercised dashboard risk, keyboard-operated risk filtering, area explanations, existing expertise, empty/not-found paths, and narrow-screen overflow. Web unit tests cover both actual captured history and the absence of a history card when there are no snapshots.
- Existing database: Prisma reported **3 migrations**, schema up to date. A disposable fresh PostgreSQL database applied all three migrations, including `20261001000000_risk_snapshots`; it was dropped afterward without touching persistent volumes.
- Seed repeatability: knowledge areas / evidence / snapshots were `25|186|2` both before and after rerunning the seed. Snapshots were captured explicitly during API integration tests, not by GET or the seed.

**Agent-assisted visual walkthrough (local Compose, opt-in):** `RUN_PHASE4_WALKTHROUGH=1 WALKTHROUGH_OUTPUT_DIR='D:/Work/Projects/continuum/docs/testing/assets/phase4' npx --yes pnpm@10.17.1 --filter @continuum/web exec playwright test phase4-walkthrough.manual.spec.ts --workers=1` passed **1/1**. This is intentionally skipped by the default parallel suite. The walkthrough authenticated with the existing demo E2E harness, followed dashboard → keyboard-operated CRITICAL filter → Line 4 risk detail, inspected desktop and 375-pixel screenshots, checked no horizontal overflow after content loaded, no browser page exceptions or direct browser-to-API requests, and no API access token in the browser-visible Auth.js session. It stopped only the local Compose API, observed the safe error and visible retry control, restarted the API in `finally`, confirmed readiness, and retried successfully. The API container was healthy afterward.

Visual review of [dashboard](assets/phase4/dashboard-desktop.png), [filtered knowledge](assets/phase4/knowledge-filtered.png), [desktop detail](assets/phase4/risk-detail-desktop.png), and [375-pixel detail](assets/phase4/risk-detail-mobile.png) found readable labels, factor contributions, captured (not fabricated) history, evidence/coverage, and no clipping or overlap. [Outage](assets/phase4/risk-outage.png) showed a generic error with no internal host/stack text and an operable Try again button; [recovery](assets/phase4/risk-recovered.png) restored the risk detail. The first mobile screenshot was captured during the legitimate loading skeleton; the walkthrough was corrected to wait for the page heading before overflow measurements and screenshots, rerun, and visually rechecked. This was a test-harness timing issue, not a product defect.

To reproduce in Windows Git Bash on a local disposable Compose stack, run `docker compose up -d --build web`, then `RUN_PHASE4_WALKTHROUGH=1 WALKTHROUGH_OUTPUT_DIR="$(cygpath -m "$PWD/docs/testing/assets/phase4")" npx --yes pnpm@10.17.1 --filter @continuum/web exec playwright test phase4-walkthrough.manual.spec.ts --workers=1`. It briefly stops the API; do not run against a shared environment.

**Acceptance-owner sign-off (2026-10-03):** the user reviewed the dashboard, mobile knowledge detail, and outage screenshots shared in chat and confirmed the visual result was acceptable. Phase 4 is complete. The separate Phase 3 Expert Finder outage test remains opt-in and was not part of the Phase 4 acceptance gate.
