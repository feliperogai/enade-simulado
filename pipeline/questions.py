"""Localiza as questões objetivas nos PDFs de prova e calcula as regiões a recortar.

Uma questão vai do seu título até a próxima fronteira na ordem de leitura
(página → coluna → topo para baixo). Fronteiras são os títulos aceitos e as
"paradas" (outros títulos, inícios de seção, instruções). "Cortes" (RASCUNHO,
Área livre) só encerram o trecho da coluna atual; a questão pode continuar na
coluna/página seguinte.
"""

import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Literal, Sequence

import pymupdf

Rect = tuple[float, float, float, float]
HeadingMode = Literal["questao", "number"]

# Aplicado ao texto sem espaços: em 2005 os títulos vêm como "QU EST Ã O 6".
_HEADING = re.compile(r"^QUEST.{0,2}?O(?:[–—-])?(DISCURSIVA)?0?(\d{1,2})(?!\d)", re.IGNORECASE)

_STOP_WORDS = ("FORMAÇÃO GERAL", "COMPONENTE ESPECÍFICO", "QUESTÕES DISCURSIVAS", "QUESTIONÁRIO",
               "AS QUESTÕES DE", "PREZADO", "PREZADA", "ATENÇÃO!", "AVISO:", "A SEGUIR SERÃO APRESENTAD")
# Letra acentuada vira "." no padrão: em fonte sem ToUnicode o acento pode não ser decodificado.
_STOP = re.compile(
    "^(" + "|".join(re.sub(r"[^A-Z !:]", ".", re.escape(w).replace("\\ ", " ")) for w in _STOP_WORDS) + ")",
    re.IGNORECASE,
)
# Texto de apoio comum a várias questões, anexado no início de cada uma delas.
# "Texto para as questões 16 e 17", "Figura para a questão 61",
# "Observe os gráficos a seguir para responder à questão 67".
_SHARED = re.compile(
    r"^(?:TEXTO|FIGURA|OBSERVE|LEIA|CONSIDERE)\b.{0,60}?PARA (?:RESPONDER (?:À|A)S? )?(?:AS? )?"
    r"QUEST(?:ÃO|ÕES) (\d{1,2})(?: (?:E|A) (\d{1,2}))?",
    re.IGNORECASE,
)
# Aplicado ao texto sem espaços (em 2005 o rótulo vem como "RASCUNH O").
_CUT = re.compile(r"^(RASCUNHO|.?REALIVRE)", re.IGNORECASE)
# Título de bloco por ênfase nos cadernos de Engenharia Grupo II (linha inteira).
_SECTION = re.compile(r"^(CONTROLE E AUTOMAÇÃO|ELETRÔNICA|ELETROTÉCNICA|TELECOMUNICAÇÕES)$")
_NUMBER = re.compile(r"^\d{1,2}$")
_OPTION = re.compile(r"^\(?[A-E](\)|\s|\ufffd|$)")

_FURNITURE_BAND = 0.13  # fração da altura no topo e na base
_FURNITURE_MIN_PAGES = 3
_FURNITURE_MIN_SHARE = 0.2  # fração das páginas
_FURNITURE_Y_TOLERANCE = 3.0
_FOOTER_LABEL_MIN_PAGES = 2
_NUMBER_HEADING_MAX_INDENT = 15.0
_NUMBER_HEADING_MIN_SIZE = 10.0
_MAX_PAGES_PER_QUESTION = 3
_MIN_SEGMENT_HEIGHT = 4.0
_TOP_PAD = 2.0
_REPLACEMENT = "\ufffd"
_BODY_MIN_CHARS = 20
_GUTTER_SEARCH = 60
_CUT_MAX_INDENT = 40.0
_CONTENT_PAD = 3.0
_ATTACH_GAP = 4.0
_THIN_LINE = 1.5  # pt
_COLUMN_OVERFLOW = 6.0  # quanto texto da coluna pode passar da divisória
_ATTACH_PASSES = 3
_GARBLED = re.compile("[\ufffd\x00-\x08\x0b-\x1f]")


def _squeeze(text: str) -> str:
    return re.sub(r"\s+", "", text)


@dataclass(frozen=True)
class Segment:
    page: int  # índice 0-based do PyMuPDF
    x0: float
    y0: float
    x1: float
    y1: float
    column: int = 0  # coluna da página em que o trecho está (ordem de leitura)


@dataclass
class Located:
    segments: dict[int, list[Segment]]
    masks: dict[int, list[Rect]] = field(default_factory=dict)
    shared: dict[int, list[Segment]] = field(default_factory=dict)  # texto de apoio a anexar antes
    missing: list[int] = field(default_factory=list)


@dataclass
class _Line:
    page: int
    bbox: Rect
    text: str
    bold: bool
    size: float
    block: int
    option: bool = False  # linha de alternativa ("A ...", "(B) ...")
    column: int = 0
    furniture: bool = False

    @property
    def x0(self) -> float:
        return self.bbox[0]

    @property
    def y0(self) -> float:
        return self.bbox[1]


@dataclass
class _PageLayout:
    width: float
    height: float
    columns: list[tuple[float, float]]  # faixas x de cada coluna
    margins: list[float] = field(default_factory=list)  # menor x0 do texto em cada coluna
    spanning: list[Rect] = field(default_factory=list)  # linhas que cruzam a divisória
    spanning_body: list[Rect] = field(default_factory=list)  # idem, só linhas de corpo
    right_body: list[Rect] = field(default_factory=list)  # linhas de corpo só da coluna direita


# --------------------------------------------------------------------------
# Texto: linhas e decodificação de fontes sem ToUnicode
# --------------------------------------------------------------------------

def _font_key(name: str) -> str:
    return name.split("+", 1)[-1]


def _family_key(name: str) -> str:
    return "family:" + re.sub(r"[-,]?(Bold|Italic|Oblique|Regular)+$", "", _font_key(name), flags=re.IGNORECASE)


def _learn_glyph_map(traces: list[list[dict]]) -> dict[str, dict[int, str]]:
    """gid → caractere por fonte, aprendido dos trechos com Unicode válido.

    Dígitos que nunca aparecem legíveis são extrapolados quando os conhecidos
    seguem gid = base + dígito (caso das provas de 2017).
    """
    glyphs: dict[str, dict[int, str]] = defaultdict(dict)
    for page_traces in traces:
        for span in page_traces:
            key, family = _font_key(span["font"]), _family_key(span["font"])
            for ch in span["chars"]:
                code, gid = ch[0], ch[1]
                if code not in (0xFFFD, 0) and code >= 32:
                    glyphs[key].setdefault(gid, chr(code))
                    glyphs[family].setdefault(gid, chr(code))
    for mapping in glyphs.values():
        digits = {int(c): gid for gid, c in mapping.items() if c.isdigit() and len(c) == 1}
        bases = {gid - d for d, gid in digits.items()}
        if len(digits) >= 2 and len(bases) == 1:
            base = bases.pop()
            for d in range(10):
                mapping.setdefault(base + d, str(d))
    return glyphs


def _decode_line(bbox: Rect, page_traces: list[dict], glyphs: dict[str, dict[int, str]]) -> str:
    chars: list[tuple[float, str]] = []
    x0, y0, x1, y1 = bbox
    for span in page_traces:
        mapping = glyphs.get(_font_key(span["font"]), {})
        family = glyphs.get(_family_key(span["font"]), {})
        for code, gid, _origin, cb in span["chars"]:
            cx, cy = (cb[0] + cb[2]) / 2, (cb[1] + cb[3]) / 2
            if x0 - 1 <= cx <= x1 + 1 and y0 - 1 <= cy <= y1 + 1:
                ch = (chr(code) if code not in (0xFFFD, 0) and code >= 32
                      else mapping.get(gid) or family.get(gid, _REPLACEMENT))
                chars.append((cx, ch))
    return "".join(c for _x, c in sorted(chars))


def _extract(doc: pymupdf.Document) -> tuple[list[_Line], list[_PageLayout], dict[int, list[Rect]]]:
    lines: list[_Line] = []
    masks: dict[int, list[Rect]] = defaultdict(list)
    sizes = [(p.rect.width, p.rect.height) for p in doc]
    traces: list[list[dict]] | None = None
    glyphs: dict[str, dict[int, str]] = {}

    for pno, page in enumerate(doc):
        for bno, block in enumerate(page.get_text("dict")["blocks"]):
            for line in block.get("lines", []):
                spans = line["spans"]
                if not spans:
                    continue
                bbox = tuple(line["bbox"])
                dx, dy = line["dir"]
                if abs(dy) > 0.01 or dx < 0:
                    masks[pno].append(bbox)
                    continue
                text = "".join(s["text"] for s in spans)
                if not text.strip():
                    continue
                garbled = bool(_GARBLED.search(text))
                if garbled:
                    if traces is None:
                        traces = [p.get_texttrace() for p in doc]
                        glyphs = _learn_glyph_map(traces)
                    text = _decode_line(bbox, traces[pno], glyphs) or text
                first = spans[0]
                clean = re.sub(r"\s+", " ", text).strip()
                option = bool(_OPTION.match(clean)) or (
                    len(spans) > 1 and bool(re.fullmatch(r"\(?[A-E]\)?", first["text"].strip())))
                lines.append(_Line(
                    page=pno, bbox=bbox, text=clean,
                    bold=bool(first["flags"] & 16), size=first["size"], block=bno, option=option,
                ))

    layouts = [_layout(w, h, [ln for ln in lines if ln.page == pno])
               for pno, (w, h) in enumerate(sizes)]
    return lines, layouts, masks


# --------------------------------------------------------------------------
# Mobília (cabeçalho/rodapé) e colunas
# --------------------------------------------------------------------------

def _normalize(text: str) -> str:
    # Sequência de dígitos inteira vira um "#": o código "*R0220216*" e o
    # "*R02202113*" (páginas de 1 e de 2 dígitos) são o mesmo cabeçalho.
    return re.sub(r"\s+", " ", re.sub(r"\d+", "#", text)).strip().upper()


def _mark_furniture(lines: list[_Line], sizes: list[tuple[float, float]], number_headings: bool) -> None:
    by_key: dict[str, list[_Line]] = defaultdict(list)
    for ln in lines:
        if (_in_band(ln, sizes) and not (number_headings and _is_number_heading(ln, sizes)) and not ln.option
                and not _HEADING.match(_squeeze(ln.text)) and not _CUT.match(_squeeze(ln.text))):
            by_key[_normalize(ln.text)].append(ln)
    # Cabeçalho/rodapé de verdade se repete na mesma altura em boa parte das
    # páginas; alternativas iguais ("I, apenas.") só coincidem de vez em quando.
    min_pages = max(_FURNITURE_MIN_PAGES, round(_FURNITURE_MIN_SHARE * len(sizes)))
    for group in by_key.values():
        for ln in group:
            pages = {o.page for o in group if abs(o.y0 - ln.y0) <= _FURNITURE_Y_TOLERANCE}
            w, h = sizes[ln.page]
            # Rodapé de ênfase ("LICENCIATURA", "SISTEMAS DE INFORMAÇÃO"): rótulo em
            # maiúsculas, centralizado, que só aparece nas poucas páginas do bloco.
            footer_label = (not any(c.islower() for c in ln.text) and ln.y0 >= h * (1 - _FURNITURE_BAND)
                            and abs((ln.x0 + ln.bbox[2]) / 2 - w / 2) <= 0.15 * w)
            if len(pages) >= (_FOOTER_LABEL_MIN_PAGES if footer_label else min_pages):
                ln.furniture = True

    # Número de página às vezes vem com dígitos trocados ("ϭϯ" em 2014): linhas
    # curtas na mesma posição em boa parte das páginas são mobília pelo lugar.
    short = [ln for ln in lines if len(ln.text) <= 3 and _in_band(ln, sizes)
             and not ln.option and not (number_headings and _is_number_heading(ln, sizes))]
    for ln in short:
        cx = (ln.x0 + ln.bbox[2]) / 2
        pages = {o.page for o in short
                 if abs(o.y0 - ln.y0) <= _FURNITURE_Y_TOLERANCE and abs((o.x0 + o.bbox[2]) / 2 - cx) <= 20}
        if len(pages) >= min_pages:
            ln.furniture = True


def _in_band(ln: _Line, sizes: list[tuple[float, float]]) -> bool:
    h = sizes[ln.page][1]
    return ln.bbox[3] <= h * _FURNITURE_BAND or ln.y0 >= h * (1 - _FURNITURE_BAND)


def _is_number_heading(ln: _Line, sizes: list[tuple[float, float]]) -> bool:
    """Número sozinho na margem esquerda é título (2005/e1), não número de página."""
    return bool(_NUMBER.match(ln.text)) and ln.x0 < sizes[ln.page][0] * 0.2


def _layout(width: float, height: float, page_lines: list[_Line]) -> _PageLayout:
    """Duas colunas quando as linhas de corpo (≥ 20 caracteres) ficam em metades.

    Rótulos curtos de figuras (nós de árvore, eixos) não contam: eles caem nas
    metades mesmo em páginas de coluna única.
    """
    body = [ln for ln in page_lines if len(ln.text) >= _BODY_MIN_CHARS]
    split = _gutter(body, width)
    left = sum(1 for ln in body if ln.bbox[2] <= split + 1)
    right = sum(1 for ln in body if ln.x0 >= split - 1)
    spanning = len(body) - left - right
    two = left >= 3 and right >= 3 and spanning <= 0.25 * max(1, len(body))
    columns = [(0.0, split), (split, width)] if two else [(0.0, width)]
    return _PageLayout(width, height, columns)


def _gutter(body: list[_Line], width: float) -> float:
    """x da divisória entre colunas: o que menos linhas atravessam, perto do meio.

    A divisória nem sempre fica no centro da página (em 2008 a coluna esquerda
    vai além dele).
    """
    mid = width / 2
    best_key, best_x = None, mid
    for x in range(int(mid - _GUTTER_SEARCH), int(mid + _GUTTER_SEARCH) + 1):
        crossing = sum(1 for ln in body if ln.x0 < x - 1 and ln.bbox[2] > x + 1)
        key = (crossing, abs(x - mid))
        if best_key is None or key < best_key:
            best_key, best_x = key, float(x)
    return best_x


def _column_of(x0: float, layout: _PageLayout) -> int:
    if len(layout.columns) == 1:
        return 0
    return 0 if x0 < layout.columns[1][0] - 2 else 1


# --------------------------------------------------------------------------
# Títulos, paradas e regiões
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class _Mark:
    page: int
    column: int
    y: float
    kind: Literal["heading", "stop", "cut", "shared"]
    number: int = 0
    last: int = 0  # "shared": última questão que usa o texto

    @property
    def pos(self) -> tuple[int, int, float]:
        return (self.page, self.column, self.y)


def _heading_candidate(ln: _Line, layout: _PageLayout, mode: HeadingMode) -> tuple[int, bool] | None:
    """(número, discursiva?) se a linha parece título de questão."""
    if mode == "number":
        if not (_NUMBER.match(ln.text) and ln.bold and ln.size >= _NUMBER_HEADING_MIN_SIZE):
            return None
        if ln.x0 - layout.margins[ln.column] > _NUMBER_HEADING_MAX_INDENT:
            return None
        return int(ln.text), False
    squeezed = _squeeze(ln.text)
    m = _HEADING.match(squeezed)
    if not m:
        return None
    return int(m.group(2)), bool(m.group(1)) or "DISCURSIVA" in squeezed.upper()


def _compute_margins(lines: list[_Line], layouts: list[_PageLayout]) -> None:
    for layout in layouts:
        layout.margins = [x0 for x0, _x1 in layout.columns]
    seen: set[tuple[int, int]] = set()
    for ln in lines:
        if ln.furniture:
            continue
        margins = layouts[ln.page].margins
        if (ln.page, ln.column) not in seen:
            seen.add((ln.page, ln.column))
            margins[ln.column] = ln.x0
        else:
            margins[ln.column] = min(margins[ln.column], ln.x0)


def _merged_with_next(lines: list[_Line], i: int) -> _Line | None:
    """Une a linha i com a seguinte do mesmo bloco (títulos partidos em duas linhas)."""
    ln = lines[i]
    if i + 1 < len(lines):
        nxt = lines[i + 1]
        if nxt.page == ln.page and nxt.block == ln.block:
            bbox = (min(ln.x0, nxt.x0), ln.y0, max(ln.bbox[2], nxt.bbox[2]), max(ln.bbox[3], nxt.bbox[3]))
            return _Line(ln.page, bbox, f"{ln.text} {nxt.text}", ln.bold,
                         ln.size, ln.block, ln.column, ln.furniture)
    return None


def _marks(lines: list[_Line], layouts: list[_PageLayout], wanted: set[int],
           mode: HeadingMode) -> list[_Mark]:
    candidates: list[tuple[_Line, int, bool]] = []
    others: list[_Mark] = []
    used_as_tail: set[int] = set()
    for i, ln in enumerate(lines):
        if ln.furniture or i in used_as_tail:
            continue
        cand = _heading_candidate(ln, layouts[ln.page], mode)
        if cand is None and mode == "questao" and re.match(r"^QU", _squeeze(ln.text), re.IGNORECASE):
            merged = _merged_with_next(lines, i)
            if merged is not None:
                cand = _heading_candidate(merged, layouts[ln.page], mode)
                if cand is not None:
                    used_as_tail.add(i + 1)
        if cand is not None:
            candidates.append((ln, *cand))
        elif m := _SHARED.match(ln.text):
            first = int(m.group(1))
            others.append(_Mark(ln.page, ln.column, ln.y0, "shared", first, int(m.group(2) or first)))
        elif _CUT.match(_squeeze(ln.text)):
            others.append(_Mark(ln.page, ln.column, ln.y0, "cut"))
        elif _STOP.match(ln.text) or _SECTION.match(ln.text):
            others.append(_Mark(ln.page, ln.column, ln.y0, "stop"))

    marks = list(others)
    accepted: set[int] = set()
    last = 0
    for ln, number, discursive in sorted(candidates, key=lambda c: (c[0].page, c[0].column, c[0].y0)):
        if not discursive and number in wanted and number not in accepted and number > last:
            accepted.add(number)
            last = number
            marks.append(_Mark(ln.page, ln.column, ln.y0, "heading", number))
        else:
            marks.append(_Mark(ln.page, ln.column, ln.y0, "stop"))
    return sorted(marks, key=lambda m: m.pos)


def _region(start: _Mark, marks: list[_Mark], layouts: list[_PageLayout]) -> list[Segment] | None:
    boundaries = [m for m in marks if m.kind != "cut" and m.pos > start.pos]
    end = boundaries[0].pos if boundaries else None
    cuts = [m for m in marks if m.kind == "cut" and m.pos > start.pos]

    segments: list[Segment] = []
    page, col, y = start.page, start.column, max(0.0, start.y - _TOP_PAD)
    while page < len(layouts) and page - start.page < _MAX_PAGES_PER_QUESTION:
        layout = layouts[page]
        if col >= len(layout.columns):
            page, col, y = page + 1, 0, 0.0
            continue
        bottom = layout.height
        stop_here = False
        if end is not None and end[0] == page and end[1] == col:
            bottom = max(y, end[2] - _TOP_PAD)
            stop_here = True
        for c in cuts:
            if c.page == page and c.column == col and y <= c.y < bottom:
                bottom = c.y - _TOP_PAD
                break
        # Onde o fluxo em colunas começa neste trecho: abaixo da faixa de largura
        # total, se houve uma (senão a coluna seguinte repetiria o conteúdo dela).
        col_start = y
        if bottom - y >= _MIN_SEGMENT_HEIGHT:
            column_segments = _column_segments(layout, page, col, y, bottom)
            segments.extend(column_segments)
            col_start = max([y] + [sg.y1 for sg in column_segments if sg.x1 - sg.x0 >= layout.width - 1])
        if stop_here or end is None and page == len(layouts) - 1 and col == len(layout.columns) - 1:
            return segments
        # Na coluna seguinte da mesma página, começa abaixo do conteúdo de largura
        # total que fica acima do trecho atual (ex.: quadro de instruções de seção).
        col += 1
        y = max((r[3] for r in layout.spanning if r[3] <= col_start + 1), default=0.0)
    return segments if end is None else None


def _column_segments(layout: _PageLayout, page: int, col: int, y0: float, y1: float) -> list[Segment]:
    """Trecho de uma coluna; em página mista, a faixa com linhas que cruzam a
    divisória vira largura total (questão de página inteira acima das colunas)."""
    x0, x1 = layout.columns[col]
    wide = [r for r in layout.spanning_body if r[1] >= y0 - 1 and r[3] <= y1 + 1] if col == 0 else []
    split_y = max((r[3] for r in wide), default=0.0) + _TOP_PAD
    # Só é faixa de largura total se as linhas largas dominarem a faixa; uma
    # fórmula ou tabela larga no meio de uma página de duas colunas não conta.
    right = [r for r in layout.right_body if r[1] >= y0 - 1 and r[3] <= split_y]
    if not wide or len(wide) < len(right):
        return [Segment(page, x0, y0, x1, y1, col)]
    out = [Segment(page, 0.0, y0, layout.width, min(split_y, y1), col)]
    if y1 - split_y >= _MIN_SEGMENT_HEIGHT:
        out.append(Segment(page, x0, split_y, x1, y1, col))
    return out


def _compute_spanning(lines: list[_Line], layouts: list[_PageLayout]) -> None:
    for ln in lines:
        layout = layouts[ln.page]
        if ln.furniture or len(layout.columns) < 2:
            continue
        split = layout.columns[1][0]
        body = len(ln.text) >= _BODY_MIN_CHARS
        if ln.x0 < split - 1 and ln.bbox[2] > split + 1:
            layout.spanning.append(ln.bbox)
            if body:
                layout.spanning_body.append(ln.bbox)
        elif body and ln.x0 >= split - 1:
            layout.right_body.append(ln.bbox)


def _prepare(doc: pymupdf.Document, heading_mode: HeadingMode = "questao"
             ) -> tuple[list[_Line], list[_PageLayout], dict[int, list[Rect]]]:
    lines, layouts, masks = _extract(doc)
    _mark_furniture(lines, [(lay.width, lay.height) for lay in layouts], heading_mode == "number")
    for ln in lines:
        ln.column = _column_of(ln.x0, layouts[ln.page])
        if ln.furniture:
            masks[ln.page].append(ln.bbox)
    _compute_margins(lines, layouts)
    for ln in lines:
        # "RASCUNHO" de caixa lateral ou marca d'água: só some da imagem, não corta.
        if (not ln.furniture and _CUT.match(_squeeze(ln.text))
                and ln.x0 - layouts[ln.page].margins[ln.column] > _CUT_MAX_INDENT):
            ln.furniture = True
            masks[ln.page].append(ln.bbox)
    _compute_spanning(lines, layouts)
    return lines, layouts, masks


def _content_boxes(doc: pymupdf.Document, lines: list[_Line],
                   layouts: list[_PageLayout]) -> dict[int, list[tuple[Rect, bool]]]:
    """Caixas do que é conteúdo em cada página: texto que não é mobília, mais
    imagens e desenhos que não ficam inteiros nas faixas de cabeçalho/rodapé
    (logos, réguas e marcas de registro ficam). O booleano diz se a caixa é
    texto ou imagem; desenhos sozinhos (bordas, réguas) não sustentam um trecho."""
    boxes: dict[int, list[tuple[Rect, bool]]] = defaultdict(list)
    for ln in lines:
        if not ln.furniture:
            boxes[ln.page].append((ln.bbox, True))
    for pno, page in enumerate(doc):
        h = layouts[pno].height
        top, bottom = h * _FURNITURE_BAND, h * (1 - _FURNITURE_BAND)
        rects = [(tuple(info["bbox"]), True) for info in page.get_image_info()]
        rects += [(tuple(d["rect"]), False) for d in page.get_drawings()]
        page_area = layouts[pno].width * h
        for r, strong in rects:
            covers_page = (r[2] - r[0]) * (r[3] - r[1]) >= 0.5 * page_area
            if not (r[3] <= top or r[1] >= bottom or covers_page):
                boxes[pno].append((r, strong))
    return boxes


def _clamp(region: list[Segment], boxes: dict[int, list[tuple[Rect, bool]]]) -> list[Segment]:
    """Encolhe cada segmento até o conteúdo que ele contém; descarta os vazios.

    O primeiro segmento mantém o topo (começa no título); os de continuação
    começam no primeiro conteúdo, sem o cabeçalho da página, e só existem se
    tiverem texto ou imagem.
    """
    out: list[Segment] = []
    for i, s in enumerate(region):
        found = [(b, strong) for b, strong in boxes.get(s.page, [])
                 if s.x0 <= (b[0] + b[2]) / 2 <= s.x1 and b[3] > s.y0 and b[1] < s.y1]
        strong = [b for b, is_strong in found if is_strong]
        if not strong:
            continue
        # Desenhos (figuras vetoriais, tabelas) entram se tocarem o conteúdo;
        # molduras de rascunho e réguas soltas ficam de fora.
        bx0, by0 = min(b[0] for b in strong), min(b[1] for b in strong)
        bx1, by1 = max(b[2] for b in strong), max(b[3] for b in strong)
        # Desenhos ficam presos à coluna (uma régua larga não pode puxar a outra
        # coluna); texto e imagem da coluna podem passar um pouco da divisória.
        # Linhas finas (réguas, bordas de página) não esticam o recorte: uma régua
        # vertical encostada no texto o levaria até o rodapé.
        drawings = [(max(b[0], s.x0), b[1], min(b[2], s.x1), b[3])
                    for b, is_strong in found
                    if not is_strong and min(b[2] - b[0], b[3] - b[1]) > _THIN_LINE]
        for _ in range(_ATTACH_PASSES):
            for b in drawings:
                if (b[0] < bx1 + _ATTACH_GAP and b[2] > bx0 - _ATTACH_GAP
                        and b[1] < by1 + _ATTACH_GAP and b[3] > by0 - _ATTACH_GAP):
                    bx0, by0 = min(bx0, b[0]), min(by0, b[1])
                    bx1, by1 = max(bx1, b[2]), max(by1, b[3])
        x0 = max(s.x0 - _COLUMN_OVERFLOW, bx0 - _CONTENT_PAD, 0.0)
        x1 = min(s.x1 + _COLUMN_OVERFLOW, bx1 + _CONTENT_PAD)
        y0 = s.y0 if i == 0 else max(s.y0, by0 - _CONTENT_PAD)
        y1 = min(s.y1, by1 + _CONTENT_PAD)
        if y1 - y0 >= _MIN_SEGMENT_HEIGHT:
            out.append(Segment(s.page, x0, y0, x1, y1, s.column))
    return out


def locate_questions(doc: pymupdf.Document, wanted: Sequence[int],
                     heading_mode: HeadingMode = "questao") -> Located:
    lines, layouts, masks = _prepare(doc, heading_mode)
    marks = _marks(lines, layouts, set(wanted), heading_mode)
    boxes = _content_boxes(doc, lines, layouts)
    segments: dict[int, list[Segment]] = {}
    shared: dict[int, list[Segment]] = {}
    for mark in marks:
        if mark.kind not in ("heading", "shared"):
            continue
        region = _clamp(_region(mark, marks, layouts) or [], boxes)
        if not region:
            continue
        if mark.kind == "heading":
            segments[mark.number] = region
        else:
            for n in range(mark.number, mark.last + 1):
                shared[n] = region
    missing = [n for n in wanted if n not in segments]
    shared = {n: segs for n, segs in shared.items() if n in segments}
    return Located(segments=segments, masks=dict(masks), missing=missing, shared=shared)
