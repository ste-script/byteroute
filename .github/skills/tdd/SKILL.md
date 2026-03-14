---
name: tdd
description: "Use when implementing a feature or bugfix with strict test-driven development (TDD): write failing tests first, implement minimal code to pass, then refactor while preserving behavior. Invoke with /tdd."
---

# TDD Skill

Use this workflow whenever you want high-confidence delivery with a Red -> Green -> Refactor cycle.

## Inputs

- Change objective: feature, bugfix, or behavior adjustment.
- Scope constraints: package(s), timeline, and risk tolerance.
- Optional acceptance criteria from product or issue text.

## Workflow

1. Clarify Target Behavior
- Restate expected behavior in testable terms.
- List non-goals and out-of-scope areas.
- Identify affected package(s): backend, dashboard, client-go, shared.

2. Red: Add Failing Tests First
- Add or update tests that describe desired behavior.
- Ensure failures are caused by missing behavior, not broken setup.
- Prefer the smallest test set that captures correctness and edge cases.

3. Green: Implement Minimal Change
- Make the smallest production edit needed for tests to pass.
- Preserve architecture boundaries and existing abstractions.
- Avoid speculative refactors in this step.

4. Verify Green State
- Re-run targeted tests for touched package(s).
- Run minimal type/build checks needed for confidence.

5. Refactor Safely
- Improve readability, naming, duplication, and cohesion.
- Keep behavior identical.
- Re-run impacted tests after each refactor slice.

6. Final Quality Gate
- Summarize evidence that behavior is correct.
- Call out residual risk and missing coverage.

## ByteRoute Command Guide

Pick only commands relevant to touched areas.

- Backend tests: `pnpm -F @byteroute/backend test`
- Backend build: `pnpm -F @byteroute/backend build`
- Dashboard tests: `pnpm -F @byteroute/dashboard test`
- Dashboard typecheck: `pnpm -F @byteroute/dashboard typecheck`
- Dashboard browser tests: `pnpm -F @byteroute/dashboard test:browser`
- Go client tests: `pnpm -F @byteroute/client-go test`
- Go client build: `pnpm -F @byteroute/client-go build`
- Whole workspace confidence pass: `pnpm -w test` and/or `pnpm -w build`

## ByteRoute Guardrails

- Reuse `@byteroute/shared` types/contracts before creating duplicates.
- Backend ingestion/analytics changes may also require `apps/backend/config/domain.dsl.yaml` updates.
- Keep backend route/controller/service/domain boundaries intact.
- Keep dashboard transport concerns in stores/services, not scattered in views.
- Preserve Go native and `apps/client-go/Dockerfile.static` build parity.

## Output Format

Return results with these sections:

1. Test Plan
- What behavior is being asserted.

2. Red Evidence
- Added/updated tests and failing test names.

3. Green Evidence
- Production files changed and why tests now pass.

4. Refactor Notes
- Cleanup completed without behavior changes.

5. Verification
- Commands run and pass/fail summary.

6. Risks
- Remaining gaps or follow-up recommendations.
