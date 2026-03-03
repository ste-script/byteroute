LATEX=pdflatex
FLAGS=-interaction=nonstopmode
REPORTS=SPE-report ASW-report

.PHONY: all pdf clean

all: pdf

pdf:
	for report in $(REPORTS); do \
		$(LATEX) $(FLAGS) $$report.tex; \
		$(LATEX) $(FLAGS) $$report.tex; \
	done

clean:
	rm -f *.aux *.log *.out *.toc *.lof *.lot *.fls *.fdb_latexmk *.synctex.gz *.pdf
