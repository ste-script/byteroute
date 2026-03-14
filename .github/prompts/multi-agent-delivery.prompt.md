---
name: "Multi-Agent Delivery"
description: "Run a full software-delivery workflow using Coordinator, Design, Red Test, Implementer, Green Test, Refactor, and QA agents with strict handoffs."
argument-hint: "Feature, bug, or change objective"
agent: "agent"
---

Execute this end-to-end workflow to produce a high-quality ByteRoute software artifact.

## Agents

- `Coordinator Agent`
- `Design Agent`
- `Red Test Agent`
- `Implementer Agent`
- `Green Test Agent`
- `Refactor Agent`
- `Quality Assurance Agent`

## Sequence

1. Run `Coordinator Agent` with the user objective.
2. Run `Design Agent` using the coordinator scope and constraints.
3. Run `Red Test Agent` using the design test plan.
4. Run `Implementer Agent` using failing test output.
5. Run `Green Test Agent` to verify pass state.
6. Run `Refactor Agent` while preserving behavior.
7. Run `Quality Assurance Agent` as final gate.
8. Return to `Coordinator Agent` for final summary and merge recommendation.

## Stage Gate Rules

- Do not skip stages.
- If Green Test finds regression, return to Implementer.
- If QA returns `REWORK`, return to the earliest stage that can resolve the finding.
- Require handoff contract completion at each stage.

## Handoff Enforcement

Each agent output must include:

- `Decision Log`
- `Changed Files`
- `Tests`
- `Open Questions`
- `Ready For`

If any field is missing, rerun that stage before continuing.

## ByteRoute-Specific Quality Checks

- Use package-filtered `pnpm` commands for focused validation.
- For backend ingestion or analytics changes, verify `apps/backend/config/domain.dsl.yaml` consistency.
- For dashboard browser-impacting changes, include browser test verification where appropriate.
- For Go client changes, preserve native and `Dockerfile.static` build parity.
- Include docs build checks if change impacts `docs/` sources.
