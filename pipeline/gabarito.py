"""Leitura dos PDFs de gabarito do ENADE.

As tabelas são lidas por coordenada (palavras agrupadas em linhas pelo centro
vertical). A extração "por layout" do pdftotext desloca as respostas no
gabarito de 2019, por isso não é usada.
"""

import os
import re

import pymupdf

_NUM = re.compile(r"^\d{1,2}$")
_ANSWER = re.compile(r"^([A-E]|ANULADA)$", re.IGNORECASE)
_DASHES = {"-", "–", "—"}
_ROW_TOLERANCE = 3.0


def _rows(page: pymupdf.Page) -> list[list[str]]:
    rows: list[tuple[float, list[tuple[float, str]]]] = []
    for x0, y0, _x1, y1, text, *_ in page.get_text("words"):
        center = (y0 + y1) / 2
        for row_center, words in rows:
            if abs(row_center - center) <= _ROW_TOLERANCE:
                words.append((x0, text))
                break
        else:
            rows.append((center, [(x0, text)]))
    return [[t for _x, t in sorted(words)] for _c, words in rows]


def parse_gabarito(pdf_path: str | os.PathLike) -> dict[int, str]:
    """Devolve {número da questão: "A".."E" ou "ANULADA"}; discursivas ficam de fora."""
    items: dict[int, str] = {}
    with pymupdf.open(pdf_path) as doc:
        for page in doc:
            for tokens in _rows(page):
                if any("DISCURSIVA" in t.upper() for t in tokens):
                    continue
                tokens = [t for t in tokens if t not in _DASHES]
                if len(tokens) < 2:
                    continue
                number, answer = tokens[-2], tokens[-1]
                if _NUM.match(number) and _ANSWER.match(answer):
                    items[int(number)] = answer.upper()
    return items
