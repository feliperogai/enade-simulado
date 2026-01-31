"""Renderiza os segmentos de uma questão em uma única imagem WebP."""

from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageOps

from pipeline.questions import Rect, Segment

_INK_THRESHOLD = 245  # luminância abaixo disso conta como conteúdo
_PADDING = 8
_GAP = 16
_MIN_HEIGHT = 20


class EmptyRender(Exception):
    """Nenhum segmento tinha conteúdo visível."""


def _render_segment(doc: pymupdf.Document, seg: Segment, masks: dict[int, list[Rect]],
                    scale: float) -> Image.Image | None:
    page = doc[seg.page]
    clip = pymupdf.Rect(seg.x0, seg.y0, seg.x1, seg.y1) & page.rect
    if clip.is_empty:
        return None
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=clip, alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

    draw = ImageDraw.Draw(img)
    for m in masks.get(seg.page, []):
        r = pymupdf.Rect(m) & clip
        if r.is_empty:
            continue
        draw.rectangle(
            [(r.x0 - clip.x0) * scale - 1, (r.y0 - clip.y0) * scale - 1,
             (r.x1 - clip.x0) * scale + 1, (r.y1 - clip.y0) * scale + 1],
            fill="white",
        )

    ink = ImageOps.invert(img.convert("L")).point(lambda v: 255 if v > 255 - _INK_THRESHOLD else 0)
    box = ink.getbbox()
    if box is None:
        return None
    x0, y0, x1, y1 = box
    cropped = img.crop((max(0, x0 - _PADDING), max(0, y0 - _PADDING),
                        min(img.width, x1 + _PADDING), min(img.height, y1 + _PADDING)))
    return cropped if cropped.height >= _MIN_HEIGHT else None


def render_question(doc: pymupdf.Document, segments: list[Segment], masks: dict[int, list[Rect]],
                    out_path: Path, scale: float = 2.0, quality: int = 80) -> tuple[int, int]:
    """Renderiza, limpa margens, empilha os segmentos e grava WebP. Devolve (largura, altura)."""
    parts = [p for p in (_render_segment(doc, s, masks, scale) for s in segments) if p is not None]
    if not parts:
        raise EmptyRender(str(out_path))
    width = max(p.width for p in parts)
    height = sum(p.height for p in parts) + _GAP * (len(parts) - 1)
    canvas = Image.new("RGB", (width, height), "white")
    y = 0
    for p in parts:
        canvas.paste(p, (0, y))
        y += p.height + _GAP
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path, "WEBP", quality=quality, method=6)
    return width, height
