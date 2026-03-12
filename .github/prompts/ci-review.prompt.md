---
name: "CI Review"
description: "Review the current change for CI risk in ByteRoute. Use when checking whether a PR or local diff is likely to fail commitlint, pnpm, backend, dashboard, Go client, Playwright, coverage, Docker, or docs build steps."
argument-hint: "Optional focus, changed area, or diff summary"
agent: "agent"
---

Review the current ByteRoute changes from a CI perspective.

Use these repo facts while reviewing:
- The main CI workflow is defined in [reusable-build-test.yml](../workflows/reusable-build-test.yml).
- The workspace uses root `pnpm` commands helped with turborepo for install, lint, build, test, and coverage.
- CI also validates Go client coverage, the static Docker build for the Go client, dashboard Playwright browser tests, and LaTeX docs compilation.

Focus on finding likely failures, regressions, or missing follow-through, not on rewriting code.

Check for:
- Commit message or commitlint implications when relevant.
- Root workspace command impact: `pnpm install --frozen-lockfile`, `pnpm -w lint`, `pnpm -w build`, and `pnpm -w coverage`.
- Backend-specific risks such as shared package build dependencies, auth or tenant regressions, and domain DSL drift.
- Dashboard-specific risks such as typecheck or build issues, broken browser tests, missing Playwright assumptions, router or auth-store regressions, and responsive/mobile test impact.
- Go client risks such as `libpcap-dev` assumptions, Go 1.26 compatibility, payload contract drift, or breaking parity between native build and [Dockerfile.static](../../apps/client-go/Dockerfile.static).
- Docs or workflow risks such as changes that would break `docs/Makefile` PDF generation or the existing artifact and coverage flow.

Return the review in this format:

1. Findings
- List concrete CI risks in severity order.
- For each finding, include the affected file or workflow area, why it is risky, and what check is likely to fail.

2. Coverage Gaps
- List important cases or verification steps that appear to be missing.

3. Recommended Verification
- List the smallest set of commands or checks that would validate the risky areas.

If you find no likely CI issues, say that explicitly and mention any residual uncertainty.