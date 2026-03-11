---
description: "Use when editing the ByteRoute dashboard Vue app, including views, components, stores, composables, services, router, Vite config, or frontend tests. Covers dashboard-specific structure, shared types, API/socket usage, and test expectations."
name: "ByteRoute Dashboard"
applyTo: "apps/dashboard/src/**/*.ts, apps/dashboard/src/**/*.vue, apps/dashboard/vite.config.ts, apps/dashboard/vitest.config.ts"
---

# Dashboard Guidelines

- Keep the existing frontend split: route-level pages in `src/views`, reusable UI in `src/components`, state in `src/stores`, network and socket integration in `src/services`, and cross-component behavior in `src/composables`.
- Reuse types and helpers from `@byteroute/shared` or `@byteroute/shared/common` before creating dashboard-only equivalents. The Vite aliases already point the dashboard at the shared source package during development.
- Preserve the current auth and routing flow. Route protection lives in `src/router/index.ts`, and session hydration goes through the auth store. If a change affects login state or guarded navigation, verify `restoreSession()` and redirect behavior still make sense.
- Keep API and Socket.IO concerns in services or stores rather than scattering them across views. Components should usually consume store state, composables, or service wrappers instead of owning transport logic directly.
- Prefer changes that fit the existing Vue 3 composition-style patterns in stores and services. Extend the current primitives before introducing a new state management or data fetching approach.

## Validation

- Prefer targeted commands such as `pnpm -F @byteroute/dashboard typecheck`, `pnpm -F @byteroute/dashboard test`, `pnpm -F @byteroute/dashboard build`, and `pnpm -F @byteroute/dashboard coverage`.
- Use `pnpm -F @byteroute/dashboard test:browser` or a specific Vitest browser project when the change affects responsive layout, map behavior, router flows, or other browser-only interactions.
- Browser tests depend on Playwright browsers being installed. In a fresh environment, run `pnpm --filter @byteroute/dashboard exec playwright install --with-deps <browser>` first.
- The dashboard lint script is non-fixing by default, so it is safe as a verification step. Use `lint:fix` only when you intend to accept formatter or ESLint edits.

## Working Notes

- The dev server proxies `/api`, `/auth`, and `/socket.io` to the backend on `http://localhost:4000`. Keep that same-origin-friendly flow in mind before hardcoding frontend URLs.
- `VITE_SOCKET_URL` is optional. Prefer behavior that still works when the app uses the current origin and dev proxy defaults.
- Keep singleton-style integrations, such as the socket service and shared query client wiring, consistent with the existing app bootstrap in `src/main.ts` and `src/plugins`.
- When adding tests, put unit-style coverage under `src/test/**/*.test.ts` and browser-only coverage under the existing `*.browser.test.ts` patterns used by the Vitest multi-project setup.