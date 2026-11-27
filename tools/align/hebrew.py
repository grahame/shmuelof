"""
Turn Sefaria's "Miqra according to the Masorah" HTML into the words a reader
actually speaks, romanised into the character set of the MMS forced aligner.

The romanisation is not meant to be scholarly. It only needs to give the
acoustic model a reasonable idea of what sounds to expect, in order.
"""

import html
import re
import unicodedata

# --- HTML clean-up ----------------------------------------------------------

_KETIV = re.compile(r'<span class="mam-kq-k">.*?</span>', re.S)
_PARASHA = re.compile(r'<span class="mam-spi-[^"]*">.*?</span>', re.S)
_TAG = re.compile(r"<[^>]+>")
_BRACKETS = re.compile(r"[\[\]\(\)\{\}]")


def spoken_hebrew(verse_html: str) -> str:
    """
    Pointed Hebrew for what is read aloud: the qere is kept, the ketiv
    dropped, paragraph markers ({פ} / {ס}), paseq and footnotes removed.
    """
    s = _KETIV.sub(" ", verse_html)
    s = _PARASHA.sub(" ", s)
    s = re.sub(r"<sup.*?</sup>", " ", s, flags=re.S)
    s = re.sub(r"<i [^>]*>.*?</i>", " ", s, flags=re.S)
    s = _TAG.sub("", s)
    s = html.unescape(s)
    s = _BRACKETS.sub("", s)
    s = s.replace("׀", " ")  # paseq
    s = s.replace("׃", " ")  # sof pasuq
    s = s.replace("־", " ")  # maqaf: separate words for alignment
    s = s.replace(" ", " ").replace("\xa0", " ")
    s = s.replace("|", " ")
    return " ".join(s.split())


# --- romanisation -----------------------------------------------------------

CANTILLATION = {chr(c) for c in range(0x0591, 0x05B0)} | {"ֽ", "ֿ", "ׄ", "ׅ"}

SHEVA = "ְ"
HATAF_SEGOL, HATAF_PATAH, HATAF_QAMATS = "ֱ", "ֲ", "ֳ"
HIRIQ, TSERE, SEGOL, PATAH, QAMATS = "ִ", "ֵ", "ֶ", "ַ", "ָ"
HOLAM, HOLAM_HASER_VAV, QUBUTS = "ֹ", "ֺ", "ֻ"
DAGESH, SHIN_DOT, SIN_DOT, QAMATS_QATAN = "ּ", "ׁ", "ׂ", "ׇ"

VOWELS = {
    HATAF_SEGOL: "e",
    HATAF_PATAH: "a",
    HATAF_QAMATS: "o",
    HIRIQ: "i",
    TSERE: "e",
    SEGOL: "e",
    PATAH: "a",
    QAMATS: "a",
    HOLAM: "o",
    HOLAM_HASER_VAV: "o",
    QUBUTS: "u",
    QAMATS_QATAN: "o",
}

FINALS = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}

CONSONANTS = {
    "א": "",
    "ב": ("b", "v"),
    "ג": "g",
    "ד": "d",
    "ה": "h",
    "ו": "v",
    "ז": "z",
    "ח": "h",
    "ט": "t",
    "י": "y",
    "כ": ("k", "kh"),
    "ל": "l",
    "מ": "m",
    "נ": "n",
    "ס": "s",
    "ע": "",
    "פ": ("p", "f"),
    "צ": "ts",
    "ק": "k",
    "ר": "r",
    "ש": None,  # depends on shin / sin dot
    "ת": "t",
}

# The tetragrammaton is read as אֲדֹנָי; when pointed with hiriq (after
# אדני in the text) it is read as אֱלֹהִים.
DIVINE_NAME = re.compile("יהוה$")
PREFIX_LETTERS = set("ובלמכהש")


def _letters(word: str):
    """Split a pointed word into (letter, marks) clusters."""
    clusters = []
    for ch in unicodedata.normalize("NFC", word):
        if ch in CANTILLATION:
            continue
        if "א" <= ch <= "ת":
            clusters.append([ch, ""])
        elif clusters and "ְ" <= ch <= "ׇ":
            clusters[-1][1] += ch
    return clusters


def _romanise_clusters(clusters) -> str:
    out = []
    n = len(clusters)
    for i, (letter, marks) in enumerate(clusters):
        base = FINALS.get(letter, letter)
        last = i == n - 1
        vowel = next((VOWELS[m] for m in marks if m in VOWELS), "")
        nxt = clusters[i + 1] if i + 1 < n else None

        # vav as a vowel letter
        if base == "ו":
            if HOLAM in marks and not vowel.replace("o", ""):
                out.append("o")
                continue
            if DAGESH in marks and not vowel and (i == 0 or not clusters[i - 1][1].strip(DAGESH + SHIN_DOT + SIN_DOT)):
                out.append("u")
                continue

        # yod as a vowel letter (after hiriq / tsere / segol, no own vowel)
        if base == "י" and not vowel and SHEVA not in marks and DAGESH not in marks and i > 0:
            prev_marks = clusters[i - 1][1]
            if any(m in prev_marks for m in (HIRIQ, TSERE, SEGOL)):
                continue

        # silent final he (no mappiq)
        if base == "ה" and last and DAGESH not in marks and not vowel:
            continue

        if base == "ש":
            cons = "s" if SIN_DOT in marks else "sh"
        else:
            c = CONSONANTS.get(base, "")
            if isinstance(c, tuple):
                cons = c[0] if DAGESH in marks else c[1]
            else:
                cons = c

        # patah furtivum: final guttural with patah is pronounced a-h
        if last and vowel == "a" and base in "חעה" and PATAH in marks:
            out.append("a" + cons)
            continue

        if SHEVA in marks:
            # word-initial sheva, or sheva under a doubled letter, is vocal
            vocal = (i == 0 and not last) or (DAGESH in marks and i > 0)
            vowel = "e" if vocal else ""

        # holam on the following vav (וֹ) belongs to this consonant
        if nxt and FINALS.get(nxt[0], nxt[0]) == "ו" and HOLAM in nxt[1] and not vowel:
            vowel = ""

        out.append(cons + vowel)
    return "".join(out)


def romanise_word(word: str) -> str:
    clusters = _letters(word)
    consonants = "".join(FINALS.get(l, l) for l, _ in clusters)
    if DIVINE_NAME.search(consonants):
        k = len(consonants) - 4
        prefix = clusters[:k]
        if all(l in PREFIX_LETTERS for l, _ in prefix):
            name_marks = "".join(m for _, m in clusters[k:])
            name = "elohim" if HIRIQ in name_marks else "adonay"
            pre = _romanise_clusters(prefix) if prefix else ""
            # לַיהוָה -> "ladonay", not "laadonay"
            if pre.endswith("a"):
                name = name[1:] if name.startswith("a") else name
            return pre + name
    return _romanise_clusters(clusters)


ALLOWED = set("abcdefghijklmnopqrstuvwxyz'")


def romanise_verse(spoken: str) -> list[tuple[str, str]]:
    """Return (hebrew_word, romanised) pairs; words that romanise to nothing are dropped."""
    pairs = []
    for w in spoken.split():
        r = "".join(c for c in romanise_word(w) if c in ALLOWED)
        if r:
            pairs.append((w, r))
    return pairs
