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
        s = loc.segments[n][0]
        return (s.page, s.column, s.y0)

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


@pytest.mark.parametrize(
    "booklet_id,n",
    # alternativas repetidas ("I, apenas.") perto do rodapé já foram tomadas por mobília
    [("2014-e", 7), ("2014-b", 2), ("2005-computacao", 72), ("2021-l", 7)],
)
def test_cinco_alternativas_visiveis(located, booklet_id, n):
    doc, loc = located(booklet_id)
    letters = set()
    for s in loc.segments[n]:
        for token in _visible_text(doc, loc, s).split():
            m = re.fullmatch(r"\(?([A-E])[).]?", token)
            if m:
                letters.add(m.group(1))
    assert letters == set("ABCDE")


@pytest.mark.parametrize(
    "booklet_id,header,objetivas,anterior",
    [
        ("2005-engenharia", (16, 17), (16, 17), 15),
        ("2008-computacao", (78, 79), (78,), 77),  # a 79 é discursiva
        ("2008-engenharia", (13, 14), (13, 14), 12),
    ],
)
def test_texto_compartilhado(located, booklet_id, header, objetivas, anterior):
    doc, loc = located(booklet_id)
    header = f"TEXTO PARA AS QUESTÕES {header[0]} E {header[1]}"
    for n in objetivas:
        shared = " ".join(_visible_text(doc, loc, s) for s in loc.shared.get(n, [])).upper()
        assert header in re.sub(r"\s+", " ", shared), f"questão {n} sem o texto compartilhado"
    before = " ".join(_visible_text(doc, loc, s) for s in loc.segments[anterior]).upper()
    assert "TEXTO PARA AS QUESTÕES" not in re.sub(r"\s+", " ", before)


def test_continuacao_so_com_decoracao_e_descartada(located):
    # A Q3 de 2005 termina na coluna direita da p1; a régua no topo da p2 não é conteúdo
    # (deixava a imagem com a largura da página e o texto pela metade no celular).
    _doc, loc = located("2005-computacao")
    assert len(loc.segments[3]) == 1


@pytest.mark.parametrize(
    "booklet_id,n,trecho",
    [("2005-computacao", 67, "PARA RESPONDER À QUESTÃO 67"), ("2008-computacao", 61, "FIGURA PARA A QUESTÃO 61")],
)
def test_texto_de_apoio_de_uma_questao(located, booklet_id, n, trecho):
    doc, loc = located(booklet_id)
    shared = " ".join(_visible_text(doc, loc, s) for s in loc.shared.get(n, [])).upper()
    assert trecho in re.sub(r"\s+", " ", shared)
    before = " ".join(_visible_text(doc, loc, s) for s in loc.segments.get(n - 1, [])).upper()
    assert trecho not in re.sub(r"\s+", " ", before)


def test_rascunho_com_letras_espacadas_corta_a_questao(located):
    # Em 2005 o rótulo vem como "RASCUNH O"; a Q54 (p18, coluna direita) acaba nele.
    _doc, loc = located("2005-computacao")
    assert max(s.y1 for s in loc.segments[54]) < 260


def test_caixa_de_rascunho_ao_lado_fica_fora(located):
    # Na Q67 a metade direita da página (x > 320) é só a moldura do rascunho.
    _doc, loc = located("2005-computacao")
    assert max(s.x1 for s in loc.segments[67]) < 320


def test_questao_de_largura_total_em_pagina_mista(located):
    # 2008 p3: a Q6 ocupa a largura toda; abaixo dela a página tem duas colunas (Q7).
    _doc, loc = located("2008-computacao")
    assert max(s.x1 for s in loc.segments[6]) > 500
    assert all(s.x1 <= 290 or s.x0 >= 260 for s in loc.segments[7])  # Q7 segue em colunas


def test_texto_que_passa_da_divisoria_nao_e_cortado(located):
    # 2008 p12: as linhas da coluna esquerda terminam em x≈306, além da divisória (305).
    doc, loc = located("2008-computacao")
    seg = loc.segments[27][0]
    lines = [b for b in doc[seg.page].get_text("dict", clip=(seg.x0, seg.y0, seg.x1, seg.y1))["blocks"]]
    right_edge = max(ln["bbox"][2] for b in lines for ln in b.get("lines", []))
    assert seg.x1 >= right_edge


@pytest.mark.parametrize("booklet_id", IDS)
def test_segmentos_nao_se_sobrepoem(located, booklet_id):
    # Sobreposição repete conteúdo na imagem (já aconteceu em 2008/e1 Q8).
    _doc, loc = located(booklet_id)
    for n, own in loc.segments.items():
        segs = loc.shared.get(n, []) + own
        for i, a in enumerate(segs):
            for b in segs[i + 1:]:
                if a.page != b.page:
                    continue
                overlap_w = min(a.x1, b.x1) - max(a.x0, b.x0)
                overlap_h = min(a.y1, b.y1) - max(a.y0, b.y0)
                # tolerância: as folgas de recorte (2–3 pt de cada lado) podem se tocar
                assert overlap_w <= 6 or overlap_h <= 6, f"questão {n}: {a} × {b}"


def test_titulo_da_proxima_enfase_fica_fora(located):
    # 2008/e1: depois da Q40 (Computação) vem o bloco "CONTROLE E AUTOMAÇÃO".
    doc, loc = located("2008-engenharia")
    text = " ".join(_visible_text(doc, loc, s) for s in loc.segments[40]).upper()
    assert "CONTROLE E AUTOMAÇÃO" not in re.sub(r"\s+", " ", text)


def test_coluna_direita_nao_puxa_texto_da_esquerda(located):
    # 2011 Q37 fica na coluna direita; o recorte não pode avançar sobre a Q36 (esquerda).
    doc, loc = located("2011")
    for s in loc.segments[37]:
        assert s.x0 >= doc[s.page].rect.width / 2 - 12


def test_rodape_de_enfase_e_mascarado(located):
    # 2011: "SISTEMAS DE INFORMAÇÃO" no rodapé só das páginas de SI (poucas páginas).
    doc, loc = located("2011")
    text = " ".join(_visible_text(doc, loc, s) for s in loc.segments[49]).upper()
    assert "SISTEMAS DE INFORMAÇÃO" not in re.sub(r"\s+", " ", text)


@pytest.mark.parametrize("booklet_id,n", [("2014-e", 26), ("2014-e", 11), ("2014-e", 34)])
def test_regua_fina_nao_estica_o_recorte_ate_o_rodape(located, booklet_id, n):
    # Em 2014 o número da página é desenho vetorial no rodapé; uma régua vertical
    # fina encostada no texto puxava o recorte até o fim da página e o incluía.
    _doc, loc = located(booklet_id)
    last = loc.segments[n][-1]
    assert last.y1 < 730  # o número da página de 2014/e1 começa em y=730


def test_area_livre_em_fonte_ilegivel_corta_a_questao(located):
    # 2017-b p5: "Área livre" (só IDs de glifo) em y=458, abaixo da Q2.
    _doc, loc = located("2017-b")
    seg = [s for s in loc.segments[2] if s.page == 5][-1]
    assert seg.y1 < 458


def test_numero_da_pagina_na_margem_nao_e_titulo_fora_do_modo_number(located):
    # Em 2017 o número da página fica na margem esquerda das páginas pares (y=778).
    _doc, loc = located("2017-b")
    for n, segs in loc.segments.items():
        assert all(s.y1 < 770 for s in segs), f"questão {n}"


def test_cabecalho_de_secao_ilegivel_encerra_a_questao(located):
    # 2017-b: "COMPONENTE ESPECÍFICO" no topo da p12 (fonte sem ToUnicode) fecha a Q8.
    _doc, loc = located("2017-b")
    assert {s.page for s in loc.segments[8]} == {11}


def test_codigo_de_barras_com_menos_digitos_e_mobilia(located):
    # 2021: "*R0220216*" (páginas 1–9) e "*R02202113*" têm tamanhos diferentes;
    # a Q1 termina na p4 e não pode levar o código do topo da p5.
    _doc, loc = located("2021-b")
    assert {s.page for s in loc.segments[1]} == {4}


def _rotated_lines(doc, page):
    out = []
    for block in doc[page].get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            dx, dy = line["dir"]
            if abs(dy) > 0.01 or dx < 0:
                out.append((line["bbox"], "".join(s["text"] for s in line["spans"]).strip()))
    return out


def _masked(loc, page, bbox):
    cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    return any(m[0] <= cx <= m[2] and m[1] <= cy <= m[3] for m in loc.masks.get(page, []))


@pytest.mark.parametrize(
    "booklet_id,n",
    # poema concreto com letras giradas (2019) e rótulos girados de gráficos (2017, 2014, 2005)
    [("2019-e", 2), ("2017-b", 1), ("2014-b", 3), ("2005-engenharia", 13)],
)
def test_texto_girado_da_questao_aparece(located, booklet_id, n):
    doc, loc = located(booklet_id)
    for s in loc.segments[n]:
        inside = [(b, t) for b, t in _rotated_lines(doc, s.page)
                  if s.x0 <= (b[0] + b[2]) / 2 <= s.x1 and s.y0 <= (b[1] + b[3]) / 2 <= s.y1]
        apagados = [t for b, t in inside if _masked(loc, s.page, b)]
        assert not apagados, f"questão {n}: texto girado apagado {apagados[:5]}"


def test_marcas_giradas_de_pagina_continuam_mascaradas(located):
    # 2008/e1: "RASCUNHO" na diagonal e o "2008" vertical repetido nas folhas são
    # marcas da página, não conteúdo (a capa, sem questões, fica de fora).
    doc, loc = located("2008-engenharia")
    pages = {s.page for segs in loc.segments.values() for s in segs}
    checked = 0
    for page in sorted(pages):
        for b, t in _rotated_lines(doc, page):
            if t in ("RASCUNHO", "2008"):
                checked += 1
                assert _masked(loc, page, b), f"p{page}: {t!r} não mascarado"
    assert checked > 10


@pytest.mark.parametrize(
    "booklet_id,n,words",
    # números no pé da página que são alternativas/dados, não número de página
    [("2008-computacao", 43, ["0111", "1011"]), ("2008-computacao", 18, ["24", "25"])],
)
def test_numeros_da_questao_no_rodape_aparecem(located, booklet_id, n, words):
    doc, loc = located(booklet_id)
    visible = " ".join(_visible_text(doc, loc, s) for s in loc.segments[n]).split()
    for w in words:
        assert w in visible, f"questão {n}: {w!r} apagado"


def test_seta_continua_em_curva_fica_fora(located):
    # 2008/e1 p24: "Continua" escrito letra a letra numa curva, junto de uma seta,
    # no pé da página. É aviso de "vire a página", não parte da Q40.
    doc, loc = located("2008-engenharia")
    letras = [(b, t) for b, t in _rotated_lines(doc, 24) if b[1] > 740]
    assert "".join(t for _b, t in sorted(letras, key=lambda x: x[0][0])) == "Continua"
    for b, t in letras:
        assert _masked(loc, 24, b), f"{t!r} não mascarado"
    assert max(s.y1 for s in loc.segments[40]) < 745
