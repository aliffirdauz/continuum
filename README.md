# Continuum

Continuum is an internal organizational knowledge resilience platform. It helps an organization understand where critical knowledge lives, detect dangerous concentration, simulate key-person unavailability, and build measurable backup expertise.

The product evaluates the resilience of **knowledge areas**, not employee performance.

## Development Status

Phase 1, the platform foundation, is complete. Its full container acceptance passed on 2026-09-27. The implementation includes:

- a pnpm and Turborepo monorepo;
- a Next.js web application and NestJS REST API;
- PostgreSQL with committed Prisma migrations;
- Redis connectivity and readiness checks;
- Auth.js credentials authentication with three demo roles;
- an idempotent authentication seed;
- production-oriented Docker images and Docker Compose orchestration;
- an accessible, responsive sign-in experience and protected application shell.

Phase 2, core data, is in progress. It adds:

- departments, employees, knowledge areas, business objects, their links, and evidence in PostgreSQL;
- a deterministic synthetic dataset for Northstar Industries: 35 people, 25 knowledge areas, 12 business objects, and 186 evidence records;
- read-only, validated, paginated REST resources for every core entity;
- an inventory dashboard, a searchable knowledge explorer, knowledge area detail pages with evidence, and a people directory with profiles.

Expertise scores, risk levels, simulation, and transfer planning belong to later phases and are intentionally absent. See [`docs/DEVELOPMENT_PHASES.md`](docs/DEVELOPMENT_PHASES.md) for the complete roadmap and the Phase 2 decisions.

## Architecture

```text
Browser
   |
   v
Next.js web :3000
   |  Auth.js server-side credential exchange
   v
NestJS API :3001
   |                    |
   v                    v
PostgreSQL :5432     Redis :6379
```

The API is a modular monolith. PostgreSQL remains the source of truth, while Redis is reserved for queues and caching in later phases. Next.js never connects directly to the database.

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for component boundaries, authentication flow, and startup sequencing.

## Prerequisites

For the recommended Docker workflow:

- Docker Desktop with Docker Compose v2

For native application development:

- Node.js 22.12 or newer
- pnpm 10.17.x through Corepack
- Docker Desktop for PostgreSQL and Redis

## Quick Start

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Start the complete stack:

```bash
docker compose up --build
```

The first startup builds both applications, waits for PostgreSQL, applies committed migrations, runs the idempotent seed (demo accounts plus the Northstar dataset), waits for Redis, and then starts the API and web application.

Open:

| Service           | URL                                       |
| ----------------- | ----------------------------------------- |
| Web application   | http://localhost:3000                     |
| API documentation | http://localhost:3001/docs                |
| API liveness      | http://localhost:3001/api/v1/health/live  |
| API readiness     | http://localhost:3001/api/v1/health/ready |

Stop the stack with:

```bash
docker compose down
```

## Demo Accounts

All seeded accounts use the password configured by `DEMO_USER_PASSWORD`. The development default is `ContinuumDemo123!`.

| Role                    | Email                     |
| ----------------------- | ------------------------- |
| Employee                | `employee@northstar.demo` |
| Department manager      | `manager@northstar.demo`  |
| Knowledge administrator | `admin@northstar.demo`    |

The default credentials are development-only. Replace every secret in `.env` before deploying outside a local machine and set `SHOW_DEMO_CREDENTIALS=false`.

## Native Development

Enable the package manager declared in `package.json`:

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
```

If the machine prevents Corepack from writing global shims, use `npx --yes pnpm@10.17.1 <command>` for root Turborepo commands, or install pnpm 10.17.x through the platform's package manager.

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Create application environment files:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Start only the backing services:

```bash
docker compose up -d postgres redis
```

Apply the migration and seed:

```bash
pnpm db:migrate
pnpm db:seed
```

Start both applications in watch mode:

```bash
pnpm dev
```

## Quality Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the full local regression gate with:

```bash
pnpm check
```

API integration and browser tests run against a running, seeded stack such as `docker compose up`:

```bash
pnpm --filter @continuum/web exec playwright install chromium   # once per machine
pnpm test:integration
pnpm test:e2e
```

They default to `http://localhost:3001/api/v1` and `http://localhost:3000`; override them with `API_BASE_URL` and `E2E_BASE_URL`. Both sign in with `DEMO_USER_PASSWORD` or `E2E_PASSWORD`, which default to the development password.

Phase-specific manual and automated acceptance cases are documented in [`docs/testing/PHASE_1_TEST_CASES.md`](docs/testing/PHASE_1_TEST_CASES.md) and [`docs/testing/PHASE_2_TEST_CASES.md`](docs/testing/PHASE_2_TEST_CASES.md).

## Database Workflows

Generate Prisma Client after changing the schema:

```bash
pnpm db:generate
```

Create a development migration:

```bash
pnpm db:migrate
```

Re-run the idempotent seed:

```bash
pnpm db:seed
```

The seed upserts records by stable IDs such as `ka_line4_troubleshooting` and never deletes data. Evidence dates are fixed offsets from `2026-09-01`, so repeated runs write identical rows. The dataset lives in `apps/api/prisma/seed-data/northstar.ts`.

Reset all local Compose data only when a destructive reset is intended:

```bash
pnpm compose:reset
docker compose up --build
```

## Repository Layout

```text
continuum/
|-- apps/
|   |-- api/                  NestJS API, Prisma schema, migrations, seed, and integration tests
|   `-- web/                  Next.js application, shadcn/ui primitives, and Playwright tests
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- DEVELOPMENT_PHASES.md
|   `-- testing/
|       |-- PHASE_1_TEST_CASES.md
|       `-- PHASE_2_TEST_CASES.md
|-- AGENTS.md                 Contributor and coding-agent guardrails
|-- docker-compose.yml
|-- pnpm-workspace.yaml
`-- turbo.json
```

## Product Principles

- Evaluate knowledge resilience, never employee productivity.
- Derive expertise from traceable evidence.
- Keep every score deterministic and explainable.
- Collect the minimum data needed for organizational risk analysis.
- Prefer a modular monolith and testable domain services over premature infrastructure.

The complete product brief remains the source of truth in [`continuum_project_spec.md`](continuum_project_spec.md).
