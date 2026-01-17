"""Cadernos de prova do repositório e as versões (perfis de curso) de cada um.

As faixas são inclusivas e só contêm questões objetivas. O número `n` é o
impresso na prova; `gabarito_offset` converte para o item do gabarito quando
os dois diferem (caderno de Engenharia Grupo II de 2005).
"""

from dataclasses import dataclass
from typing import Literal

Section = Literal["FG", "CE"]


@dataclass(frozen=True)
class Range:
    start: int
    end: int  # inclusivo
    gabarito_offset: int = 0  # item no gabarito = n + offset


@dataclass(frozen=True)
class Version:
    id: str
    course: str
    fg: tuple[Range, ...]
    ce: tuple[Range, ...]


@dataclass(frozen=True)
class Booklet:
    id: str
    year: int
    name: str
    prova: str  # caminho relativo à raiz do repositório
    gabarito: str
    versions: tuple[Version, ...]
    heading_mode: Literal["questao", "number"] = "questao"


CC = "Ciência da Computação (Bacharelado)"
EC = "Engenharia de Computação"
LIC = "Computação (Licenciatura)"
SI = "Sistemas de Informação"
EC_GRUPO_II = "Engenharia de Computação (Engenharia Grupo II)"


def _r(*pairs: tuple[int, int], offset: int = 0) -> tuple[Range, ...]:
    return tuple(Range(a, b, offset) for a, b in pairs)


def _single(year: int, letter: str, course: str) -> Booklet:
    """Caderno de um curso só (2014 em diante): FG 1–8, CE 9–35."""
    booklet_id = f"{year}-{letter}"
    return Booklet(
        id=booklet_id,
        year=year,
        name=course,
        prova=f"{year}/{letter}1_prova.pdf",
        gabarito=f"{year}/{letter}2_gabarito.pdf",
        versions=(Version(booklet_id, course, _r((1, 8)), _r((9, 35))),),
    )


BOOKLETS: tuple[Booklet, ...] = (
    Booklet(
        id="2005-computacao", year=2005, name="Computação",
        prova="2005/b1_prova.pdf", gabarito="2005/b2_gabarito.pdf",
        versions=(
            Version("2005-computacao-si", SI, _r((1, 7)), _r((11, 38))),
            Version("2005-computacao-cc", CC, _r((1, 7)), _r((41, 54), (56, 69))),
            Version("2005-computacao-ec", EC, _r((1, 7)), _r((41, 54), (71, 84))),
        ),
    ),
    Booklet(
        id="2005-engenharia", year=2005, name="Engenharia Grupo II",
        prova="2005/e1_prova.pdf", gabarito="2005/e2_gabarito.pdf",
        versions=(
            Version("2005-engenharia-ec", EC_GRUPO_II, _r((1, 7)), _r((8, 34), offset=3)),
        ),
        heading_mode="number",
    ),
    Booklet(
        id="2008-computacao", year=2008, name="Computação",
        prova="2008/b1_prova.pdf", gabarito="2008/b2_gabarito.pdf",
        versions=(
            Version("2008-computacao-cc", CC, _r((1, 8)), _r((11, 19), (21, 38))),
            Version("2008-computacao-ec", EC, _r((1, 8)), _r((11, 19), (41, 58))),
            Version("2008-computacao-si", SI, _r((1, 8)), _r((11, 19), (61, 78))),
        ),
    ),
    Booklet(
        id="2008-engenharia", year=2008, name="Engenharia Grupo II",
        prova="2008/e1_prova.pdf", gabarito="2008/e2_gabarito.pdf",
        versions=(
            Version("2008-engenharia-ec", EC_GRUPO_II, _r((1, 8)), _r((11, 33), (37, 40))),
        ),
    ),
    Booklet(
        id="2011", year=2011, name="Computação",
        prova="2011/1_prova.pdf", gabarito="2011/2_gabarito.pdf",
        versions=(
            Version("2011-lic", LIC, _r((1, 8)), _r((9, 30), (31, 35))),
            Version("2011-cc", CC, _r((1, 8)), _r((9, 30), (36, 40))),
            Version("2011-ec", EC, _r((1, 8)), _r((9, 30), (41, 45))),
            Version("2011-si", SI, _r((1, 8)), _r((9, 30), (46, 50))),
        ),
    ),
    _single(2014, "b", CC),
    _single(2014, "e", EC),
    _single(2014, "l", LIC),
    _single(2017, "b", CC),
    _single(2017, "e", EC),
    _single(2017, "l", LIC),
    _single(2017, "s", SI),
    _single(2019, "e", EC),
    _single(2021, "b", CC),
    _single(2021, "l", LIC),
    _single(2021, "s", SI),
)


def questions_of(version: Version) -> list[tuple[int, Section, int]]:
    """(n na prova, seção, item no gabarito), ordenado por n."""
    out: list[tuple[int, Section, int]] = []
    for section, ranges in (("FG", version.fg), ("CE", version.ce)):
        for r in ranges:
            out.extend((n, section, n + r.gabarito_offset) for n in range(r.start, r.end + 1))
    return sorted(out)


def wanted_numbers(booklet: Booklet) -> list[int]:
    """União ordenada dos números de questão de todas as versões do caderno."""
    return sorted({n for v in booklet.versions for n, _s, _i in questions_of(v)})
