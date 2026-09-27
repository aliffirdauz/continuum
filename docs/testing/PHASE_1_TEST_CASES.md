# Phase 1 Test Cases

Last updated: 2026-09-27

Use this document to verify the Continuum foundation after setup or any infrastructure, authentication, or application-shell change.

## Preconditions

- Docker Desktop is running.
- Ports `3000`, `3001`, `5432`, and `6379` are available, or their values are changed in `.env`.
- `.env` exists from `.env.example`.
- No real credentials or production data are used.

## Automated Regression Gate

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose config --quiet
```

Expected result: every command exits with code `0` and both application production builds complete.

## TC-P1-001: Fresh Stack Startup

Purpose: prove a new developer can start the entire system from committed files.

Steps:

1. Run `docker compose down --volumes --remove-orphans`.
2. Run `docker compose up --build`.
3. Wait until `postgres`, `redis`, `api`, and `web` report healthy.
4. Run `docker compose ps`.

Expected:

- `migrate` and `seed` exit with code `0`.
- All four long-running services are healthy.
- The web application responds at `http://localhost:3000`.

## TC-P1-002: Health Separation

Purpose: distinguish process liveness from dependency readiness.

Steps:

1. Open `http://localhost:3001/api/v1/health/live`.
2. Open `http://localhost:3001/api/v1/health/ready`.

Expected:

- Liveness returns HTTP `200` with `status: "ok"`.
- Readiness returns HTTP `200`, `database: "up"`, and `redis: "up"`.
- Neither response contains secrets or connection strings.

## TC-P1-003: Protected Web Route

Purpose: verify server-side route protection.

Steps:

1. Open a private browser window.
2. Navigate directly to `http://localhost:3000/dashboard`.

Expected:

- The browser is redirected to `/sign-in`.
- No dashboard content flashes before the redirect.

## TC-P1-004: Valid Login for Every Role

Purpose: verify all required roles can authenticate.

Steps:

1. Sign in as `employee@northstar.demo`.
2. Confirm the shell labels the role as Employee, then sign out.
3. Repeat for `manager@northstar.demo` and confirm Department manager.
4. Repeat for `admin@northstar.demo` and confirm Knowledge administrator.

Expected:

- Every account reaches `/dashboard`.
- Name and role are correct.
- No password or API access token is visible in the URL, rendered HTML, or Auth.js session response.

## TC-P1-005: Invalid Login

Purpose: verify safe authentication failure.

Steps:

1. Enter a valid demo email with an incorrect password.
2. Submit the form.
3. Enter an unknown email with the same incorrect password.

Expected:

- Both attempts remain on the sign-in page.
- Both show the same generic error.
- The response does not disclose whether an account exists.

## TC-P1-006: API Authentication Boundary

Purpose: verify protected API routes are deny-by-default.

Steps:

1. Request `GET http://localhost:3001/api/v1/auth/me` without a bearer token.
2. Request it again with `Authorization: Bearer invalid`.
3. Use `POST /api/v1/auth/login` in Swagger to obtain a valid token.
4. Authorize Swagger with that token and request `/api/v1/auth/me`.

Expected:

- Missing and invalid tokens return HTTP `401`.
- A valid token returns only `sub`, `email`, and `role` claims.

## TC-P1-007: Sign Out

Purpose: verify session termination.

Steps:

1. Sign in successfully.
2. Select Sign out.
3. Navigate directly to `/dashboard`.

Expected:

- Sign out returns to `/sign-in`.
- The subsequent dashboard request redirects to sign-in again.

## TC-P1-008: Seed Idempotency

Purpose: ensure setup can be safely repeated.

Steps:

1. Run `docker compose run --rm seed` twice.
2. Sign in with each of the three accounts.
3. Optionally query the `users` table and count rows.

Expected:

- Both seed runs exit with code `0`.
- Exactly three demo authentication identities exist.
- IDs and roles remain stable.

## TC-P1-009: Persistence Across Restart

Purpose: verify named volumes preserve state.

Steps:

1. Start the stack and sign in once.
2. Run `docker compose down` without `--volumes`.
3. Run `docker compose up`.
4. Sign in again.

Expected:

- Migrations and seed remain safe to repeat.
- Login works after restart.
- PostgreSQL and Redis volumes are reused.

## TC-P1-010: Responsive and Keyboard UX

Purpose: verify the foundation UI remains usable without a mouse and on small screens.

Steps:

1. Set the browser viewport to `375 x 812`.
2. Navigate through sign-in using only `Tab`, `Shift+Tab`, `Enter`, and `Space`.
3. Sign in and inspect the dashboard at mobile and desktop widths.
4. Activate the Skip to content link with the keyboard.

Expected:

- No horizontal page overflow occurs.
- Every interactive control has a visible focus indicator and accessible label.
- The mobile header and navigation remain usable.
- Desktop sidebar content does not overlap the main content.
- The skip link moves focus to the primary content.

## TC-P1-011: Readiness Degradation

Purpose: verify dependency failure is represented accurately.

Steps:

1. With the stack running, stop Redis using `docker compose stop redis`.
2. Request `/api/v1/health/live`.
3. Request `/api/v1/health/ready`.
4. Restart Redis using `docker compose start redis`.

Expected:

- Liveness continues returning HTTP `200` while the API process is running.
- Readiness returns HTTP `503` and identifies Redis as down.
- Readiness returns HTTP `200` again after Redis recovers.

## TC-P1-012: Demo Credential Visibility

Purpose: ensure demo affordances can be disabled.

Steps:

1. Set `SHOW_DEMO_CREDENTIALS=false` in `.env`.
2. Recreate the web service.
3. Open `/sign-in`.

Expected:

- Quick demo account buttons are absent.
- Manual credential entry remains functional.

## Regression Evidence

| Check                     | Result  | Evidence                                                                    |
| ------------------------- | ------- | --------------------------------------------------------------------------- |
| Frozen dependency install | Pass    | Lockfile install and Prisma generation exited `0` on 2026-09-27             |
| Formatting                | Pass    | Prettier check exited `0` on 2026-09-27                                     |
| API lint                  | Pass    | ESLint exited `0` on 2026-09-27                                             |
| Web lint                  | Pass    | ESLint exited `0` on 2026-09-27                                             |
| API typecheck             | Pass    | TypeScript exited `0` on 2026-09-27                                         |
| Web typecheck             | Pass    | TypeScript exited `0` on 2026-09-27                                         |
| API unit tests            | Pass    | 12 tests across 5 files on 2026-09-27                                       |
| Web unit tests            | Pass    | 2 tests across 2 files on 2026-09-27                                        |
| API production build      | Pass    | Nest build produced `dist/main.js` on 2026-09-27                            |
| Web production build      | Pass    | Next.js build completed on 2026-09-27                                       |
| Prisma schema and SQL     | Pass    | Schema validated and empty-to-schema SQL matched the baseline               |
| Dependency security audit | Pass    | `pnpm audit --prod` reported no known vulnerabilities                       |
| Production web smoke      | Pass    | Sign-in `200`, protected redirect `307`, session `{}`, and no password HTML |
| Compose configuration     | Pass    | `docker compose config --quiet` exited `0` on 2026-09-27                    |
| Full container smoke test | Pending | Docker Windows service required privileges unavailable in this session      |

Do not mark a future infrastructure change complete while the full container smoke test is pending or failing.
