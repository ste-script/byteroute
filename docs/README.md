# LaTeX project review

This folder contains a LaTeX report for a university-style review of the ByteRoute monorepo.

## Files

- `SPE-report.tex`: main monorepo project review report
- `ASW-report.tex`: additional report template
- `images/`: optional folder for figures
- `Makefile`: helper commands to compile and clean build artifacts

## Prerequisites

Install a LaTeX distribution that provides `pdflatex`.

On Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-fonts-recommended
```

Then build the report with the command below.

## Build

From the repository root:

```bash
cd docs
make pdf
```

## Watch (auto rebuild)

From the repository root:

```bash
pnpm dev:docs
```

This watches `docs/**/*.tex` and re-runs `make pdf` on changes.

## Clean artifacts

```bash
cd docs
make clean
```

## CI and release integration

- Build/test workflow validates LaTeX compilation by running `make pdf` in `docs/`.
- Release workflow builds `docs/SPE-report.pdf` and `docs/ASW-report.pdf` before semantic release.
- GitHub release publishes both PDFs as release assets.

## AI-assisted automatic updates

An optional workflow is available at `.github/workflows/ai-docs-update.yml`.

It can:

- update `docs/SPE-report.tex` and `docs/ASW-report.tex` using an AI model,
- compile them with LaTeX to validate correctness,
- open a pull request with the generated changes.

### Required configuration

- GitHub Actions permission: `models: read` (already set in workflow)
- No extra AI key required for default mode: workflow uses `secrets.GITHUB_TOKEN`
- Optional repository variable: `AI_API_URL` (defaults to `https://models.github.ai/inference/chat/completions`)
- Optional secret for PR pushes: `DEPLOYMENT_TOKEN` (fallback is `GITHUB_TOKEN`)

### How to run

Run the `AI LaTeX Docs Update` workflow from GitHub Actions (`workflow_dispatch`) and optionally set:

- `reports`: comma-separated report files
- `model`: GitHub Models model name (for example `openai/gpt-4.1`)
- `extra_context`: additional instructions for the update

Optional tuning env var for local runs:

- `AI_CONTEXT_CHARS_PER_FILE` (default `2500`) to reduce/increase repository context sent in prompts.

Always review the generated PR before merge.

### Notes about Copilot subscription

GitHub Actions cannot directly "reuse" the interactive Copilot chat session. The supported GitHub-native automation path is GitHub Models with `GITHUB_TOKEN`, which this workflow now uses.
