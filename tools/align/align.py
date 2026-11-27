#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11,<3.13"
# dependencies = [
#     "torch==2.5.1",
#     "torchaudio==2.5.1",
#     "numpy",
#     "requests",
# ]
# ///
"""
Verse-level alignment of Abraham Shmuelof's recordings against the Sefaria text.

    uv run tools/align/align.py update                 # refresh existing alignments
    uv run tools/align/align.py update genesis-1 psalms-23
    uv run tools/align/align.py update --all           # the whole Tanakh
    uv run tools/align/align.py report                 # QA summary of what's aligned

`update` re-fetches the Sefaria text (the version named in src/textVersion.json)
and only re-aligns a chapter when what is spoken has changed, the audio has
changed, the overrides for that chapter changed, or the pipeline itself changed.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import urllib.parse
from pathlib import Path

import numpy as np
import requests

sys.path.insert(0, str(Path(__file__).parent))
import hebrew  # noqa: E402

# Bump when a change to the pipeline should cause every chapter to be re-aligned.
PIPELINE_VERSION = 1

ROOT = Path(__file__).resolve().parents[2]
URLS = ROOT / "src" / "urls.json"
TEXT_VERSION = ROOT / "src" / "textVersion.json"
OUT_DIR = ROOT / "public" / "alignments"
OVERRIDES = Path(__file__).parent / "overrides.json"
CACHE = Path(__file__).parent / ".cache"

SAMPLE_RATE = 16000
CHUNK_SECONDS = 30
CONTEXT_SECONDS = 2

# QA thresholds
LOW_CONFIDENCE = 0.3  # MMS sometimes emits consonant-only Hebrew, which scores low but aligns fine
MIN_GAP = 0.08


def slug(book: str, chapter: int) -> str:
    """Must match alignmentSlug() in src/Alignment.ts."""
    return f"{book.lower().replace(' ', '_')}-{chapter}"


def chapters():
    return {slug(u["book"], u["chapter"]): u for u in json.loads(URLS.read_text())["urls"]}


def text_version() -> str:
    return json.loads(TEXT_VERSION.read_text())["hebrew"]


def sha(s: bytes | str, n=12) -> str:
    if isinstance(s, str):
        s = s.encode()
    return hashlib.sha256(s).hexdigest()[:n]


# --- inputs -------------------------------------------------------------------


def fetch_text(book: str, chapter: int, version: str) -> list[str]:
    ref = urllib.parse.quote(f"{book} {chapter}")
    vhe = urllib.parse.quote(version.replace(" ", "_"))
    r = requests.get(
        f"https://www.sefaria.org/api/texts/{ref}?vhe={vhe}&context=0&commentary=0",
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    if data.get("heVersionTitle") != version:
        raise RuntimeError(f"Sefaria returned {data.get('heVersionTitle')!r}, wanted {version!r}")
    return data["he"]


def fetch_audio(url: str, key: str, refresh: bool) -> Path:
    path = CACHE / "audio" / f"{key}.mp3"
    if refresh or not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        r = requests.get(url, timeout=120)
        r.raise_for_status()
        path.write_bytes(r.content)
    return path


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


# --- alignment ------------------------------------------------------------------

_model = None


def model():
    global _model
    if _model is None:
        import torch
        import torchaudio

        bundle = torchaudio.pipelines.MMS_FA
        # MPS can't run the feature extractor's wide conv; CUDA works if available.
        device = os.environ.get("ALIGN_DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")
        m = bundle.get_model(with_star=True).to(device).eval()
        _model = (bundle, m, device)
    return _model


def emissions(wav: np.ndarray):
    """Frame-level log-probabilities, computed in overlapping chunks to bound memory."""
    import torch

    bundle, m, device = model()
    chunk = CHUNK_SECONDS * SAMPLE_RATE
    ctx = CONTEXT_SECONDS * SAMPLE_RATE
    parts = []
    with torch.inference_mode():
        for start in range(0, len(wav), chunk):
            lo, hi = max(0, start - ctx), min(len(wav), start + chunk + ctx)
            seg = torch.from_numpy(wav[lo:hi]).unsqueeze(0).to(device)
            em = m(seg)[0][0].cpu()
            per_frame = (hi - lo) / em.shape[0]
            f0 = round((start - lo) / per_frame)
            f1 = round((min(start + chunk, len(wav)) - lo) / per_frame)
            parts.append(em[f0:f1])
    return torch.cat(parts)


def align_words(wav: np.ndarray, words: list[str]):
    """Returns (start, end, score) in seconds for each word."""
    bundle, _, _ = model()
    em = emissions(wav)
    tokenizer = bundle.get_tokenizer()
    aligner = bundle.get_aligner()
    transcript = ["*"] + words + ["*"]
    spans = aligner(em, tokenizer(transcript))[1:-1]
    sec_per_frame = len(wav) / SAMPLE_RATE / em.shape[0]
    return [
        (s[0].start * sec_per_frame, s[-1].end * sec_per_frame, float(np.mean([t.score for t in s])))
        for s in spans
    ]


def quietest(energy: np.ndarray, hop: float, a: float, b: float) -> float:
    """Time of minimum energy within [a, b]."""
    i, j = int(a / hop), max(int(a / hop) + 1, int(b / hop))
    window = energy[i:j]
    if len(window) == 0:
        return (a + b) / 2
    return (i + int(np.argmin(window))) * hop


def frame_energy(wav: np.ndarray, hop=0.01, smooth=5):
    n = int(hop * SAMPLE_RATE)
    frames = wav[: len(wav) // n * n].reshape(-1, n)
    rms = np.sqrt((frames**2).mean(axis=1) + 1e-12)
    return np.convolve(rms, np.ones(smooth) / smooth, mode="same"), hop


def align_chapter(wav: np.ndarray, verses: list[list[tuple[str, str]]]):
    """
    Verses with no text (MAM prints Joshua 21:36-37 as "—", following the
    Aleppo Codex) get a zero-length timing at the boundary where they would be.
    """
    present = [i for i, v in enumerate(verses) if v]
    aligned, duration = _align_present(wav, [verses[i] for i in present])
    out, it = [], iter(aligned)
    for i, v in enumerate(verses):
        if v:
            out.append(dict(next(it), v=i + 1))
        else:
            at = out[-1]["end"] if out else aligned[0]["start"]
            out.append({"v": i + 1, "start": at, "end": at, "conf": None, "gap": None, "absent": True, "words": []})
    return out, duration


def _align_present(wav: np.ndarray, verses: list[list[tuple[str, str]]]):
    words = [r for v in verses for _, r in v]
    timings = align_words(wav, words)
    energy, hop = frame_energy(wav)
    duration = len(wav) / SAMPLE_RATE

    per_verse, k = [], 0
    for v in verses:
        per_verse.append(timings[k : k + len(v)])
        k += len(v)

    out = []
    for i, w in enumerate(per_verse):
        first, last = w[0][0], w[-1][1]
        if i == 0:
            start = quietest(energy, hop, max(0, first - 0.5), first)
        else:
            start = out[-1]["end"]
        if i + 1 < len(per_verse):
            nxt = per_verse[i + 1][0][0]
            gap = nxt - last
            end = quietest(energy, hop, last, nxt) if gap > 0.04 else (last + nxt) / 2
        else:
            gap = None
            end = quietest(energy, hop, last, min(duration, last + 1.0))
        out.append(
            {
                "v": i + 1,
                "start": round(start, 3),
                "end": round(end, 3),
                "conf": round(float(np.mean([s for _, _, s in w])), 3),
                "gap": None if gap is None else round(gap, 3),
                "words": [[round(a, 2), round(b, 2)] for a, b, _ in w],
            }
        )
    return out, duration


def apply_overrides(verses, overrides: dict):
    """Overrides look like {"5": {"start": 47.1}}; a moved boundary moves both neighbours."""
    by_v = {v["v"]: v for v in verses}
    for vnum, fix in overrides.items():
        v = by_v[int(vnum)]
        if "start" in fix:
            v["start"] = fix["start"]
            if int(vnum) - 1 in by_v:
                by_v[int(vnum) - 1]["end"] = fix["start"]
        if "end" in fix:
            v["end"] = fix["end"]
            if int(vnum) + 1 in by_v:
                by_v[int(vnum) + 1]["start"] = fix["end"]
        v["override"] = True


# --- commands -------------------------------------------------------------------


def flags(v):
    f = []
    if v.get("absent"):
        return ["absent-from-text"]
    if v["conf"] < LOW_CONFIDENCE:
        f.append("low-confidence")
    if v["gap"] is not None and v["gap"] < MIN_GAP:
        f.append("no-pause")
    return f


def update(args):
    all_chapters = chapters()
    if args.all:
        keys = list(all_chapters)
    elif args.chapters:
        keys = args.chapters
    else:
        keys = sorted(p.stem for p in OUT_DIR.glob("*.json"))
        if not keys:
            sys.exit("nothing aligned yet: name some chapters (e.g. genesis-1) or pass --all")
    unknown = [k for k in keys if k not in all_chapters]
    if unknown:
        sys.exit(f"unknown chapter(s): {', '.join(unknown)}")

    version = text_version()
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    failures = []
    for n, key in enumerate(keys, 1):
        print(f"[{n}/{len(keys)}] ", end="", flush=True)
        try:
            update_one(key, all_chapters[key], version, overrides, args)
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"{key}: FAILED: {e!r}", flush=True)
            failures.append(key)
    if failures:
        print(f"\n{len(failures)} chapter(s) failed (re-run update to retry): {' '.join(failures)}")
        sys.exit(1)


def update_one(key, u, version, overrides, args):
    html_verses = fetch_text(u["book"], u["chapter"], version)
    verses = [hebrew.romanise_verse(hebrew.spoken_hebrew(h)) for h in html_verses]
    text_hashes = [sha(" ".join(r for _, r in v), 8) for v in verses]
    ov = overrides.get(key, {})
    audio = fetch_audio(u["url"], key, args.refresh_audio)
    audio_hash = sha(audio.read_bytes())

    out_path = OUT_DIR / f"{key}.json"
    if out_path.exists() and not args.force:
        old = json.loads(out_path.read_text())
        if (
            old.get("pipeline") == PIPELINE_VERSION
            and old.get("textVersion") == version
            and old.get("audioSha256") == audio_hash
            and old.get("overridesSha") == sha(json.dumps(ov, sort_keys=True), 8)
            and [v.get("text") for v in old["verses"]] == text_hashes
        ):
            print(f"{key}: up to date", flush=True)
            return
        changed = [
            i + 1
            for i, (a, b) in enumerate(zip([v.get("text") for v in old["verses"]], text_hashes))
            if a != b
        ]
        print(f"{key}: re-aligning (changed verses: {changed or 'n/a'})")
    else:
        print(f"{key}: aligning")

    empty = [i + 1 for i, v in enumerate(verses) if not v]
    if len(empty) == len(verses):
        raise RuntimeError("no spoken text in this chapter")
    if empty:
        print(f"  verses with no text in {version}: {empty}", flush=True)

    wav = decode(audio)
    aligned, duration = align_chapter(wav, verses)
    for v, h in zip(aligned, text_hashes):
        v["text"] = h
    apply_overrides(aligned, ov)

    doc = {
        "pipeline": PIPELINE_VERSION,
        "book": u["book"],
        "chapter": u["chapter"],
        "audio": u["url"],
        "audioSha256": audio_hash,
        "duration": round(duration, 3),
        "textVersion": version,
        "overridesSha": sha(json.dumps(ov, sort_keys=True), 8),
        "verses": aligned,
    }
    out_path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n")
    flagged = [(v["v"], flags(v)) for v in aligned if flags(v)]
    mean = np.mean([v["conf"] for v in aligned if v["conf"] is not None])
    print(f"  {len(aligned)} verses, mean confidence {mean:.2f}, flagged: {flagged or 'none'}", flush=True)


def report(args):
    for p in sorted(OUT_DIR.glob("*.json")):
        doc = json.loads(p.read_text())
        print(f"{p.stem}  ({doc['textVersion']}, pipeline {doc['pipeline']})")
        for v in doc["verses"]:
            gap = "    " if v["gap"] is None else f"{v['gap']:.2f}"
            print(
                f"  {v['v']:>3}  {v['start']:8.2f} – {v['end']:8.2f}"
                f"  conf {v['conf'] or 0:.2f}  gap {gap}  {' '.join(flags(v))}"
            )


def main():
    os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    u = sub.add_parser("update", help="align new chapters and re-align changed ones")
    u.add_argument("chapters", nargs="*", help="chapter keys, e.g. genesis-1 psalms-23 1_samuel-3")
    u.add_argument("--all", action="store_true", help="every chapter in src/urls.json")
    u.add_argument("--force", action="store_true", help="re-align even if up to date")
    u.add_argument("--refresh-audio", action="store_true", help="re-download cached audio")
    u.set_defaults(fn=update)
    r = sub.add_parser("report", help="print verse timings and QA flags")
    r.set_defaults(fn=report)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
