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

Domain entities and Northstar's synthetic organizational dataset belong to Phase 2 and are intentionally not included yet. See [`docs/DEVELOPMENT_PHASES.md`](docs/DEVELOPMENT_PHASES.md) for the complete roadmap.

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

The first startup builds both applications, waits for PostgreSQL, applies committed migrations, runs the idempotent seed, waits for Redis, and then starts the API and web application.

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

Phase-specific manual and automated acceptance cases are documented in [`docs/testing/PHASE_1_TEST_CASES.md`](docs/testing/PHASE_1_TEST_CASES.md).

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

Reset all local Compose data only when a destructive reset is intended:

```bash
pnpm compose:reset
docker compose up --build
```

## Repository Layout

```text
continuum/
|-- apps/
|   |-- api/                  NestJS API, Prisma schema, migration, and seed
|   `-- web/                  Next.js application and shadcn/ui primitives
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- DEVELOPMENT_PHASES.md
|   `-- testing/
|       `-- PHASE_1_TEST_CASES.md
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
