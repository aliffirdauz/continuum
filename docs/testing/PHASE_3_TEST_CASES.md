# Phase 3 Test Cases — Expertise Engine

Status: **Accepted**. Automated regression and focused Chromium keyboard/error-state acceptance passed on 2026-09-30. Phase 1 and Phase 2 cases remain in the regression gate.

## Preconditions

- Start the fully built stack with `docker compose up --build`; migrations and the deterministic Northstar seed must complete.
- Confirm the seed still contains 6 departments, 35 employees, 25 knowledge areas, 12 business objects, and 186 evidence records.
- Use a demo account and an explicit reference time of `2026-09-01T00:00:00Z` for numerical API comparisons; without `asOf`, the API uses request time.

## Automated gate

```bash
pnpm format:check
pnpm check
docker compose config --quiet
pnpm test:integration
pnpm test:e2e
```

The last two commands require the running, seeded stack. Limit Playwright to the existing three workers. Never mark this phase complete solely because the formula unit tests pass.

## TC-P3-001: Scoring and seed calibration

1. Request `GET /api/v1/knowledge/ka_line4_troubleshooting/experts?asOf=2026-09-01T00%3A00%3A00Z` with a valid API token.
2. Repeat for `ka_month_end_closing`, `ka_authentication_service`, and `ka_legacy_supplier_import`.
3. Repeat the same requests and compare results.

Expected: Budi clearly leads Andri and two weak holders for Line 4; Sarah > Nadia > Fajar for month-end closing; Kevin, Raka, and Dina are close for Authentication Service. Inverse HHI on **unrounded** contributions yields approximately 1.49, 2.66, and 2.99 respectively at this reference date. Older evidence in the legacy area contributes less than equally strong recent evidence. Results are identical on repeat. Do not assert the illustrative expertise scores in the product spec as exact fixtures.

## TC-P3-002: Evidence explanation and time boundary

1. Inspect an expert's evidence breakdown and individual evidence links/IDs on the knowledge detail page and through the API.
2. Use an `asOf` date before the latest evidence record and compare the count, last evidence date, and score with the seed reference date.
3. Try a date before **all** seeded evidence for a knowledge area.

Expected: each contribution refers to a real evidence ID, type, strength, date, weight, recency multiplier, and contribution; future evidence is excluded. With no eligible evidence, the distribution is empty, effective expert count is zero, and no confidence label appears. Scores are explainable from the returned inputs.

## TC-P3-003: API boundaries

1. Request all three new endpoints without a token and with an invalid token.
2. Request unknown but well-formed knowledge and employee IDs.
3. Request an existing employee without evidence (`emp_ayu`).
4. Send missing/blank `q`, malformed or future-invalid `asOf`, invalid pagination and unknown query parameters.

Expected: unauthorized requests return `401`; unknown resources return `404`; a known person without evidence returns `200` with an empty list; invalid input returns `400` with a safe error. Query limits are enforced and pagination metadata and ordering are deterministic. A future `asOf` is acceptable only if explicitly supported and documented; malformed dates must not silently fall back to now.

## TC-P3-004: Expert Finder

1. Sign in, open `/experts`, search for `line 4` and `Japan machinery import`.
2. Follow a contributor link to that person's profile and follow the area link to its detail page.
3. Search for a phrase that has no match and use the search field with a keyboard only.

Expected: matched knowledge areas are identifiable, with up to three contributors per area. Each contributor has score, confidence, evidence summary, and traceable explanation. Results are grouped by knowledge area, not flattened into an organization-wide people leaderboard. Empty and error states are safe and useful.

## TC-P3-005: Knowledge and people views

1. Open the knowledge explorer and inspect the effective expert counts on different areas; open Line 4.
2. Inspect distribution, evidence explanation, and effective expert count on the detail page.
3. Open Budi's profile and Ayu's profile.

Expected: effective count appears in context; the distribution follows score order, but the people directory remains alphabetical. A profile presents per-area expertise, not an employee performance rating. Ayu has a clear no-expertise state. No risk level or Phase 4 risk card appears.

## TC-P3-006: Responsive, failure, and security regression

1. Repeat the Expert Finder, knowledge detail, and people profile paths at `375 × 812` and with keyboard navigation.
2. On the local Compose stack only, opt into the isolated outage check: `RUN_OUTAGE_ACCEPTANCE=1 pnpm --filter @continuum/web exec playwright test e2e/phase3-outage.manual.spec.ts --workers=1`. It stops the API, checks the error page, restores the API in `finally`, waits for readiness, and checks recovery. Never run this against a shared stack or in the regular parallel suite.
3. Verify the Auth.js session, rendered HTML, and client bundle contain no API bearer token.
4. Rerun Phase 1 and Phase 2 acceptance automation.

Expected: no page-level horizontal overflow; labels/focus and links work; API failure renders a safe error and recovery works; token confinement remains intact. Existing browsing, auth, and seed behavior do not regress.

## Regression evidence

Run on 2026-09-30 against the running, seeded Docker Compose stack:

- `pnpm format:check` — passed after formatting the new API files.
- `pnpm check` — lint and typecheck passed for both apps; API 131 unit tests and web 26 unit tests passed; NestJS and Next.js production builds passed.
- `docker compose config --quiet` — passed; rebuilt stack started with PostgreSQL, Redis, API, and web all healthy. The migrate and seed jobs exited successfully.
- `pnpm test:integration` — 56 tests passed (42 core-data + 14 expertise). New integration assertions checked the three seeded concentration distributions and the no-future-evidence case.
- `pnpm test:e2e` — 9 Chromium tests passed with three workers; the opt-in outage test was skipped as designed. The keyboard-only flow used the skip link, search field, Enter submission, result link, and evidence `<details>` without a mouse. Additional flows covered Japan machinery import search, no-match search, and Ayu's no-evidence profile. The 375-pixel viewport check covered Expert Finder and knowledge detail in addition to the earlier pages; no page-level horizontal overflow was found.
- `RUN_OUTAGE_ACCEPTANCE=1 pnpm --filter @continuum/web exec playwright test e2e/phase3-outage.manual.spec.ts --workers=1` — passed. The first run stopped at an ambiguous Playwright `role=alert` selector (the error page rendered correctly); the test locator was narrowed to the main alert, then rerun successfully. With the API stopped, Expert Finder rendered a safe error without connection details; after restoring the API and waiting for readiness, **Try again** recovered the results. `docker compose ps` confirmed API, web, PostgreSQL, and Redis healthy afterward.
- Static client bundle scan for `accessToken`, `Bearer`, `INTERNAL_API_URL`, and `api/v1` in built JS/CSS — no matches.
- `git diff --check` — passed.

The automated critical flows and focused keyboard/outage acceptance pass. Phase 3 is complete; a separate human visual review may still be useful for product polish, but is not an unverified acceptance claim.
