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

## Clean artifacts

```bash
cd docs
make clean
```

## CI and release integration

- Build/test workflow validates LaTeX compilation by running `make pdf` in `docs/`.
- Release workflow builds `docs/SPE-report.pdf` and `docs/ASW-report.pdf` before semantic release.
- GitHub release publishes both PDFs as release assets.
