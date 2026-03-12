---
description: "Use when editing the ByteRoute backend API, Express routes, controllers, services, middleware, Mongo persistence, auth, tenant resolution, ingestion, metrics, or the domain DSL. Covers backend-specific structure, testing, and API safety checks."
name: "ByteRoute Backend"
applyTo: "apps/backend/src/**/*.ts, apps/backend/test/**/*.ts, apps/backend/scripts/**/*.mjs"
---

# Backend Guidelines

- Keep backend changes inside the existing layers: route wiring in `src/routes`, HTTP handling in `src/controllers`, orchestration in `src/services`, domain contracts in `src/domain`, and persistence or auth adapters in `src/infrastructure`.
- Treat `src/config/composition-root.ts` as the dependency boundary. Prefer injecting or extending the existing `AppContext` instead of introducing ad hoc singletons.
- Preserve the auth split in `src/routes/index.ts`: `/auth/*` endpoints are defined explicitly, while `/api/*` is guarded by bearer auth middleware. When adding or changing routes, verify whether the endpoint belongs under `/auth` or `/api` and whether it should affect CSRF, bearer auth, or both.
- Tenant-aware behavior is part of backend correctness. For changes touching connections, metrics, or tenant APIs, verify tenant resolution and avoid introducing code paths that bypass the current tenant selection rules.
- The backend loads and applies a compiled DSL from `apps/backend/config/domain.dsl.yaml`. If ingestion or analytics behavior changes, check whether the DSL, related infrastructure code, and tests all need to move together.

## Validation

- Prefer targeted commands such as `pnpm -F @byteroute/backend test`, `pnpm -F @byteroute/backend test:unit`, `pnpm -F @byteroute/backend test:e2e`, and `pnpm -F @byteroute/backend build`.
- Backend tests build `packages/shared` first through existing scripts. Do not remove that dependency when changing test flows.
- The backend lint script runs ESLint with `--fix`. Use it intentionally, because it may modify files beyond the line you touched.
- For API changes, add or update the most relevant unit or e2e coverage instead of relying only on typechecking.

## Working Notes

- Use the shared package for request and socket event types when a type is already exposed there.
- Keep route modules thin. If controller logic starts accumulating branching or data access concerns, move that work into services or domain-facing adapters.
- Preserve current request limits, startup wiring, and shutdown behavior in `src/index.ts` unless the task specifically changes runtime lifecycle behavior.
- For changes to the domain DSL, update the YAML file and verify that the compiled output and related TypeScript code are consistent with the intended behavior.

## Testing Style
- For unit tests, prefer direct imports from `src/` and test the smallest possible unit of behavior. Use mocks or stubs for dependencies outside the unit under test.
- For e2e tests, prefer black-box testing through HTTP or Socket.IO interfaces. Avoid direct imports from `src/` and treat the backend as a black box. Use test fixtures or test-specific setup flows to create the necessary state for each test case.
- For test data, prefer factory functions or builders that can create realistic objects with minimal required fields. Avoid hardcoding large objects in test files, and reuse factories across tests when possible.
- For test organization, mirror the `src/` structure under `test/` when it helps clarify the intent of the tests. For example, tests for route handlers can live under `test/routes`, while tests for service logic can live under `test/services`. However, prioritize clear test names and focused test cases over strict mirroring of the source structure.
- for gherkin-style e2e tests, prefer clear, descriptive scenario names and steps that reflect user interactions or API calls. Avoid overly technical language in test descriptions, and focus on the behavior being tested rather than implementation details.

