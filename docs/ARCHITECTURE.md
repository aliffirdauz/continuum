# Architecture

## System Context

Continuum currently runs as a modular monolith with two deployable applications and two backing services.

```text
                         +----------------------+
                         |      Web browser     |
                         +----------+-----------+
                                    |
                                    | HTTP :3000
                                    v
                         +----------------------+
                         | Next.js + Auth.js    |
                         | apps/web             |
                         +----------+-----------+
                                    |
                                    | server-side REST
                                    v
                         +----------------------+
                         | NestJS REST API      |
                         | apps/api             |
                         +-----+-----------+----+
                               |           |
                               v           v
                        +----------+   +----------+
                        |PostgreSQL|   |  Redis   |
                        +----------+   +----------+
```

## Responsibilities

| Component   | Responsibility                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Next.js web | User experience, server-side route protection, Auth.js session lifecycle, and server-side API calls |
| NestJS API  | Input validation, authentication, authorization, future business logic, and all database access     |
| PostgreSQL  | Durable identities and the organizational knowledge inventory                                       |
| Redis       | Connectivity foundation now; BullMQ and caching in later phases                                     |
| Prisma      | Schema, generated database client, migrations, and deterministic seed access                        |

## Authentication Flow

```text
1. User submits credentials to Auth.js.
2. Auth.js calls POST /api/v1/auth/login from the Next.js server.
3. NestJS validates the password hash stored in PostgreSQL.
4. NestJS returns a short-lived signed API token and safe identity fields.
5. Auth.js stores the API token inside its encrypted, HTTP-only JWT cookie.
6. The browser-visible session contains id, name, email, and role only.
7. Every protected Next.js page verifies the session on the server with `requireSession()`. The layout check alone is not enough, because a layout does not stop its page from rendering.
8. Protected NestJS routes require a valid bearer token by default.
```

The Auth.js session secret and API JWT secret are deliberately separate. The API token must never be copied into the browser-visible session object.

## Identity Boundary

`User` is an authentication identity. `Employee` is an organizational record with a department, job title, location, and evidence. They are deliberately unlinked: demo users share names with some employees, but no foreign key connects them. A later phase may associate them when a feature, such as scoping a manager to their department, needs it.

## Domain Model

```text
Department 1---* Employee 1---* Evidence *---1 KnowledgeArea *---1 Department
Department 1---* BusinessObject
KnowledgeArea *---* BusinessObject   (KnowledgeBusinessObject, with impactWeight)
```

| Relationship                                               | On delete of the parent                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Department to employee, knowledge area, or business object | Restricted while referenced                                                |
| Employee or knowledge area to evidence                     | Restricted; evidence is an audit trail, so retire records through `status` |
| Knowledge area or business object to link                  | Cascades; a link has no meaning without both sides                         |

Criticality, decay rate, impact weight, and evidence strength are stored from `0.0` to `1.0` and enforced by database check constraints. Phase 3 uses evidence strength and decay rate for expertise and effective expert count; it does not calculate risk levels or risk scores (Phase 4).

Search uses case-insensitive substring matching. `pg_trgm` GIN indexes cover the searched columns (knowledge area name and description, employee name and job title, business object name), and B-tree indexes cover the common filters and the evidence timeline.

## Data Flow for Pages

```text
1. A protected page calls requireSession() and validates its URL parameters.
2. The page calls apiGet() in apps/web/lib/api.ts, a server-only module.
3. apiGet() decrypts the Auth.js cookie on the server to read the API token.
4. It calls the NestJS API with a bearer token and no browser involvement.
5. 401 redirects to /sign-in?reason=expired, 404 renders the not-found page,
   and any other failure renders the error boundary without internal details.
```

The browser never calls the API directly and never receives the API token. An API token can expire while the session cookie is still valid, so the sign-in page shows the form, instead of redirecting to the dashboard, when `reason=expired` is present.

Domain inventory and expertise endpoints remain read-only and available to every authenticated role. Phase 4 adds an explicit knowledge-admin-only snapshot capture; ordinary risk GETs have no write side effects. Lists return deterministic ordering and pagination metadata where applicable; expert search groups contributors under matched knowledge areas rather than creating a cross-area leaderboard.

## Startup Sequence

Docker Compose uses health and completion conditions rather than startup timing assumptions:

```text
PostgreSQL healthy
  -> migrate completes
  -> seed completes
  -> API starts after Redis is healthy
  -> API readiness succeeds
  -> web starts
```

The API exposes two probes:

- `/api/v1/health/live` confirms the Node.js process can answer requests.
- `/api/v1/health/ready` confirms both PostgreSQL and Redis are reachable.

## Data Lifecycle

- Runtime startup uses `prisma migrate deploy`, never schema push.
- The baseline migration is committed under `apps/api/prisma/migrations`.
- Demo users are upserted by email; domain records are upserted by stable, readable IDs.
- Re-running the seed updates records in place without duplicating or deleting them.
- Evidence dates are offsets from the fixed reference date `2026-09-01T00:00:00Z`, so every run writes identical rows.
- PostgreSQL and Redis data use named Docker volumes.

## Security Decisions

- NestJS endpoints are protected globally unless marked `@Public()`.
- Login errors do not reveal whether an account exists.
- Passwords use bcrypt with a cost factor of 12 in the seed.
- DTO validation strips unknown fields and rejects unexpected input.
- Environment validation fails startup when URLs or secrets are invalid.
- Demo credentials are visible only when `SHOW_DEMO_CREDENTIALS=true`.
- The web process never receives the demo password; operators obtain it from local setup documentation.
- Containers run application processes as the non-root `node` user.
- API access tokens are not returned by Auth.js session endpoints.

## Phase 3 Extension Points

Phase 3 calculates expertise on demand in the NestJS API. Formula functions under `apps/api/src/expertise/` are independent of NestJS and Prisma; the service reads evidence in batches, excludes records after an explicit `asOf` timestamp (default: request time), and exposes protected, read-only expert distribution, per-person expertise, and area-based expert search. Evidence weights, decay bands, the global score scale, confidence thresholds, and inverse HHI are recorded in [`DEVELOPMENT_PHASES.md`](DEVELOPMENT_PHASES.md). Scores are displayed per knowledge area, never as an organization-wide employee ranking. The web calls these endpoints through the existing server-only `apiGet()` path, so the token boundary is unchanged. No scoring cache or queue is required.

## Phase 4 Risk and Snapshot Boundary

The pure, versioned risk formula under `apps/api/src/risk/` combines area criticality, inverse-HHI effective expert count from uncapped and unrounded Phase 3 scores, evidence freshness, and documentation age. The NestJS risk service reads areas and evidence in batches, excludes evidence after `asOf`, computes deterministic levels from unrounded scores, and returns bounded dashboard summaries and per-area explanations. The web renders these through server-only API calls; no person receives an organization-wide risk rating.

`GET /api/v1/knowledge/:id/risk` and dashboard risk GETs calculate without persisting. `GET /api/v1/knowledge/:id/risk/snapshots` lists stored observations with pagination. Only `KNOWLEDGE_ADMIN` can call `POST /api/v1/knowledge/:id/risk/snapshots`, which rejects query/body parameters and captures the **current** calculation. A forward migration creates `knowledge_risk_snapshots` with a unique key on knowledge area, UTC snapshot date, and formula version; repeated captures retain the existing row and its audit inputs. Snapshots store the observed score, level, factors, effective count, evidence ages/count, `asOf`, and capture time. A later recomputation of an old `asOf` is not a historical reconstruction of mutable source records. Runtime startup applies this migration via `prisma migrate deploy`; it does not create snapshots on GET or seed.
