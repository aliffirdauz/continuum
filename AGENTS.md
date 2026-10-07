# Continuum Engineering Guide

This file defines working rules for human contributors and coding agents.

## Source of Truth

Read these files before making a product or architecture change:

1. `continuum_project_spec.md` for product intent and scope.
2. `docs/DEVELOPMENT_PHASES.md` for the active phase and completed work.
3. The relevant document under `docs/testing/` for acceptance criteria.
4. `docs/ARCHITECTURE.md` for service and security boundaries.

If the implementation and specification disagree, stop and document the decision before expanding scope.

## Current Boundary

Phase 1 is complete, including its container acceptance tests. It provides infrastructure, authentication identities, health checks, migration and seed mechanics, and the application shell.

Phase 2, core data, is complete, including its browser and container acceptance tests. It adds the domain schema, the deterministic Northstar seed, read-only domain endpoints, and the dashboard, knowledge, and people pages. Its scope, exclusions, and decisions are recorded in `docs/DEVELOPMENT_PHASES.md`.

Phase 3, expertise, is complete. Formula functions, protected read-only endpoints, and web surfaces are implemented; see `docs/DEVELOPMENT_PHASES.md` and `docs/testing/PHASE_3_TEST_CASES.md` for decisions and acceptance evidence.

Phase 4, knowledge-area risk, is complete. Protected risk reads, knowledge-admin-only snapshot capture, a forward migration, and server-rendered risk surfaces are implemented; automated and visual/keyboard/outage acceptance evidence is recorded in `docs/testing/PHASE_4_TEST_CASES.md`.

Do not mistake an authentication `User` for the domain `Employee`. They have different responsibilities and are deliberately unlinked.

Do not add simulation, transfer planning, real connectors, AI, Neo4j, or microservices before their scheduled phase.

## Architecture Rules

- Keep the system a modular monolith.
- The NestJS API owns database access. The Next.js application must not instantiate Prisma.
- PostgreSQL is the source of truth.
- Keep API routes authenticated by default; mark the smallest possible surface with `@Public()`.
- Keep API access tokens server-side. Never expose them through the Auth.js session, rendered HTML, local storage, or client logs.
- Call `requireSession()` from `apps/web/lib/session.ts` in every protected page. A layout check alone does not stop the page from rendering into the RSC payload.
- Call the API from server components through `apiGet()` in `apps/web/lib/api.ts`, which is server-only. Never call the API from the browser.
- Keep secrets in environment variables and maintain matching `.env.example` files.
- Use committed Prisma migrations in runtime environments. Never use `prisma db push` for startup.
- Make seeds deterministic, idempotent, and non-destructive. Append seed evidence to the end of its group, because a record's position is part of its stable ID.
- Keep business formulas in framework-independent services when scoring phases begin.

## Implementation Rules

- Prefer the smallest correct change.
- Use strict TypeScript and avoid `any`.
- Validate input at system boundaries.
- Use explicit, user-safe errors; never leak credentials or internals.
- Keep components server-rendered unless browser state or event handling requires `"use client"`.
- Reuse the shadcn/ui primitives under `apps/web/components/ui`.
- Preserve keyboard operation, visible focus, semantic labels, responsive behavior, and sufficient contrast.
- Do not show employee rankings, productivity scores, or surveillance-oriented language.
- Add comments only when intent is not evident from the code.

## Required Workflow

For every development phase:

1. Update the phase status and acceptance criteria in `docs/DEVELOPMENT_PHASES.md`.
2. Implement only that phase's agreed scope.
3. Add focused automated tests for new behavior.
4. Add or update `docs/testing/PHASE_<N>_TEST_CASES.md` with reproducible user tests.
5. Run lint, typecheck, unit tests, production builds, and relevant integration tests.
6. Record actual regression evidence in the phase test document.
7. Mark a phase complete only after its definition of done passes.

## Commands

Run from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
docker compose config --quiet
docker compose up --build
pnpm test:integration   # needs the running stack
pnpm test:e2e           # needs the running stack and Playwright's Chromium
```

When `pnpm` shims are unavailable, use `npx --yes pnpm@10.17.1 <command>` for root Turborepo commands. Direct package commands can also use Corepack, for example `corepack pnpm --filter @continuum/api test`.

## Change Checklist

- Scope matches the active development phase.
- Migrations are forward-only and committed.
- Seeds remain safe to run repeatedly.
- Protected API endpoints reject missing and invalid tokens.
- UI states cover loading, empty, error, and narrow screens where applicable.
- No private token, password, or environment secret reaches a client bundle.
- Tests document both expected behavior and regression risk.
- README and phase docs reflect any changed command or operational behavior.
