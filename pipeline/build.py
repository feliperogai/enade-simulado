"""Gera site/public/data/ (exams.json + imagens das questões) a partir dos PDFs.

Uso (na raiz do repositório):
    python -m pipeline.build                 # todos os cadernos
    python -m pipeline.build --only 2017-b   # re-renderiza só esse caderno
"""

import argparse
import html
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

import pymupdf
from PIL import Image

from pipeline.catalog import BOOKLETS, Booklet, questions_of, wanted_numbers
from pipeline.gabarito import parse_gabarito
from pipeline.questions import Segment, locate_questions
from pipeline.render import EmptyRender, render_question

REPO = Path(__file__).resolve().parents[1]
MIN_HEIGHT, MAX_HEIGHT = 120, 6000


def image_path(booklet_id: str, n: int) -> str:
    return f"q/{booklet_id}/{n}.webp"


def make_exams_json(booklets: Sequence[Booklet], answers: dict[str, dict[int, str]],
                    sizes: dict[str, dict[int, tuple[int, int]]], generated_at: str) -> dict:
    versions = []
    for booklet in sorted(booklets, key=lambda b: b.year):
        for version in booklet.versions:
            questions = []
            for n, section, item in questions_of(version):
                answer = answers[booklet.id][item]
                width, height = sizes[booklet.id][n]
                questions.append({
                    "n": n, "section": section, "answer": None if answer == "ANULADA" else answer,
                    "image": image_path(booklet.id, n), "width": width, "height": height,
                })
            versions.append({"id": version.id, "year": booklet.year, "course": version.course,
                             "booklet": booklet.name, "questions": questions})
    return {"generatedAt": generated_at, "versions": versions}


def validate(exams: dict) -> list[str]:
    errors = []
    for version in exams["versions"]:
        if not version["questions"]:
            errors.append(f"{version['id']}: versão sem questões")
        for q in version["questions"]:
            if not MIN_HEIGHT <= q["height"] <= MAX_HEIGHT:
                errors.append(f"{version['id']} questão {q['n']}: altura {q['height']} px "
                              f"fora de {MIN_HEIGHT}–{MAX_HEIGHT}")
    return errors


def _load_overrides(path: Path) -> dict[str, dict[int, list[Segment]]]:
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {
        booklet_id: {int(n): [Segment(s["page"], s["x0"], s["y0"], s["x1"], s["y1"]) for s in segs]
                     for n, segs in by_n.items()}
        for booklet_id, by_n in raw.items()
    }


def _render_booklet(booklet: Booklet, out_dir: Path, overrides: dict[int, list[Segment]]
                    ) -> tuple[dict[int, tuple[int, int]], dict[int, list[Segment]], list[str]]:
    errors: list[str] = []
    sizes: dict[int, tuple[int, int]] = {}
    target = out_dir / "q" / booklet.id
    if target.exists():
        shutil.rmtree(target)
    with pymupdf.open(REPO / booklet.prova) as doc:
        located = locate_questions(doc, wanted_numbers(booklet), booklet.heading_mode)
        segments = {n: located.shared.get(n, []) + segs for n, segs in located.segments.items()}
        segments.update(overrides)  # override substitui tudo, inclusive o texto de apoio
        for n in wanted_numbers(booklet):
            if n not in segments:
                errors.append(f"{booklet.id} questão {n}: não localizada no PDF")
                continue
            try:
                sizes[n] = render_question(doc, segments[n], located.masks,
                                           out_dir / image_path(booklet.id, n))
            except EmptyRender:
                errors.append(f"{booklet.id} questão {n}: recorte vazio")
    return sizes, segments, errors


def _existing_sizes(booklet: Booklet, out_dir: Path) -> tuple[dict[int, tuple[int, int]], list[str]]:
    sizes, errors = {}, []
    for n in wanted_numbers(booklet):
        path = out_dir / image_path(booklet.id, n)
        if not path.exists():
            errors.append(f"{booklet.id} questão {n}: imagem ausente (rode sem --only)")
            continue
        with Image.open(path) as img:
            sizes[n] = img.size
    return sizes, errors


def _write_review(path: Path, out_dir: Path, answers: dict[str, dict[int, str]],
                  segments: dict[str, dict[int, list[Segment]]]) -> None:
    rel = Path(os.path.relpath(out_dir, path.parent)).as_posix()
    parts = ["<!doctype html><meta charset=utf-8><title>Conferência dos recortes</title>",
             "<style>body{font:14px system-ui;margin:24px;background:#f4f4f5}"
             "figure{background:#fff;margin:0 0 24px;padding:12px;border-radius:8px;max-width:900px}"
             "figcaption{margin-bottom:8px;color:#3f3f46}img{max-width:100%;border:1px solid #e4e4e7}"
             "nav a{margin-right:12px}</style>",
             "<nav>" + "".join(f"<a href='#{b.id}'>{b.id}</a>" for b in BOOKLETS) + "</nav>"]
    for b in BOOKLETS:
        parts.append(f"<h2 id='{b.id}'>{html.escape(b.id)} — {html.escape(b.prova)}</h2>")
        offsets = {n: item for v in b.versions for n, _s, item in questions_of(v)}
        for n in wanted_numbers(b):
            ans = answers.get(b.id, {}).get(offsets[n], "?")
            segs = segments.get(b.id, {}).get(n, [])
            seg_text = " · ".join(f"p{s.page} ({s.x0:.0f},{s.y0:.0f})-({s.x1:.0f},{s.y1:.0f})"
                                  for s in segs)
            parts.append(f"<figure><figcaption><b>Questão {n}</b> · gabarito {ans} · {seg_text}"
                         f"</figcaption><img loading=lazy src='{rel}/{image_path(b.id, n)}'></figure>")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(parts), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=REPO / "site/public/data")
    parser.add_argument("--review", type=Path, default=REPO / "pipeline/out/review.html")
    parser.add_argument("--only", action="append", default=[], metavar="CADERNO")
    args = parser.parse_args(argv)

    unknown = set(args.only) - {b.id for b in BOOKLETS}
    if unknown:
        print(f"caderno desconhecido: {', '.join(sorted(unknown))}", file=sys.stderr)
        return 2

    overrides = _load_overrides(REPO / "pipeline/overrides.json")
    errors: list[str] = []
    answers: dict[str, dict[int, str]] = {}
    sizes: dict[str, dict[int, tuple[int, int]]] = {}
    segments: dict[str, dict[int, list[Segment]]] = {}

    for booklet in BOOKLETS:
        answers[booklet.id] = parse_gabarito(REPO / booklet.gabarito)
        for version in booklet.versions:
            for n, _section, item in questions_of(version):
                if item not in answers[booklet.id]:
                    errors.append(f"{version.id} questão {n}: item {item} ausente no gabarito")
        if not args.only or booklet.id in args.only:
            print(f"renderizando {booklet.id}…", flush=True)
            sizes[booklet.id], segments[booklet.id], errs = _render_booklet(
                booklet, args.out, overrides.get(booklet.id, {}))
        else:
            sizes[booklet.id], errs = _existing_sizes(booklet, args.out)
        errors.extend(errs)

    _write_review(args.review, args.out, answers, segments)
    if not errors:
        exams = make_exams_json(BOOKLETS, answers, sizes,
                                datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
        errors = validate(exams)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        print(f"{len(errors)} erro(s); exams.json não foi gravado. Conferência: {args.review}",
              file=sys.stderr)
        return 1

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "exams.json").write_text(json.dumps(exams, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(v["questions"]) for v in exams["versions"])
    print(f"ok: {len(exams['versions'])} versões, {total} questões. Conferência: {args.review}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
