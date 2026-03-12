# Project Guidelines

## Architecture

- ByteRoute is a pnpm and Turborepo monorepo with four main areas: `apps/backend` for the Express and Socket.IO API, `apps/dashboard` for the Vue 3 dashboard, `apps/client-go` for the Linux packet-capture client, and `packages/shared` for TypeScript code shared by backend and dashboard.
- Backend request handling is organized by layer under `src/auth`, `src/controllers`, `src/routes`, `src/services`, `src/db`, and `src/domain`. Keep business rules out of route wiring when extending backend behavior.
- Dashboard code is organized under `src/components`, `src/views`, `src/stores`, `src/composables`, and `src/services`. Reuse shared types and helpers from `@byteroute/shared` before introducing duplicate client-side models.
- The backend compiles and applies the domain DSL from `apps/backend/config/domain.dsl.yaml`; changes to ingestion or analytics behavior may require updating that DSL as well as TypeScript code.

## Build And Test

- Use the root workspace commands for cross-package work: `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm coverage`.
- Use workspace filters for package-specific work: `pnpm -F @byteroute/backend ...`, `pnpm -F @byteroute/dashboard ...`, and `pnpm -F @byteroute/client-go ...`.
- Backend tests depend on the shared package build step. If you run backend tests directly, expect `packages/shared` to be built first by the existing scripts.
- Dashboard browser tests require Playwright browsers. Install them with `pnpm --filter @byteroute/dashboard exec playwright install --with-deps <browser>` before running `test:browser` in a fresh environment.
- Go client work is Linux-specific and requires `libpcap-dev`. CI also builds the client through `apps/client-go/Dockerfile.static`, so changes to the client should preserve both native and Docker builds.
- CI validates `docs/` with `make pdf`, so code or documentation changes that affect LaTeX inputs should be checked against that build.

## Conventions

- Prefer minimal, targeted changes and preserve the existing package boundaries in this monorepo.
- Prefer root `pnpm` commands or workspace filters over ad hoc per-package install flows.
- The backend lint script runs ESLint with `--fix`, so avoid using it as a passive verification step unless you are prepared for file edits.
- Treat generated coverage outputs and report artifacts as derived files unless the task is specifically about coverage reporting.
- Authentication and tenant handling are core backend concerns. For API changes, verify whether the affected route lives under `/auth` or `/api` and whether tenant resolution or bearer auth behavior must also change.

## References

- See `README.md` for local development and Docker Compose flows.
- See `apps/backend/README.md`, `apps/dashboard/README.md`, and `apps/client-go/README.md` for package-specific runtime requirements and commands.