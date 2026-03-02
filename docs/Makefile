LATEX=pdflatex
FLAGS=-interaction=nonstopmode

.PHONY: all pdf clean

all: pdf

pdf:
	$(LATEX) $(FLAGS) main.tex
	$(LATEX) $(FLAGS) main.tex

clean:
	rm -f *.aux *.log *.out *.toc *.lof *.lot *.fls *.fdb_latexmk *.synctex.gz
