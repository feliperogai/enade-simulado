import re
from pathlib import Path

import pymupdf
import pytest

from pipeline.catalog import BOOKLETS, wanted_numbers
from pipeline.questions import locate_questions

REPO = Path(__file__).resolve().parents[2]
BY_ID = {b.id: b for b in BOOKLETS}
BANNED = ("PREZADO", "QUESTIONÁRIO", "RASCUNHO", "ÁREA LIVRE", "QUESTÃO DISCURSIVA")


@pytest.fixture(scope="module")
def located():
    cache = {}

    def get(booklet_id):
        if booklet_id not in cache:
            b = BY_ID[booklet_id]
            doc = pymupdf.open(REPO / b.prova)
            cache[booklet_id] = (doc, locate_questions(doc, wanted_numbers(b), b.heading_mode))
        return cache[booklet_id]

    yield get
    for doc, _ in cache.values():
        doc.close()


IDS = [b.id for b in BOOKLETS]


@pytest.mark.parametrize("booklet_id", IDS)
def test_todas_encontradas(located, booklet_id):
    _doc, loc = located(booklet_id)
    assert loc.missing == []
    for n in wanted_numbers(BY_ID[booklet_id]):
        segs = loc.segments.get(n, [])
        assert segs, f"questão {n} sem segmentos"
        assert any(s.y1 - s.y0 >= 20 for s in segs), f"questão {n} com segmentos minúsculos"


@pytest.mark.parametrize("booklet_id", IDS)
def test_ordem_de_leitura(located, booklet_id):
    doc, loc = located(booklet_id)

    def pos(n):
        # A coluna esquerda sempre começa em x=0; a divisória nem sempre é o meio da página.
        s = loc.segments[n][0]
        return (s.page, 0 if s.x0 == 0 else 1, s.y0)

    positions = [pos(n) for n in wanted_numbers(BY_ID[booklet_id])]
    assert positions == sorted(positions)
    assert len(set(positions)) == len(positions)


@pytest.mark.parametrize(
    "booklet_id,numbers",
    [
        ("2017-b", [4, 5, 14, 15, 24, 25, 34, 35]),
        ("2005-computacao", [1, 2, 4, 5, 6]),
        ("2005-engenharia", [8, 30]),
    ],
)
def test_titulos_partidos(located, booklet_id, numbers):
    _doc, loc = located(booklet_id)
    for n in numbers:
        assert loc.segments.get(n), f"questão {n}"


def _visible_text(doc, loc, s):
    """Texto do segmento fora das máscaras (o que de fato aparece na imagem)."""
    masks = loc.masks.get(s.page, [])

    def masked(w):
        cx, cy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        return any(m[0] <= cx <= m[2] and m[1] <= cy <= m[3] for m in masks)

    words = doc[s.page].get_text("words", clip=(s.x0, s.y0, s.x1, s.y1))
    lines = {}
    for w in words:
        if not masked(w):
            lines.setdefault((w[5], w[6]), []).append(w[4])
    return "\n".join(" ".join(ws) for ws in lines.values())


@pytest.mark.parametrize("booklet_id", IDS)
def test_regions_exclude_non_question_text(located, booklet_id):
    doc, loc = located(booklet_id)
    for n, segs in loc.segments.items():
        for s in segs:
            text = _visible_text(doc, loc, s).upper()
            for banned in BANNED:
                # palavra inteira: "PREZADO" não pode casar com "desprezados"
                assert not re.search(rf"\b{banned}\b", text), f"questão {n} (p{s.page}) contém {banned!r}"


def test_primeiro_segmento_comeca_no_titulo(located):
    doc, loc = located("2021-b")
    s = loc.segments[9][0]
    text = doc[s.page].get_text("text", clip=(s.x0, s.y0, s.x1, s.y1))
    assert re.sub(r"\s+", " ", text).strip().upper().startswith("QUESTÃO 09")
