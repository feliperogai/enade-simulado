from pathlib import Path

import pytest

from pipeline.catalog import BOOKLETS, questions_of
from pipeline.gabarito import parse_gabarito

REPO = Path(__file__).resolve().parents[2]

ALL_VERSIONS = [v for b in BOOKLETS for v in b.versions]


def test_23_versoes_com_ids_unicos():
    assert len(ALL_VERSIONS) == 23
    assert len({v.id for v in ALL_VERSIONS}) == 23
    assert len({b.id for b in BOOKLETS}) == len(BOOKLETS)


def test_ids_esperados():
    assert {v.id for v in ALL_VERSIONS} == {
        "2005-computacao-si", "2005-computacao-cc", "2005-computacao-ec", "2005-engenharia-ec",
        "2008-computacao-cc", "2008-computacao-ec", "2008-computacao-si", "2008-engenharia-ec",
        "2011-lic", "2011-cc", "2011-ec", "2011-si",
        "2014-b", "2014-e", "2014-l",
        "2017-b", "2017-e", "2017-l", "2017-s",
        "2019-e",
        "2021-b", "2021-l", "2021-s",
    }


def test_quantidade_de_questoes():
    for v in ALL_VERSIONS:
        expected = 34 if v.id == "2005-engenharia-ec" else 35
        assert len(questions_of(v)) == expected, v.id


def test_offset_2005_engenharia():
    version = next(v for v in ALL_VERSIONS if v.id == "2005-engenharia-ec")
    qs = questions_of(version)
    for item in [(1, "FG", 1), (7, "FG", 7), (8, "CE", 11), (34, "CE", 37)]:
        assert item in qs


@pytest.mark.parametrize("booklet", BOOKLETS, ids=[b.id for b in BOOKLETS])
def test_toda_questao_tem_gabarito(booklet):
    answers = parse_gabarito(REPO / booklet.gabarito)
    for version in booklet.versions:
        for n, _section, item in questions_of(version):
            assert item in answers, f"{version.id} questão {n} (item {item})"


def test_arquivos_existem():
    for b in BOOKLETS:
        assert (REPO / b.prova).is_file(), b.prova
        assert (REPO / b.gabarito).is_file(), b.gabarito
