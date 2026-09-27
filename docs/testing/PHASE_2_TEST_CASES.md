# Phase 2 Test Cases

Last updated: 2026-09-27

Use this document to verify Continuum's core organizational data after setup or any change to the domain schema, seed, domain API, or browsing pages. Phase 1 cases in [`PHASE_1_TEST_CASES.md`](PHASE_1_TEST_CASES.md) remain part of the regression suite.

## Preconditions

- Docker Desktop is running.
- `.env` exists from `.env.example`.
- The stack was started with `docker compose up --build`, so the Phase 2 migration and seed have run.
- Chromium for Playwright is installed once with `pnpm --filter @continuum/web exec playwright install chromium`.

Expected seed contents, used throughout this document:

| Record                                          | Count |
| ----------------------------------------------- | ----- |
| Demo authentication users                       | 3     |
| Departments                                     | 6     |
| Employees                                       | 35    |
| Knowledge areas                                 | 25    |
| Business objects                                | 12    |
| Knowledge-to-object links                       | 44    |
| Evidence records                                | 186   |
| Knowledge areas with criticality of 80% or more | 12    |

## Automated Regression Gate

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm check
docker compose config --quiet
```

With the Compose stack running and seeded:

```bash
pnpm test:integration
pnpm test:e2e
```

Expected result: every command exits with code `0`. `pnpm test:integration` calls the live API at `API_BASE_URL` (default `http://localhost:3001/api/v1`). `pnpm test:e2e` drives Chromium with three workers against `E2E_BASE_URL` (default `http://localhost:3000`). Both use `DEMO_USER_PASSWORD` or `E2E_PASSWORD`, defaulting to the development password.

## TC-P2-001: Migration Upgrade and Fresh Install

Purpose: prove the Phase 2 migration works on both an existing Phase 1 database and an empty one.

Steps:

1. With a Phase 1 database running, run `docker compose up --build`.
2. Run `docker compose logs migrate`.
3. Run `docker compose down --volumes --remove-orphans`, then `docker compose up --build`.

Expected:

- Both runs apply `20260927120000_phase_2_core_data` and `migrate` exits `0`.
- The `pg_trgm` extension exists: `docker compose exec postgres psql -U continuum -d continuum -c "select extname from pg_extension"`.
- `prisma migrate diff --from-url <database URL> --to-schema-datamodel prisma/schema.prisma --exit-code` exits `0`.

## TC-P2-002: Seed Idempotency

Purpose: ensure the synthetic dataset is deterministic and safe to repeat.

Steps:

1. Run `docker compose run --rm seed` twice.
2. Count the rows in `users`, `departments`, `employees`, `knowledge_areas`, `business_objects`, `knowledge_business_objects`, and `evidence`.
3. Sign in with each demo account.

Expected:

- Both runs exit `0` and log the same totals.
- Row counts match the table above.
- Demo users keep their Phase 1 IDs, names, and roles.
- `ev_line4_troubleshooting_001` has `occurred_at` of `2026-08-23 00:00:00+00` after every run.

## TC-P2-003: Database Integrity Rules

Purpose: verify the agreed deletion behavior and value ranges.

Steps, each in `docker compose exec postgres psql -U continuum -d continuum`:

1. `update evidence set strength = 1.5 where id = 'ev_line4_troubleshooting_001';`
2. `delete from employees where id = 'emp_budi';`
3. `delete from departments where id = 'dep_finance';`
4. `begin; delete from business_objects where id = 'bo_packaging_line_2'; select count(*) from knowledge_business_objects where business_object_id = 'bo_packaging_line_2'; rollback;`

Expected:

- Step 1 fails on `evidence_strength_range`.
- Step 2 fails on `evidence_employee_id_fkey`, because evidence is an audit trail.
- Step 3 fails on `employees_department_id_fkey`.
- Step 4 returns `0`: links are deleted with their business object. The rollback leaves the data unchanged.

## TC-P2-004: Domain API Authentication Boundary

Purpose: verify every new endpoint is protected by default.

Steps:

1. Request `GET /api/v1/knowledge` without a bearer token.
2. Repeat with `Authorization: Bearer invalid`.
3. Repeat both for `/dashboard/summary`, `/departments`, `/employees`, `/business-objects`, and `/evidence`.

Expected:

- Every request returns HTTP `401`.
- With a valid token from `POST /api/v1/auth/login`, every request returns `200` for all three roles.

## TC-P2-005: API Pagination, Filtering, and Sorting

Purpose: verify validated, deterministic list resources.

Steps, using a valid token:

1. `GET /knowledge?pageSize=10&page=3`
2. `GET /knowledge?search=LINE%204`
3. `GET /knowledge?departmentId=dep_finance`
4. `GET /knowledge?category=Tax%20Compliance`
5. `GET /knowledge?sort=criticality`
6. `GET /knowledge/ka_line4_troubleshooting/evidence?type=INCIDENT_RESOLVED`
7. `GET /employees?departmentId=dep_manufacturing`
8. `GET /business-objects?type=PROCESS`

Expected:

- Step 1 returns 5 records and `meta` of `{ page: 3, pageSize: 10, total: 25, totalPages: 3 }`.
- Step 2 includes `ka_line4_troubleshooting`; search ignores case.
- Step 3 returns 4 Finance knowledge areas; step 4 returns 2.
- Step 5 starts with Production Line 4 Troubleshooting at `0.96`, and criticality never increases down the list.
- Step 6 returns 3 incidents, newest first.
- Step 7 returns 7 people in alphabetical order; step 8 returns 3 processes.

## TC-P2-006: API Validation and Errors

Purpose: verify input is validated at the boundary and errors are user-safe.

Steps, using a valid token:

1. Request `/knowledge?pageSize=101`, `/knowledge?page=0`, `/knowledge?sort=risk`, `/knowledge?unexpected=1`, `/evidence?type=GOSSIP`, and `/knowledge/bad%20id`.
2. Request `/knowledge/ka_line4_troubleshooting/evidence?knowledgeAreaId=ka_other`.
3. Request `/knowledge/ka_missing`, `/employees/emp_missing`, and `/evidence/ev_missing`.

Expected:

- Steps 1 and 2 return `400`; a nested route cannot override its parent ID.
- Step 3 returns `404` with a "not found" message.
- No response contains a stack trace, SQL, or connection detail.

## TC-P2-007: Dashboard Inventory

Purpose: verify the overview shows real seeded data and no risk or scores.

Steps:

1. Sign in as `manager@northstar.demo`.
2. Inspect `/dashboard`.

Expected:

- Stat cards show 25 knowledge areas (12 at 80% criticality or more), 35 people across 6 departments, 12 business objects, and 186 evidence records with the latest on 29 Aug 2026.
- "Most business-critical knowledge" lists six areas, starting with Production Line 4 Troubleshooting at 96%.
- Departments are listed alphabetically; each links to the knowledge explorer filtered by that department.
- Recent evidence lists five records, newest first, with links to the person and the knowledge area.
- No risk level, expertise score, or ranking of people appears.

## TC-P2-008: Knowledge Explorer

Purpose: verify search, filters, sorting, pagination, and the empty state.

Steps:

1. Open Knowledge from the sidebar.
2. Search for `line 4` and select Apply.
3. Select Clear, choose the Finance department, and apply.
4. Choose the Tax Compliance category and apply.
5. Clear, choose "Name, A to Z", and apply.
6. Clear and select Next at the bottom of the list.
7. Search for `no-such-knowledge`.

Expected:

- The default list shows 25 knowledge areas, highest business criticality first.
- Step 2 shows 2 knowledge areas, Production Line 4 Troubleshooting and Stamping Press Diagnosis, whose description mentions the line. The URL keeps the filter, so reloading shows the same result.
- Step 3 shows 4 areas; step 4 shows Indonesia VAT Reporting and Royalty Withholding Process.
- Step 5 starts with Authentication Service.
- Step 6 shows page 2 of 2 with 5 areas.
- Step 7 shows "No knowledge areas match these filters" with a Clear filters action.

## TC-P2-009: Knowledge Detail and Evidence

Purpose: verify a knowledge area shows its business objects and traceable evidence.

Steps:

1. Open Production Line 4 Troubleshooting.
2. Select the "Incident resolved" evidence filter.
3. Select All, then Next under the evidence table.
4. Select Budi Santoso under People with evidence.

Expected:

- The header shows the Manufacturing Operations category, the Manufacturing department, the description, 96% criticality, 4 people with evidence, 16 evidence records, and 23 Aug 2026 as the latest evidence.
- Connected business objects list Production Line 4 (impact 100%) before Packaging Line 2 (impact 40%).
- People with evidence are Andri Pratama, Budi Santoso, Joko Susilo, and Wahyu Hidayat, in that order, each with a record count, latest date, and evidence types.
- Step 2 shows exactly 3 incidents; step 3 shows page 2 of 2.
- Step 4 opens Budi Santoso's profile.

## TC-P2-010: People Directory and Profile

Purpose: verify people browsing without performance language.

Steps:

1. Open People, choose Manufacturing, and apply.
2. Open Budi Santoso.
3. Return to People, clear filters, and search for `Ayu`. Open Ayu Rahman.
4. Filter by Finance.

Expected:

- Step 1 shows 7 people alphabetically, each with the number of knowledge areas they have evidence in.
- Budi's profile lists Hydraulic Calibration, Production Line 4 Troubleshooting, Stamping Press Diagnosis, and Vendor Maintenance Workflow alphabetically, followed by paginated evidence.
- Ayu Rahman shows the "No knowledge areas yet" and "No evidence recorded" empty states.
- Step 4 shows Hendra Gunawan with an "On leave" badge.
- No page shows a score, rank, or productivity measure for a person.

## TC-P2-011: Not-Found Records

Purpose: verify unknown and malformed IDs render a safe not-found page.

Steps:

1. Open `/knowledge/ka_missing`, `/people/emp_missing`, and `/knowledge/bad%20id`.

Expected:

- Each shows "We could not find that record" inside the application shell with links to Knowledge and People.
- Anonymous requests to the same URLs redirect to sign-in without rendering record content.

## TC-P2-012: Loading and Error States

Purpose: verify the UI degrades safely when the API is unavailable.

Steps:

1. Throttle the network in browser developer tools and navigate between Knowledge and People.
2. Run `docker compose stop api` and reload `/knowledge`.
3. Run `docker compose start api`, wait until it is healthy, and select Try again.

Expected:

- Step 1 shows the skeleton loading state.
- Step 2 shows "We could not load this page" with a reference and no internal details.
- Step 3 recovers and shows the knowledge list.

## TC-P2-013: Expired API Token

Purpose: verify a rejected API token sends the user to sign in again without a redirect loop.

Steps:

1. Sign in and open `/knowledge`.
2. Recreate only the API with a different secret of at least 32 characters, without editing `.env`: `JWT_SECRET=<another secret> docker compose up -d --no-deps api`. In PowerShell, set `$env:JWT_SECRET` first and remove it afterward.
3. Reload `/knowledge`, then reload the sign-in page once more.
4. Sign in again.
5. Restore the API with `docker compose up -d --no-deps api` from a shell without the override.

Expected:

- Step 3 lands on `/sign-in?reason=expired` with "Your session has expired. Sign in again to continue." and the sign-in form, not the dashboard. The second reload stays there without a redirect loop.
- Signing in again reaches the dashboard and loads data.

## TC-P2-014: Responsive and Keyboard UX

Purpose: verify the new pages work on narrow screens and without a mouse.

Steps:

1. Set the viewport to `375 x 812`.
2. Visit the dashboard, Knowledge, a knowledge area, People, and a profile.
3. Using only the keyboard, use the skip link, move through the filters, change a select, apply, and follow a result link.
4. Use the mobile navigation to switch between Overview, Knowledge, and People.

Expected:

- No page scrolls horizontally; wide tables scroll inside their card.
- Secondary table columns collapse, and their key information moves under the primary cell.
- Every control has a visible focus indicator and a label, and the current navigation item is marked.
- The active section is highlighted in both the sidebar and the mobile navigation.

## TC-P2-015: API Token Confinement

Purpose: verify the API token stays on the server now that pages call the API.

Steps:

1. Sign in and view the page source of `/knowledge`.
2. Request `/api/auth/session` with the browser's cookies.
3. Run `pnpm --filter @continuum/web build`, then search `apps/web/.next/static` for `accessToken`, `Bearer`, `INTERNAL_API_URL`, and `api/v1`.

Expected:

- Neither the HTML nor the session JSON contains the API token.
- The browser never calls the API directly; all API requests come from the Next.js server.
- The static client bundles contain none of the searched terms.

## Regression Evidence

Run on 2026-09-27 on Windows 11 with Node.js 22.19.0, pnpm 10.17.1, and Docker Desktop 28.4.0.

| Check                           | Result      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 baseline before work    | Pass        | Lint, typecheck, and 17 unit tests passed before any Phase 2 change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Frozen dependency install       | Pass        | The web image build ran `pnpm install --frozen-lockfile` with the updated lockfile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Formatting                      | Pass        | `prettier --check .` exited `0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| API and web lint                | Pass        | ESLint exited `0` for both applications                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| API and web typecheck           | Pass        | TypeScript exited `0` for both applications                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| API unit tests                  | Pass        | 64 tests across 14 files, including seed dataset integrity and query validation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Web unit tests                  | Pass        | 20 tests across 6 files, including the server-side API client                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Production builds               | Pass        | Nest build and Next.js build completed; all new routes are dynamic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| TC-P2-001 upgrade from Phase 1  | Pass        | `migrate deploy` applied the Phase 2 migration to the running Phase 1 database; `migrate diff --exit-code` reported no drift                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| TC-P2-002 seed idempotency      | Pass        | Two native seed runs and one container seed run logged identical totals; row counts match the table above with 3 users unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| TC-P2-003 integrity rules       | Pass        | Strength `1.5` violated the check constraint; employee and department deletes were blocked; the business object delete cascaded links                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| TC-P2-004 to TC-P2-006 API      | Pass        | `pnpm test:integration`: 42 tests passed against the rebuilt Compose API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| TC-P2-015 client bundle scan    | Pass        | None of the searched terms appear in `apps/web/.next/static`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Container rebuild               | Pass        | Rebuilt API and web images; `migrate` and `seed` exited `0`; all four services reported healthy                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Browser tests (`pnpm test:e2e`) | Pass        | 6 of 6 on the default command; 126 of 126 across repeated runs with one to three workers; no request URL contained a password                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Browser tests, six workers      | Known limit | About 10% of sign-ins stalled because Chromium never sent the Auth.js `csrf` fetch; the server answered probes within 0.31 s throughout, so the suite is capped at three workers                                                                                                                                                                                                                                                                                                                                                                                      |
| TC-P2-001 fresh volumes         | Pass        | After `down --volumes`, `up --build` applied both migrations; `migrate` and `seed` exited `0`; all services healthy; `pg_trgm` 1.6 and the five range constraints exist; no drift; seed counts match; 42 integration and 6 browser tests passed                                                                                                                                                                                                                                                                                                                       |
| TC-P2-012 loading and error     | Pass        | Scripted with Playwright: the skeleton status showed while a People render was delayed 2.5 s; with the API stopped, `/knowledge` showed the error page with reference `1935437227`, which matched the server log entry `TypeError: fetch failed`, and the HTML contained no connection details; Try again recovered after the API restarted                                                                                                                                                                                                                           |
| TC-P2-013 expired API token     | Pass        | Scripted with Playwright: after the API was recreated with a rotated secret, `/knowledge` redirected to `/sign-in?reason=expired` with the notice and form, a reload did not loop, and signing in again loaded data; the API was then restored to the `.env` secret and both suites passed                                                                                                                                                                                                                                                                            |
| TC-P2-007 to TC-P2-011 manual   | Pass        | Tested by hand in a browser: dashboard inventory, knowledge explorer, knowledge detail and evidence, people directory and profiles, and not-found records all matched their expected results; the browser tests also cover these paths                                                                                                                                                                                                                                                                                                                                |
| TC-P2-014 narrow screen         | Pass        | Browser tests found no horizontal overflow at `375 x 812` on the dashboard, knowledge list, and a profile, and the mobile navigation reached People                                                                                                                                                                                                                                                                                                                                                                                                                   |
| TC-P2-014 keyboard only         | Pass        | Scripted keyboard-only walkthrough, 14 of 14 checks on two runs: the skip link appears and moves focus to the main content; the sidebar and mobile navigation mark the current section; search, dropdown selection by typing, Apply, result links, evidence filters, pagination, breadcrumbs, and the people filter and profile all work from the keyboard; all 176 Tab stops have a focus style, are on screen, and have an accessible name; "Soon" sections are not focusable. Screenshots of each focused control were reviewed for visibility after the fix below |

Fixes made during Phase 2 browser testing:

- `apps/web/app/sign-in/sign-in-form.tsx` keeps the submit button disabled until the form hydrates and submits with `POST`. A click before hydration had sent the email and password as URL parameters (`GET /sign-in?email=...&password=...`), which would expose them in browser history, logs, and `Referer` headers. This Phase 1 defect is now guarded by a browser test that fails if any request URL contains a password.
- `apps/web/app/globals.css` now sets the default border color inside `@layer base`. The rule was unlayered, and unlayered CSS outranks Tailwind utilities, so it overrode every border color class. Text inputs and dropdowns therefore showed no border change on focus, only a faint 15% ring, and badges, alerts, and table dividers lost their intended colors. This Phase 1 defect also affected the sign-in form.
- `apps/web/playwright.config.ts` runs three workers. With six, Chromium intermittently never sent a sign-in request while the server stayed responsive.

Every Phase 2 case passed on 2026-09-27. After the last fix, formatting, lint, typecheck, 84 unit tests, both production builds, and 6 of 6 browser tests passed again.
