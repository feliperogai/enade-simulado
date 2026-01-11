from pathlib import Path

import pytest

from pipeline.gabarito import parse_gabarito

REPO = Path(__file__).resolve().parents[2]

CASES = [
    # (pdf, total_itens, anuladas, amostras)
    ("2005/b2_gabarito.pdf", 77, [], {1: "D", 2: "E", 24: "A", 83: "B", 84: "A"}),
    ("2005/e2_gabarito.pdf", 51, [], {1: "D", 11: "E", 54: "D"}),
    ("2008/b2_gabarito.pdf", 71, [44], {1: "C", 2: "E", 78: "B"}),
    ("2008/e2_gabarito.pdf", 51, [], {1: "C", 37: "C", 56: "D"}),
    ("2011/2_gabarito.pdf", 50, [13, 44], {1: "D", 50: "A"}),
    ("2014/b2_gabarito.pdf", 35, [], {1: "A", 35: "E"}),
    ("2014/e2_gabarito.pdf", 35, [27, 30, 34], {1: "A", 35: "B"}),
    ("2014/l2_gabarito.pdf", 35, [], {34: "C", 35: "B"}),
    ("2017/b2_gabarito.pdf", 35, [], {1: "C", 35: "E"}),
    ("2017/e2_gabarito.pdf", 35, [], {35: "C"}),
    ("2017/l2_gabarito.pdf", 35, [], {35: "D"}),
    ("2017/s2_gabarito.pdf", 35, [14], {35: "C"}),
    ("2019/e2_gabarito.pdf", 35, [1], {2: "D", 3: "C", 34: "A", 35: "C"}),
    ("2021/b2_gabarito.pdf", 35, [29, 33], {1: "E", 35: "D"}),
    ("2021/l2_gabarito.pdf", 35, [], {35: "E"}),
    ("2021/s2_gabarito.pdf", 35, [33], {35: "D"}),
]


@pytest.mark.parametrize("pdf,total,anuladas,amostras", CASES, ids=[c[0] for c in CASES])
def test_gabarito(pdf, total, anuladas, amostras):
    result = parse_gabarito(REPO / pdf)
    assert len(result) == total
    assert sorted(k for k, v in result.items() if v == "ANULADA") == anuladas
    for n, letra in amostras.items():
        assert result[n] == letra, f"questão {n}"


def test_discursivas_ausentes():
    result = parse_gabarito(REPO / "2008/b2_gabarito.pdf")
    for n in (9, 10, 20, 39):
        assert n not in result
