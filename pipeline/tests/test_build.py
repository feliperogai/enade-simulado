from pipeline.build import make_exams_json, validate
from pipeline.catalog import Booklet, Range, Version

BOOKLET = Booklet(
    id="x", year=2099, name="Teste", prova="x.pdf", gabarito="y.pdf",
    versions=(Version("x-1", "Curso X", (Range(1, 2),), (Range(3, 3, gabarito_offset=2),)),),
)


def _exams():
    return make_exams_json(
        [BOOKLET],
        answers={"x": {1: "A", 2: "ANULADA", 5: "C"}},
        sizes={"x": {1: (800, 400), 2: (800, 500), 3: (800, 600)}},
        generated_at="2026-10-13T00:00:00Z",
    )


def test_make_exams_json_offset_e_anulada():
    exams = _exams()
    assert exams["generatedAt"] == "2026-10-13T00:00:00Z"
    (version,) = exams["versions"]
    assert {k: version[k] for k in ("id", "year", "course", "booklet")} == {
        "id": "x-1", "year": 2099, "course": "Curso X", "booklet": "Teste",
    }
    assert version["questions"] == [
        {"n": 1, "section": "FG", "answer": "A", "image": "q/x/1.webp", "width": 800, "height": 400},
        {"n": 2, "section": "FG", "answer": None, "image": "q/x/2.webp", "width": 800, "height": 500},
        {"n": 3, "section": "CE", "answer": "C", "image": "q/x/3.webp", "width": 800, "height": 600},
    ]


def test_validate_dados_corretos():
    assert validate(_exams()) == []


def test_validate_aponta_problemas():
    exams = _exams()
    qs = exams["versions"][0]["questions"]
    qs[0]["height"] = 100
    qs[1]["height"] = 7000
    exams["versions"].append({"id": "vazia", "year": 2099, "course": "C", "booklet": "B", "questions": []})
    errors = validate(exams)
    assert any("x-1" in e and "questão 1" in e for e in errors)
    assert any("x-1" in e and "questão 2" in e for e in errors)
    assert any("vazia" in e for e in errors)
    assert len(errors) == 3
