# LaTeX project review

This folder contains a LaTeX report for a university-style review of the ByteRoute monorepo.

## Files

- `main.tex`: main report document
- `images/`: optional folder for figures
- `Makefile`: helper commands to compile and clean build artifacts

## Build

## Prerequisites

Install a LaTeX distribution that provides `pdflatex`.

On Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y texlive-latex-base texlive-latex-recommended texlive-pictures
```

Then build the report with one of the commands below.

## Build

From the repository root:

```bash
cd docs
make pdf
```

Or directly with `pdflatex`:

```bash
cd docs
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
```

## Clean artifacts

```bash
cd docs
make clean
```
