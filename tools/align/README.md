# Verse alignment

Finds where each verse starts and ends in Shmuelof's recordings, so the app can
jump to a verse, highlight the verse being read, and play or download a passage.

The output is one JSON file per chapter in `public/alignments/`, served with the
site. Chapters without a file work as before, just without verse features.

## Requirements

- [uv](https://docs.astral.sh/uv/) (installs Python 3.12, PyTorch and torchaudio on first run)
- `ffmpeg` on the PATH
- About 1.2 GB of disk for the MMS alignment model (downloaded on first run to
  `~/.cache/torch/hub`)

## Usage

```bash
# align specific chapters (keys are the book in lower case, spaces as _, then the chapter)
uv run tools/align/align.py update genesis-1 psalms-23 1_samuel-3

# re-check every chapter that already has an alignment
uv run tools/align/align.py update

# the whole Tanakh
uv run tools/align/align.py update --all

# timings and QA flags for everything aligned
uv run tools/align/align.py report
```

Each run takes about 10 seconds of CPU time per minute of audio.

## Updating to a newer Sefaria text

The Hebrew text version is pinned in `src/textVersion.json`. The app requests
that exact version from Sefaria, and the aligner uses it too, so the two
always match.

- **Sefaria has updated the same version** (corrections to MAM, say): run
  `uv run tools/align/align.py update`. It re-fetches every aligned chapter,
  compares a hash of the spoken text of each verse with what was aligned,
  and re-aligns only the chapters that changed. Changes that don't alter what
  is read (accents, layout) don't trigger re-alignment.
- **Switching to a different version**: change the title in
  `src/textVersion.json`, then run `update`. Every chapter is re-aligned
  because the version title no longer matches.

After either, commit `public/alignments/` and `src/textVersion.json` together.

As a safety net, the app ignores an alignment whose verse count doesn't match
the text Sefaria returns.

A chapter is also re-aligned when its audio file changes, its entry in
`overrides.json` changes, or `PIPELINE_VERSION` in `align.py` is increased
(do that whenever you change the romanisation or the boundary logic). Use
`--force` to re-align regardless.

## How it works

1. **Text** (`hebrew.py`): take the verse HTML from Sefaria; keep the *qere* and
   drop the *ketiv*; remove paragraph markers, paseq and footnotes; read the
   divine name as *adonay* (or *elohim* when pointed with hiriq). Then romanise
   the pointed text into the aligner's alphabet (`bereshit bara elohim et
   hashamayim veet haarets`).
2. **Acoustic model**: Meta's MMS forced-alignment model (`torchaudio.pipelines.MMS_FA`),
   run over 30-second windows with 2 seconds of overlap. A wildcard token at the
   start and end absorbs the spoken book and chapter announcement.
3. **Alignment**: CTC forced alignment gives start and end times for every word.
4. **Boundaries**: each verse boundary is placed at the quietest 10 ms point
   between the last word of one verse and the first word of the next. Cuts
   therefore fall in the reader's pause, and small timing errors are inaudible.

## Output format

```json
{
  "pipeline": 1, "book": "Genesis", "chapter": 1, "duration": 364.03,
  "audio": "https://…/Genesis%2001.mp3", "audioSha256": "…",
  "textVersion": "Miqra according to the Masorah", "overridesSha": "…",
  "verses": [
    { "v": 1, "start": 8.98, "end": 17.8, "conf": 0.53, "gap": 0.98, "text": "1a2b3c4d",
      "words": [[9.3, 10.1], …] }
  ]
}
```

- `conf` is the model's mean per-character confidence for the verse.
- `gap` is the silence before the next verse.
- `text` is a hash of the spoken text that was aligned.
- `words` holds per-word start and end times (not used by the app yet).

## Quality control and corrections

`update` and `report` flag a verse when:
- `low-confidence`: `conf` is below 0.3. MMS sometimes hears this reader's
  Hebrew as consonants only, which lowers the score even when the alignment is
  right, so anything above 0.3 has so far been correct.
- `no-pause`: there is less than 80 ms between verses, so the cut may be audible.

To fix a boundary by hand, add it to `overrides.json` and run `update`.
Moving a verse's `start` also moves the previous verse's `end`.

```json
{ "genesis-1": { "6": { "start": 54.9 } } }
```
