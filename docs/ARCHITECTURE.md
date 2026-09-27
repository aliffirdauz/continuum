# Phase 1 Architecture

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
| PostgreSQL  | Durable identities now and organizational knowledge data in later phases                            |
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

The Phase 1 `User` model is an authentication identity. It is not an organizational `Employee` and does not contain department, job title, location, evidence, or expertise data. Keeping these concepts separate prevents authentication concerns from distorting the Phase 2 domain model.

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
- Seed records have stable IDs and are upserted by email.
- Re-running the seed updates the three demo identities without duplicating them.
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

## Phase 2 Extension Points

Phase 2 will add domain modules to the existing NestJS application, not new services. It will introduce `Department`, `Employee`, `KnowledgeArea`, `BusinessObject`, `KnowledgeBusinessObject`, and `Evidence`, followed by their REST resources and browsable web pages.
