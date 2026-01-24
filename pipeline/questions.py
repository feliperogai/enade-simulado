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

_STOP = re.compile(
    r"^(FORMAÇÃO GERAL|COMPONENTE ESPECÍFICO|QUESTÕES DISCURSIVAS|QUESTIONÁRIO"
    r"|AS QUESTÕES DE|PREZAD[OA]|ATENÇÃO!|AVISO:|A SEGUIR SERÃO APRESENTAD)",
    re.IGNORECASE,
)
_CUT = re.compile(r"^(RASCUNHO|.?REA LIVRE)", re.IGNORECASE)
_NUMBER = re.compile(r"^\d{1,2}$")
_OPTION = re.compile(r"^\(?[A-E]\)?$")

_FURNITURE_BAND = 0.13  # fração da altura no topo e na base
_FURNITURE_MIN_PAGES = 3
_FURNITURE_Y_TOLERANCE = 8.0
_NUMBER_HEADING_MAX_INDENT = 15.0
_NUMBER_HEADING_MIN_SIZE = 10.0
_MAX_PAGES_PER_QUESTION = 3
_MIN_SEGMENT_HEIGHT = 4.0
_TOP_PAD = 2.0
_REPLACEMENT = "\ufffd"
_BODY_MIN_CHARS = 20
_GUTTER_SEARCH = 60
_CUT_MAX_INDENT = 40.0
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


@dataclass
class Located:
    segments: dict[int, list[Segment]]
    masks: dict[int, list[Rect]] = field(default_factory=dict)
    missing: list[int] = field(default_factory=list)


@dataclass
class _Line:
    page: int
    bbox: Rect
    text: str
    bold: bool
    size: float
    block: int
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
    spanning_bottoms: list[float] = field(default_factory=list)  # y1 das linhas que cruzam a divisória


# --------------------------------------------------------------------------
# Texto: linhas e decodificação de fontes sem ToUnicode
# --------------------------------------------------------------------------

def _font_key(name: str) -> str:
    return name.split("+", 1)[-1]


def _learn_glyph_map(traces: list[list[dict]]) -> dict[str, dict[int, str]]:
    """gid → caractere por fonte, aprendido dos trechos com Unicode válido.

    Dígitos que nunca aparecem legíveis são extrapolados quando os conhecidos
    seguem gid = base + dígito (caso das provas de 2017).
    """
    glyphs: dict[str, dict[int, str]] = defaultdict(dict)
    for page_traces in traces:
        for span in page_traces:
            key = _font_key(span["font"])
            for ch in span["chars"]:
                code, gid = ch[0], ch[1]
                if code not in (0xFFFD, 0) and code >= 32:
                    glyphs[key].setdefault(gid, chr(code))
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
        for code, gid, _origin, cb in span["chars"]:
            cx, cy = (cb[0] + cb[2]) / 2, (cb[1] + cb[3]) / 2
            if x0 - 1 <= cx <= x1 + 1 and y0 - 1 <= cy <= y1 + 1:
                ch = chr(code) if code not in (0xFFFD, 0) and code >= 32 else mapping.get(gid, _REPLACEMENT)
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
                lines.append(_Line(
                    page=pno, bbox=bbox, text=re.sub(r"\s+", " ", text).strip(),
                    bold=bool(first["flags"] & 16), size=first["size"], block=bno,
                ))

    layouts = [_layout(w, h, [ln for ln in lines if ln.page == pno])
               for pno, (w, h) in enumerate(sizes)]
    return lines, layouts, masks


# --------------------------------------------------------------------------
# Mobília (cabeçalho/rodapé) e colunas
# --------------------------------------------------------------------------

def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"\d", "#", text)).strip().upper()


def _mark_furniture(lines: list[_Line], sizes: list[tuple[float, float]]) -> None:
    by_key: dict[str, list[_Line]] = defaultdict(list)
    for ln in lines:
        w, h = sizes[ln.page]
        in_band = ln.bbox[3] <= h * _FURNITURE_BAND or ln.y0 >= h * (1 - _FURNITURE_BAND)
        # Número sozinho na margem esquerda é título (2005/e1), não número de página.
        number_heading = bool(_NUMBER.match(ln.text)) and ln.x0 < w * 0.2
        option_letter = bool(_OPTION.match(ln.text))  # alternativas perto do rodapé
        if (in_band and not number_heading and not option_letter
                and not _HEADING.match(_squeeze(ln.text)) and not _CUT.match(ln.text)):
            by_key[_normalize(ln.text)].append(ln)
    for group in by_key.values():
        for ln in group:
            pages = {o.page for o in group if abs(o.y0 - ln.y0) <= _FURNITURE_Y_TOLERANCE}
            if len(pages) >= _FURNITURE_MIN_PAGES:
                ln.furniture = True


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
    kind: Literal["heading", "stop", "cut"]
    number: int = 0

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
        elif _CUT.match(ln.text):
            others.append(_Mark(ln.page, ln.column, ln.y0, "cut"))
        elif _STOP.match(ln.text):
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
        x0, x1 = layout.columns[col]
        if bottom - y >= _MIN_SEGMENT_HEIGHT:
            segments.append(Segment(page, x0, y, x1, bottom))
        if stop_here or end is None and page == len(layouts) - 1 and col == len(layout.columns) - 1:
            return segments
        # Na coluna seguinte da mesma página, começa abaixo do conteúdo de largura
        # total que fica acima do trecho atual (ex.: quadro de instruções de seção).
        col_start = y
        col += 1
        y = max((b for b in layout.spanning_bottoms if b <= col_start + 1), default=0.0)
    return segments if end is None else None


def _compute_spanning(lines: list[_Line], layouts: list[_PageLayout]) -> None:
    for ln in lines:
        layout = layouts[ln.page]
        if ln.furniture or len(layout.columns) < 2:
            continue
        split = layout.columns[1][0]
        if ln.x0 < split - 1 and ln.bbox[2] > split + 1:
            layout.spanning_bottoms.append(ln.bbox[3])


def _prepare(doc: pymupdf.Document) -> tuple[list[_Line], list[_PageLayout], dict[int, list[Rect]]]:
    lines, layouts, masks = _extract(doc)
    _mark_furniture(lines, [(lay.width, lay.height) for lay in layouts])
    for ln in lines:
        ln.column = _column_of(ln.x0, layouts[ln.page])
        if ln.furniture:
            masks[ln.page].append(ln.bbox)
    _compute_margins(lines, layouts)
    for ln in lines:
        # "RASCUNHO" de caixa lateral ou marca d'água: só some da imagem, não corta.
        if (not ln.furniture and _CUT.match(ln.text)
                and ln.x0 - layouts[ln.page].margins[ln.column] > _CUT_MAX_INDENT):
            ln.furniture = True
            masks[ln.page].append(ln.bbox)
    _compute_spanning(lines, layouts)
    return lines, layouts, masks


def locate_questions(doc: pymupdf.Document, wanted: Sequence[int],
                     heading_mode: HeadingMode = "questao") -> Located:
    lines, layouts, masks = _prepare(doc)
    marks = _marks(lines, layouts, set(wanted), heading_mode)
    segments: dict[int, list[Segment]] = {}
    for mark in marks:
        if mark.kind != "heading":
            continue
        region = _region(mark, marks, layouts)
        if region:
            segments[mark.number] = region
    missing = [n for n in wanted if n not in segments]
    return Located(segments=segments, masks=dict(masks), missing=missing)
